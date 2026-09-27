import { exigirSesion, usuarioDeSesion, esGestor } from './_comun.js';

/**
 * Las tareas del equipo salen de Trello. El navegador no habla con Trello: la
 * clave y el testigo viven acá, igual que los de Windsor y los de Drive.
 *
 * El testigo se generó con alcance de sólo lectura, así que el panel puede ver
 * todo y no puede mover, cerrar ni borrar una tarjeta ni por un error nuestro.
 * Y sólo ve los tableros donde esté la cuenta que lo autorizó: no existe en
 * Trello un permiso de «administrador que ve todo», eso se resuelve sumando esa
 * cuenta al espacio de trabajo de la agencia.
 */

const API = 'https://api.trello.com/1';
const ZONA = 'America/Argentina/Buenos_Aires';
const CACHE_MS = 60 * 1000;
/* Un pedido por tablero cada minuto. El límite de Trello es de 100 cada diez
   segundos, así que el tope está para que un día con muchos tableros no lo
   roce, no porque hoy estemos cerca. */
const MAX_TABLEROS = 40;

let cache = null;

function credenciales() {
  const key = process.env.TRELLO_KEY;
  const token = process.env.TRELLO_TOKEN;
  if (!key || !token) throw new Error('Faltan TRELLO_KEY o TRELLO_TOKEN en el servidor.');
  return { key, token };
}

async function trello(ruta, parametros = {}) {
  const { key, token } = credenciales();
  const url = new URL(`${API}${ruta}`);
  for (const [k, v] of Object.entries(parametros)) url.searchParams.set(k, v);
  url.searchParams.set('key', key);
  url.searchParams.set('token', token);

  const r = await fetch(url, { signal: AbortSignal.timeout(25000) });
  if (!r.ok) {
    const detalle = await r.text().catch(() => '');
    /* Trello contesta 401 tanto si la clave está mal como si el testigo se
       revocó; conviene decirlo con esas palabras y no con el número. */
    if (r.status === 401) throw new Error('Trello rechazó la credencial: revisá TRELLO_KEY y TRELLO_TOKEN.');
    throw new Error(`Trello respondió ${r.status}. ${detalle.slice(0, 200)}`);
  }
  return r.json();
}

/* El día se cuenta en la zona de Buenos Aires y no en UTC: si no, una tarjeta
   que vence hoy a las 21 aparecería vencida desde la tarde. */
const diaLocal = (fecha) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: ZONA, year: 'numeric', month: '2-digit', day: '2-digit' }).format(fecha);

function ordenarTablero(bruto) {
  const listas = (bruto.lists || []).map((l) => ({ id: l.id, nombre: l.name }));
  const nombreDeLista = Object.fromEntries(listas.map((l) => [l.id, l.nombre]));
  const miembros = (bruto.members || []).map((m) => ({ id: m.id, nombre: m.fullName || m.username, usuario: m.username }));
  const nombreDeMiembro = Object.fromEntries(miembros.map((m) => [m.id, m.nombre]));

  const ahora = new Date();
  const hoy = diaLocal(ahora);

  const tarjetas = (bruto.cards || []).map((c) => {
    const vence = c.due ? new Date(c.due) : null;
    const completa = !!c.dueComplete;
    return {
      id: c.id,
      nombre: c.name,
      url: c.shortUrl,
      lista: nombreDeLista[c.idList] || '',
      responsables: (c.idMembers || []).map((id) => nombreDeMiembro[id]).filter(Boolean),
      etiquetas: (c.labels || []).map((e) => e.name || e.color).filter(Boolean),
      vence: c.due || null,
      completa,
      /* Una tarjeta entregada no está vencida aunque su fecha haya pasado: es
         el error clásico de estos tableros y por eso se mira `dueComplete`. */
      vencida: !!vence && !completa && vence < ahora,
      venceHoy: !!vence && !completa && diaLocal(vence) === hoy,
      ultimoMovimiento: c.dateLastActivity || null,
    };
  });

  return { id: bruto.id, nombre: bruto.name, url: bruto.url, listas, miembros, tarjetas };
}

async function leerTrello() {
  if (cache && cache.vence > Date.now()) return cache.datos;

  const tableros = await trello('/members/me/boards', {
    filter: 'open',
    fields: 'name,url',
  });
  if (tableros.length > MAX_TABLEROS)
    throw new Error(`La cuenta ve ${tableros.length} tableros y el panel está preparado para ${MAX_TABLEROS}.`);

  const detalle = await Promise.all(tableros.map((t) => trello(`/boards/${t.id}`, {
    fields: 'name,url',
    lists: 'open',
    list_fields: 'name,pos',
    cards: 'open',
    card_fields: 'name,due,dueComplete,idList,idMembers,labels,shortUrl,dateLastActivity',
    members: 'all',
    member_fields: 'fullName,username',
  })));

  const ordenados = detalle.map(ordenarTablero);
  const todas = ordenados.flatMap((t) => t.tarjetas);
  const datos = {
    tableros: ordenados,
    resumen: {
      tableros: ordenados.length,
      tarjetas: todas.length,
      vencidas: todas.filter((c) => c.vencida).length,
      vencenHoy: todas.filter((c) => c.venceHoy).length,
      sinFecha: todas.filter((c) => !c.vence).length,
      sinResponsable: todas.filter((c) => !c.responsables.length).length,
    },
    leido: new Date().toISOString(),
  };

  cache = { datos, vence: Date.now() + CACHE_MS };
  return datos;
}

export default async function handler(req, res) {
  const sesion = exigirSesion(req, res);
  if (!sesion) return;

  try {
    /* El filtro vive acá y no en la navegación: esconder el botón del menú no
       es un permiso. Un especialista o un cliente que escriba la URL a mano
       tiene que rebotar igual. */
    if (!esGestor(await usuarioDeSesion(sesion)))
      return res.status(403).json({ error: 'Las tareas del equipo son para administradores y project managers.' });

    res.setHeader('Cache-Control', 'private, max-age=0, no-store');
    return res.status(200).json(await leerTrello());
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
