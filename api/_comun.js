/**
 * Piezas compartidas por las funciones del servidor.
 *
 * Dos reglas que no se relajan:
 * - La clave de Windsor vive sólo acá. El navegador nunca la ve: pide a
 *   /api/windsor y esta función es la única que habla con connectors.windsor.ai.
 * - Las contraseñas se guardan hasheadas con PBKDF2-SHA256, 210.000 iteraciones,
 *   separador «:» (nunca «$»: los cargadores de .env expanden «$» y rompen el
 *   hash). La cookie de sesión va firmada con HMAC-SHA256.
 */

import { createHmac, pbkdf2Sync, randomBytes, timingSafeEqual, webcrypto } from 'node:crypto';
import { list, put } from '@vercel/blob';

const ITERACIONES = 210000;
const RUTA_BLOB = 'accesos/usuarios.json';
const HORAS_SESION = 12;

export function secreto() {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error('Falta AUTH_SECRET en el servidor.');
  return s;
}

/* ─────────────────────────────────────────────────── contraseñas y sesión */

export function hashear(clave, salt = randomBytes(16).toString('hex')) {
  return `${salt}:${pbkdf2Sync(clave, salt, ITERACIONES, 32, 'sha256').toString('hex')}`;
}

export function claveValida(clave, guardado) {
  if (typeof guardado !== 'string' || !guardado.includes(':')) return false;
  const [salt, esperado] = guardado.split(':');
  const calculado = pbkdf2Sync(clave, salt, ITERACIONES, 32, 'sha256').toString('hex');
  const a = Buffer.from(calculado, 'hex');
  const b = Buffer.from(esperado, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

const firma = (texto) => createHmac('sha256', secreto()).update(texto).digest('base64url');

export function armarCookie(sesion) {
  const cuerpo = Buffer.from(JSON.stringify(sesion)).toString('base64url');
  return `${cuerpo}.${firma(cuerpo)}`;
}

export function leerSesion(req) {
  const crudo = (req.headers.cookie || '')
    .split(';')
    .map((p) => p.trim())
    .find((p) => p.startsWith('sesion='));
  if (!crudo) return null;
  const valor = decodeURIComponent(crudo.slice('sesion='.length));
  const corte = valor.lastIndexOf('.');
  if (corte < 1) return null;
  const cuerpo = valor.slice(0, corte);
  const sello = valor.slice(corte + 1);
  const esperado = firma(cuerpo);
  if (sello.length !== esperado.length) return null;
  if (!timingSafeEqual(Buffer.from(sello), Buffer.from(esperado))) return null;
  try {
    const sesion = JSON.parse(Buffer.from(cuerpo, 'base64url').toString());
    if (!sesion.vence || Date.now() > sesion.vence) return null;
    return sesion;
  } catch {
    return null;
  }
}

export function ponerCookie(res, sesion) {
  const partes = [
    `sesion=${encodeURIComponent(armarCookie(sesion))}`,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
    `Max-Age=${HORAS_SESION * 3600}`,
  ];
  res.setHeader('Set-Cookie', partes.join('; '));
}

export function borrarCookie(res) {
  res.setHeader('Set-Cookie', 'sesion=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');
}

export function nuevaSesion(usuario) {
  return {
    id: usuario.id,
    usuario: usuario.usuario,
    nombre: usuario.nombre,
    rol: usuario.rol,
    vence: Date.now() + HORAS_SESION * 3600 * 1000,
  };
}

/** Puerta de entrada de cada función que necesita sesión. */
export function exigirSesion(req, res) {
  const sesion = leerSesion(req);
  if (!sesion) {
    res.status(401).json({ error: 'Sesión vencida o inexistente.' });
    return null;
  }
  return sesion;
}

/* ──────────────────────────────────────────────────── lista de usuarios */

/* Los usuarios se guardan cifrados con AES-GCM: aunque alguien diera con la URL
   del blob, sin AUTH_SECRET sólo vería bytes. Las contraseñas ya van hasheadas
   antes de llegar acá, así que el cifrado es una segunda capa, no la única. */
async function llaveAes() {
  const digest = await webcrypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`${secreto()}::usuarios`),
  );
  return webcrypto.subtle.importKey('raw', digest, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

async function cifrar(texto) {
  const iv = webcrypto.getRandomValues(new Uint8Array(12));
  const sellado = new Uint8Array(
    await webcrypto.subtle.encrypt({ name: 'AES-GCM', iv }, await llaveAes(), new TextEncoder().encode(texto)),
  );
  const salida = new Uint8Array(iv.length + sellado.length);
  salida.set(iv, 0);
  salida.set(sellado, iv.length);
  return Buffer.from(salida);
}

async function descifrar(bytes) {
  const datos = new Uint8Array(bytes);
  const plano = await webcrypto.subtle.decrypt(
    { name: 'AES-GCM', iv: datos.slice(0, 12) },
    await llaveAes(),
    datos.slice(12),
  );
  return new TextDecoder().decode(plano);
}

function semilla() {
  try {
    const lista = JSON.parse(process.env.DASHBOARD_USERS || '[]');
    return Array.isArray(lista) ? lista : [];
  } catch {
    return [];
  }
}

const hayBlob = () => !!process.env.BLOB_READ_WRITE_TOKEN?.trim();

export async function leerUsuarios() {
  if (!hayBlob()) return semilla();
  try {
    const { blobs } = await list({ prefix: RUTA_BLOB, limit: 1 });
    if (!blobs.length) return semilla();
    const respuesta = await fetch(blobs[0].url, { cache: 'no-store' });
    if (!respuesta.ok) return semilla();
    const texto = await descifrar(Buffer.from(await respuesta.arrayBuffer()));
    const lista = JSON.parse(texto);
    // Una lista vacía sería quedarse sin ningún acceso: se vuelve a la semilla.
    return Array.isArray(lista) && lista.length ? lista : semilla();
  } catch {
    return semilla();
  }
}

export async function guardarUsuarios(lista) {
  if (!hayBlob()) throw new Error('No hay almacenamiento conectado para guardar los accesos.');
  await put(RUTA_BLOB, await cifrar(JSON.stringify(lista)), {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/octet-stream',
    cacheControlMaxAge: 0,
  });
}

/* ────────────────────────────────────────────────────────── permisos */

/* El acceso se da por cuenta y por plataforma: cada usuario guarda una lista de
   claves «cliente-cuenta». El perfil de administrador ve todo lo conectado.
   Los permisos se releen del almacén en cada pedido y no salen de la cookie:
   quitarle una cuenta a alguien tiene efecto sin esperar a que cierre sesión. */
export async function usuarioDeSesion(sesion) {
  const usuarios = await leerUsuarios();
  return usuarios.find((u) => u.id === sesion.id) || null;
}

export function permisosDe(usuario) {
  if (!usuario || usuario.activo === false) return new Set();
  if (usuario.rol === 'Administrador') return 'todas';
  return new Set(Array.isArray(usuario.cuentas) ? usuario.cuentas : []);
}

export const puedeVer = (permisos, cliente, cuenta) =>
  permisos === 'todas' || permisos.has(`${cliente}-${cuenta}`);

/** Lo que se le manda al navegador: nunca el hash. */
export const sinHash = ({ hash, ...resto }) => resto;
