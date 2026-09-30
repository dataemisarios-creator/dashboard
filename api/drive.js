import {
  exigirSesion, usuarioDeSesion, permisosDe, puedeVer,
  puedeAprobar, leerReportes, guardarReportes,
} from './_comun.js';
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
/* Los tipos nativos de Drive. No se descargan: se exportan. */
const NATIVOS = new Set([
  'application/vnd.google-apps.document',
  'application/vnd.google-apps.spreadsheet',
  'application/vnd.google-apps.presentation',
  'application/vnd.google-apps.drawing',
]);
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

/* Todos los archivos de la carpeta del cliente, a cualquier profundidad. Es lo
   que alimenta tanto la detección por nombre como el cuadro para elegir uno a
   mano. Se guarda la subcarpeta de cada archivo para poder distinguir dos que
   se llamen igual. */
async function archivosDe(carpeta, refrescar = false) {
  const guardado = cache.get(carpeta);
  /* La caché evita machacar a Drive mientras alguien mira la pantalla, pero
     tiene que poder saltearse: si acaba de subir un archivo y aprieta
     Actualizar, no puede seguir viendo la lista de hace cinco minutos. */
  if (!refrescar && guardado && guardado.vence > Date.now()) return guardado.archivos;

  const archivos = [];
  let nivel = [{ id: carpeta, ruta: '' }];
  for (let hondo = 0; hondo < PROFUNDIDAD && nivel.length; hondo += 1) {
    const siguiente = [];
    for (const { id, ruta } of nivel) {
      for (const f of await hijos(id)) {
        if (f.mimeType === 'application/vnd.google-apps.folder') {
          siguiente.push({ id: f.id, ruta: ruta ? `${ruta} / ${f.name}` : f.name });
          continue;
        }
        archivos.push({
          id: f.id,
          nombre: f.name,
          tipo: f.mimeType,
          peso: Number(f.size) || null,
          modificado: f.modifiedTime,
          carpeta: ruta,
          /* El enlace a Drive es para quien trabaja el reporte: abre el archivo
             donde vive, con los permisos de su propia cuenta de Google. Si no
             lo tiene, Drive le ofrece pedirlo, que es lo que corresponde. */
          enlace: f.webViewLink || null,
        });
      }
    }
    nivel = siguiente;
  }

  archivos.sort((a, b) => String(b.modificado).localeCompare(String(a.modificado)));
  cache.set(carpeta, { archivos, vence: Date.now() + CACHE_MS });
  return archivos;
}

/* El archivo de cada mes: primero el que alguien eligió a mano, y si no hay,
   el que el nombre delata. La convención de nombres pasa a ser una sugerencia;
   la elección explícita siempre manda.
   Si dos archivos sin asignar apuntan al mismo mes gana el más reciente, que es
   lo que pasa cuando se vuelve a subir el reporte corregido. */
function mesesDe(archivos, asignados = {}) {
  const meses = {};
  for (const f of archivos) {
    const marca = MES.exec(f.nombre);
    if (!marca) continue;
    const clave = `${marca[1]}-${marca[2]}`;
    const previo = meses[clave];
    if (previo && previo.modificado >= f.modificado) continue;
    meses[clave] = { ...f, porNombre: true };
  }
  for (const [mes, id] of Object.entries(asignados)) {
    const elegido = archivos.find((f) => f.id === id);
    /* Si el archivo elegido ya no está en la carpeta, se deja el mes como si
       no tuviera nada: es preferible a ofrecer una descarga que va a fallar. */
    if (elegido) meses[mes] = { ...elegido, porNombre: false };
    else delete meses[mes];
  }
  return meses;
}

/* ───────────────────────────────────────────────── permisos y entrega */

/* Los reportes son del cliente entero, no de una cuenta: alcanza con que la
   persona tenga alguna cuenta de ese cliente para poder verlos. */
const puedeVerCliente = (permisos, cliente) =>
  permisos === 'todas' || cliente.cuentas.some((c) => puedeVer(permisos, cliente.id, c.id));

/* Un enlace de Drive pegado a mano: sirven tanto /file/d/<id>/view como
   /open?id=<id> o el id pelado. Después se comprueba igual que el archivo esté
   en la carpeta de ese cliente, así que pegar cualquier cosa no alcanza. */
function idDeEnlace(texto) {
  const limpio = String(texto || '').trim();
  const m = limpio.match(/\/d\/([\w-]{10,})/) || limpio.match(/[?&]id=([\w-]{10,})/);
  if (m) return m[1];
  return /^[\w-]{10,}$/.test(limpio) ? limpio : '';
}

export default async function handler(req, res) {
  const sesion = exigirSesion(req, res);
  if (!sesion) return;

  try {
    /* Al leer, el cliente viene en la consulta; al escribir, en el cuerpo. */
    const cliente = buscarCliente(String(req.query?.cliente || req.body?.cliente || ''));
    if (!cliente) return res.status(404).json({ error: 'Ese cliente no existe.' });
    if (!cliente.drive)
      return res.status(200).json({ meses: {}, publicados: {}, archivos: [], aprueba: false });

    const usuario = await usuarioDeSesion(sesion);
    const permisos = permisosDe(usuario);
    if (!puedeVerCliente(permisos, cliente))
      return res.status(403).json({ error: 'No tenés acceso a los reportes de este cliente.' });

    /* Elegir el archivo, aprobar y publicar son del administrador y del PM; el
       resto sólo lee. */
    const aprueba = puedeAprobar(usuario);

    if (req.method === 'POST') {
      if (!aprueba)
        return res.status(403).json({ error: 'Sólo un administrador o un PM puede tocar los reportes.' });

      const mes = String(req.body?.mes || '');
      if (!/^\d{4}-\d{2}$/.test(mes))
        return res.status(400).json({ error: 'Falta el mes del reporte.' });

      const guardado = await leerReportes(cliente.id);
      const archivos = await archivosDe(cliente.drive);

      /* Elegir a mano qué archivo es el reporte de ese mes. */
      if (Object.prototype.hasOwnProperty.call(req.body || {}, 'elegir')) {
        const elegido = req.body.elegir === null ? '' : idDeEnlace(req.body.elegir);
        if (!elegido) delete guardado.asignados[mes];
        else {
          if (!archivos.some((f) => f.id === elegido))
            return res.status(404).json({ error: 'Ese archivo no está en la carpeta de este cliente.' });
          guardado.asignados[mes] = elegido;
        }
        /* Cambiar el archivo de un mes ya publicado lo despublica: el cliente
           no puede pasar a descargar algo que nadie revisó. */
        if (guardado.publicados[mes] && guardado.publicados[mes].archivo !== guardado.asignados[mes])
          delete guardado.publicados[mes];
      } else {
        const meses = mesesDe(archivos, guardado.asignados);
        if (req.body?.publicar === false) delete guardado.publicados[mes];
        else {
          if (!meses[mes])
            return res.status(409).json({ error: 'Ese mes todavía no tiene un archivo asignado.' });
          guardado.publicados[mes] = {
            por: usuario.nombre || usuario.usuario,
            cuando: new Date().toISOString(),
            /* Se guarda de qué archivo se trataba: si después alguien lo
               cambia, se nota que lo aprobado no es lo que está publicado. */
            archivo: meses[mes].id,
          };
        }
      }

      await guardarReportes(cliente.id, guardado);
      return res.status(200).json({
        meses: mesesDe(archivos, guardado.asignados),
        publicados: guardado.publicados,
        aprueba,
      });
    }

    const guardado = await leerReportes(cliente.id);
    const archivos = await archivosDe(cliente.drive, req.query?.refrescar === '1');
    const meses = mesesDe(archivos, guardado.asignados);
    const publicados = guardado.publicados;
    const archivo = String(req.query?.archivo || '');

    if (!archivo) {
      res.setHeader('Cache-Control', 'private, max-age=0, no-store');
      /* La lista completa de la carpeta sólo la ve quien puede elegir: al
         cliente no le sirve y le mostraría archivos que no son su reporte. */
      return res.status(200).json({ meses, publicados, aprueba, archivos: aprueba ? archivos : [] });
    }

    /* Sólo se entrega un archivo que sea el reporte de algún mes de este
       cliente: con el id a secas, cualquiera podría pedir cualquier cosa que la
       cuenta de servicio alcance a leer. */
    const mes = Object.keys(meses).find((k) => meses[k].id === archivo);
    if (!mes) return res.status(404).json({ error: 'Ese reporte ya no está en la carpeta.' });

    /* El cliente descarga el reporte ya publicado, nunca un borrador. Quien lo
       aprueba trabaja sobre el archivo en Drive, no sobre esta descarga. */
    if (!aprueba && !publicados[mes])
      return res.status(403).json({ error: 'Ese reporte todavía no está publicado.' });

    const encontrado = meses[mes];

    /* Un documento, una hoja o una presentación nativos de Google no tienen
       bytes que descargar: hay que exportarlos. Se entregan en PDF, que es lo
       que un cliente espera recibir como reporte. */
    const nativo = NATIVOS.has(encontrado.tipo);
    const r = nativo
      ? await drive(`${API}/${archivo}/export`, { mimeType: 'application/pdf' })
      : await drive(`${API}/${archivo}`, { alt: 'media' });
    const nombre = nativo && !/\.pdf$/i.test(encontrado.nombre)
      ? `${encontrado.nombre}.pdf` : encontrado.nombre;
    res.setHeader('Content-Type', nativo ? 'application/pdf' : (encontrado.tipo || 'application/octet-stream'));
    res.setHeader('Content-Disposition', `attachment; filename="${nombre.replace(/"/g, '')}"`);
    res.setHeader('Cache-Control', 'private, max-age=0, no-store');
    return res.status(200).send(Buffer.from(await r.arrayBuffer()));
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
