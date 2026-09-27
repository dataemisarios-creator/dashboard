import { exigirSesion, usuarioDeSesion, permisosDe, puedeVer } from './_comun.js';
import { buscarCliente } from './_cuentas.js';

/**
 * Los reportes mensuales salen de Google Drive. El navegador nunca habla con
 * Google: pide acá y esta función es la única que tiene la clave, igual que
 * `windsor.js` con la de Windsor.
 *
 * La cuenta de servicio entra a Drive con permiso de lectura, así que el panel
 * no puede borrar ni mover nada aunque quisiera. Y el archivo se sirve desde
 * esta función, no con un enlace de Drive: así el cliente que descarga su
 * reporte no necesita cuenta de Google ni acceso a la carpeta de la agencia.
 */

const SCOPE = 'https://www.googleapis.com/auth/drive.readonly';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const API = 'https://www.googleapis.com/drive/v3/files';

/* Un reporte se reconoce por el prefijo del nombre del archivo, no por la
   carpeta donde esté: así el equipo puede ordenar por año, por trimestre o
   dejar todo suelto, y el panel lo encuentra igual. */
const MES = /^(\d{4})-(\d{2})\b/;
const PROFUNDIDAD = 3;
const CACHE_MS = 5 * 60 * 1000;

const cache = new Map();
let token = null;

/* ───────────────────────────────────────────────── acceso a Google */

function claveDelEntorno() {
  const pem = process.env.GOOGLE_SA_KEY;
  if (!pem) throw new Error('Falta GOOGLE_SA_KEY en el servidor.');
  /* El JSON de Google trae la clave con «\n» escritos como dos caracteres.
     Según con qué la peguen en Vercel, pueden llegar así o como saltos de
     línea de verdad; las dos formas tienen que funcionar. */
  return pem.replace(/\\n/g, '\n').trim();
}

function derDePem(pem) {
  const cuerpo = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '');
  return Buffer.from(cuerpo, 'base64');
}

const base64url = (buf) => Buffer.from(buf).toString('base64url');

/* Se firma un JWT y se canjea por un token de acceso. Es el flujo de cuenta de
   servicio de Google, hecho con Web Crypto para no sumar dependencias. */
async function pedirToken() {
  if (token && token.vence > Date.now() + 60000) return token.valor;

  const email = process.env.GOOGLE_SA_EMAIL;
  if (!email) throw new Error('Falta GOOGLE_SA_EMAIL en el servidor.');

  const ahora = Math.floor(Date.now() / 1000);
  const cabecera = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const cuerpo = base64url(JSON.stringify({
    iss: email, scope: SCOPE, aud: TOKEN_URL, iat: ahora, exp: ahora + 3600,
  }));

  const llave = await crypto.subtle.importKey(
    'pkcs8', derDePem(claveDelEntorno()),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign'],
  );
  const firma = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5', llave, new TextEncoder().encode(`${cabecera}.${cuerpo}`),
  );
  const jwt = `${cabecera}.${cuerpo}.${base64url(firma)}`;

  const r = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
    signal: AbortSignal.timeout(20000),
  });
  const datos = await r.json().catch(() => ({}));
  if (!r.ok || !datos.access_token)
    throw new Error(`Google rechazó la credencial: ${datos.error_description || datos.error || r.status}`);

  token = { valor: datos.access_token, vence: Date.now() + (datos.expires_in || 3600) * 1000 };
  return token.valor;
}

async function drive(ruta, parametros) {
  const url = new URL(ruta);
  for (const [k, v] of Object.entries(parametros || {})) url.searchParams.set(k, v);
  const r = await fetch(url, {
    headers: { authorization: `Bearer ${await pedirToken()}` },
    signal: AbortSignal.timeout(30000),
  });
  if (!r.ok) {
    const detalle = await r.text().catch(() => '');
    throw new Error(`Drive respondió ${r.status}. ${detalle.slice(0, 200)}`);
  }
  return r;
}

/* ───────────────────────────────────────────────── lectura de carpetas */

async function hijos(carpeta) {
  const salida = [];
  let pagina;
  do {
    const r = await drive(API, {
      q: `'${carpeta}' in parents and trashed = false`,
      fields: 'nextPageToken, files(id, name, mimeType, size, modifiedTime, webViewLink)',
      pageSize: '1000',
      ...(pagina ? { pageToken: pagina } : {}),
    });
    const datos = await r.json();
    salida.push(...(datos.files || []));
    pagina = datos.nextPageToken;
  } while (pagina);
  return salida;
}

/* Un mes puede tener más de un archivo; gana el más reciente, que es lo que
   pasa cuando alguien vuelve a subir el reporte corregido. */
async function mesesDe(carpeta) {
  const guardado = cache.get(carpeta);
  if (guardado && guardado.vence > Date.now()) return guardado.meses;

  const meses = {};
  let nivel = [carpeta];
  for (let hondo = 0; hondo < PROFUNDIDAD && nivel.length; hondo += 1) {
    const siguiente = [];
    for (const id of nivel) {
      for (const f of await hijos(id)) {
        if (f.mimeType === 'application/vnd.google-apps.folder') { siguiente.push(f.id); continue; }
        const marca = MES.exec(f.name);
        if (!marca) continue;
        const clave = `${marca[1]}-${marca[2]}`;
        const previo = meses[clave];
        if (previo && previo.modificado >= f.modifiedTime) continue;
        meses[clave] = {
          id: f.id,
          nombre: f.name,
          tipo: f.mimeType,
          peso: Number(f.size) || null,
          modificado: f.modifiedTime,
        };
      }
    }
    nivel = siguiente;
  }

  cache.set(carpeta, { meses, vence: Date.now() + CACHE_MS });
  return meses;
}

/* ───────────────────────────────────────────────── permisos y entrega */

/* Los reportes son del cliente entero, no de una cuenta: alcanza con que la
   persona tenga alguna cuenta de ese cliente para poder verlos. */
const puedeVerCliente = (permisos, cliente) =>
  permisos === 'todas' || cliente.cuentas.some((c) => puedeVer(permisos, cliente.id, c.id));

export default async function handler(req, res) {
  const sesion = exigirSesion(req, res);
  if (!sesion) return;

  try {
    const cliente = buscarCliente(String(req.query?.cliente || ''));
    if (!cliente) return res.status(404).json({ error: 'Ese cliente no existe.' });
    if (!cliente.drive) return res.status(200).json({ meses: {} });

    const permisos = permisosDe(await usuarioDeSesion(sesion));
    if (!puedeVerCliente(permisos, cliente))
      return res.status(403).json({ error: 'No tenés acceso a los reportes de este cliente.' });

    const meses = await mesesDe(cliente.drive);
    const archivo = String(req.query?.archivo || '');

    if (!archivo) {
      res.setHeader('Cache-Control', 'private, max-age=0, no-store');
      return res.status(200).json({ meses });
    }

    /* Sólo se entrega un archivo que esté en la carpeta de este cliente: con
       el id a secas, cualquiera podría pedir cualquier cosa que la cuenta de
       servicio alcance a leer. */
    const encontrado = Object.values(meses).find((m) => m.id === archivo);
    if (!encontrado) return res.status(404).json({ error: 'Ese reporte ya no está en la carpeta.' });

    const r = await drive(`${API}/${archivo}`, { alt: 'media' });
    res.setHeader('Content-Type', encontrado.tipo || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${encontrado.nombre.replace(/"/g, '')}"`);
    res.setHeader('Cache-Control', 'private, max-age=0, no-store');
    return res.status(200).send(Buffer.from(await r.arrayBuffer()));
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
