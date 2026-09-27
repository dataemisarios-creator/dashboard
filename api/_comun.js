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
import { del, list, put } from '@vercel/blob';

const ITERACIONES = 210000;
/* Cada versión de la lista se guarda con su propia marca de tiempo en el
   nombre. Escribir siempre en la misma dirección parecía más prolijo, pero la
   CDN servía la copia anterior y un usuario recién creado tardaba en aparecer,
   distinto en cada servidor. Con un nombre nuevo por versión no hay caché que
   valga: se lista por prefijo, se lee la más reciente y se borran las viejas. */
const PREFIJO_BLOB = 'accesos/usuarios-';
/* La primera versión guardaba todo en esta única dirección. Se sigue leyendo
   para no perder los usuarios que se crearon antes del cambio. */
const RUTA_VIEJA = 'accesos/usuarios.json';
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

async function versiones() {
  const { blobs } = await list({ prefix: PREFIJO_BLOB });
  return blobs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
}

async function leerBlob(url) {
  const respuesta = await fetch(url, { cache: 'no-store' });
  if (!respuesta.ok) return null;
  const lista = JSON.parse(await descifrar(Buffer.from(await respuesta.arrayBuffer())));
  return Array.isArray(lista) && lista.length ? lista : null;
}

export async function leerUsuarios() {
  if (!hayBlob()) return semilla();
  try {
    const guardadas = await versiones();
    let lista = guardadas.length ? await leerBlob(guardadas[0].url) : null;

    /* Rescate de la versión anterior del almacén: mientras exista, se fusiona
       con la lista actual y después se borra. Es una sola pasada; cuando ya no
       quede el blob viejo, esta rama no vuelve a entrar. */
    const { blobs: viejos } = await list({ prefix: RUTA_VIEJA, limit: 1 });
    if (viejos.length) {
      const previa = (await leerBlob(viejos[0].url)) || [];
      const conocidos = new Set((lista || []).map((u) => String(u.usuario).toLowerCase()));
      const rescatados = previa.filter((u) => !conocidos.has(String(u.usuario).toLowerCase()));
      if (rescatados.length || !lista) lista = [...(lista || []), ...rescatados];
      if (lista.length) await guardarUsuarios(lista).catch(() => {});
      await del(viejos[0].url).catch(() => {});
    }

    return lista && lista.length ? lista : semilla();
  } catch {
    return semilla();
  }
}

export async function guardarUsuarios(lista) {
  if (!hayBlob()) throw new Error('No hay almacenamiento conectado para guardar los accesos.');
  const viejas = await versiones();
  await put(`${PREFIJO_BLOB}${Date.now()}.json`, await cifrar(JSON.stringify(lista)), {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/octet-stream',
    cacheControlMaxAge: 0,
  });
  /* Se conserva la anterior por si hiciera falta volver atrás a mano; del resto
     no queda nada. Si la limpieza falla no se rompe el guardado. */
  const aBorrar = viejas.slice(1).map((b) => b.url);
  if (aBorrar.length) await del(aBorrar).catch(() => {});
}

/* ──────────────────────────────────────────────── vistas guardadas */

/* Las vistas son configuración de pantalla, no datos del negocio, pero viven
   del lado del servidor para que sigan a la persona y no a la computadora.
   Van en un archivo por usuario y no dentro de la lista de usuarios: si dos
   personas guardaran una vista a la vez sobre el mismo archivo, una pisaría
   los permisos de la otra. */
const PREFIJO_VISTAS = 'vistas/';
const VACIO = { vistas: [], ultima: {} };

async function versionesDeVistas(usuarioId) {
  const { blobs } = await list({ prefix: `${PREFIJO_VISTAS}${usuarioId}-` });
  return blobs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
}

export async function leerVistas(usuarioId) {
  if (!hayBlob()) return { ...VACIO };
  try {
    /* El listado del almacén puede quedar un instante atrás de la última
       escritura, así que si la versión más nueva ya no está se prueba con la
       anterior antes de dar la lista por vacía. */
    for (const blob of (await versionesDeVistas(usuarioId)).slice(0, 2)) {
      const respuesta = await fetch(blob.url, { cache: 'no-store' });
      if (!respuesta.ok) continue;
      const datos = JSON.parse(await descifrar(Buffer.from(await respuesta.arrayBuffer())));
      return {
        vistas: Array.isArray(datos?.vistas) ? datos.vistas : [],
        ultima: datos?.ultima && typeof datos.ultima === 'object' ? datos.ultima : {},
      };
    }
    return { ...VACIO };
  } catch {
    return { ...VACIO };
  }
}

export async function guardarVistas(usuarioId, datos) {
  if (!hayBlob()) throw new Error('No hay almacenamiento conectado para guardar las vistas.');
  const viejas = await versionesDeVistas(usuarioId);
  await put(`${PREFIJO_VISTAS}${usuarioId}-${Date.now()}.json`, await cifrar(JSON.stringify(datos)), {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/octet-stream',
    cacheControlMaxAge: 0,
  });
  const aBorrar = viejas.slice(1).map((b) => b.url);
  if (aBorrar.length) await del(aBorrar).catch(() => {});
}

/* ──────────────────────────────────────── reportes publicados */

/* Qué reporte mensual está aprobado no vive en Drive sino acá, y por dos
   razones. Una: la cuenta de servicio entra a Drive con permiso de lectura, así
   que el panel no puede mover ni marcar nada del otro lado. Dos: hace falta
   saber quién aprobó y cuándo, y una carpeta no guarda eso.
   Se archiva un blob por cliente: aprobar el reporte de uno no puede pisar el
   del otro. */
const PREFIJO_REPORTES = 'reportes/';

async function versionesDeReportes(cliente) {
  const { blobs } = await list({ prefix: `${PREFIJO_REPORTES}${cliente}-` });
  return blobs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
}

export async function leerPublicados(cliente) {
  if (!hayBlob()) return {};
  try {
    for (const blob of (await versionesDeReportes(cliente)).slice(0, 2)) {
      const respuesta = await fetch(blob.url, { cache: 'no-store' });
      if (!respuesta.ok) continue;
      const datos = JSON.parse(await descifrar(Buffer.from(await respuesta.arrayBuffer())));
      return datos && typeof datos === 'object' ? datos : {};
    }
    return {};
  } catch {
    return {};
  }
}

export async function guardarPublicados(cliente, datos) {
  if (!hayBlob()) throw new Error('No hay almacenamiento conectado para guardar las aprobaciones.');
  const viejas = await versionesDeReportes(cliente);
  await put(`${PREFIJO_REPORTES}${cliente}-${Date.now()}.json`, await cifrar(JSON.stringify(datos)), {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/octet-stream',
    cacheControlMaxAge: 0,
  });
  const aBorrar = viejas.slice(1).map((b) => b.url);
  if (aBorrar.length) await del(aBorrar).catch(() => {});
}

/* ────────────────────────────────────────────────────────── permisos */

/* El acceso se da por cuenta y por plataforma: cada usuario guarda una lista de
   claves «cliente-cuenta». Los permisos se releen del almacén en cada pedido y
   no salen de la cookie: quitarle una cuenta a alguien tiene efecto sin esperar
   a que cierre sesión. */
export async function usuarioDeSesion(sesion) {
  const usuarios = await leerUsuarios();
  return usuarios.find((u) => u.id === sesion.id) || null;
}

/* El Project Manager ve lo mismo que el administrador. La diferencia está en
   otro lado: no puede dar ni quitar accesos, y eso lo decide `usuarios.js`. */
const VEN_TODO = new Set(['Administrador', 'PM']);

/* Administrador y PM son los dos que miran la agencia entera: dan por bueno el
   reporte del mes y controlan las tareas del equipo. El especialista trabaja el
   reporte pero no lo aprueba, y no ve la carga de los demás. */
export const esGestor = (usuario) =>
  !!usuario && usuario.activo !== false && VEN_TODO.has(usuario.rol);
export const puedeAprobar = esGestor;

export function permisosDe(usuario) {
  if (!usuario || usuario.activo === false) return new Set();
  if (VEN_TODO.has(usuario.rol)) return 'todas';
  return new Set(Array.isArray(usuario.cuentas) ? usuario.cuentas : []);
}

export const puedeVer = (permisos, cliente, cuenta) =>
  permisos === 'todas' || permisos.has(`${cliente}-${cuenta}`);

/* ──────────────────────────────────────────── recuperar contraseña */

/* El testigo lleva el id, el vencimiento y un pedazo del hash actual. Eso lo
   vuelve de un solo uso sin guardar nada: apenas la contraseña cambia, el hash
   cambia y la firma del enlace deja de validar. */
const HORAS_TESTIGO = 1;

export function testigoDeRecuperacion(usuario) {
  const cuerpo = Buffer.from(JSON.stringify({
    id: usuario.id,
    vence: Date.now() + HORAS_TESTIGO * 3600 * 1000,
    sello: String(usuario.hash).slice(-12),
  })).toString('base64url');
  return `${cuerpo}.${createHmac('sha256', secreto()).update(`recuperar:${cuerpo}`).digest('base64url')}`;
}

export async function usuarioDelTestigo(testigo) {
  const corte = String(testigo || '').lastIndexOf('.');
  if (corte < 1) return null;
  const cuerpo = testigo.slice(0, corte);
  const firma = testigo.slice(corte + 1);
  const esperada = createHmac('sha256', secreto()).update(`recuperar:${cuerpo}`).digest('base64url');
  if (firma.length !== esperada.length) return null;
  if (!timingSafeEqual(Buffer.from(firma), Buffer.from(esperada))) return null;
  try {
    const datos = JSON.parse(Buffer.from(cuerpo, 'base64url').toString());
    if (Date.now() > datos.vence) return null;
    const usuario = (await leerUsuarios()).find((u) => u.id === datos.id);
    if (!usuario || String(usuario.hash).slice(-12) !== datos.sello) return null;
    return usuario;
  } catch {
    return null;
  }
}

/** Si no hay proveedor de correo configurado, se dice; no se finge un envío. */
export const puedeEnviarCorreo = () =>
  !!process.env.RESEND_API_KEY?.trim() && !!process.env.CORREO_REMITENTE?.trim();

export async function enviarCorreo({ para, asunto, html }) {
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ from: process.env.CORREO_REMITENTE, to: [para], subject: asunto, html }),
  });
  if (!r.ok) throw new Error(`El proveedor de correo respondió ${r.status}.`);
}

/** Lo que se le manda al navegador: nunca el hash. */
export const sinHash = ({ hash, ...resto }) => resto;
