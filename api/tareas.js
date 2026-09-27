import { exigirSesion, usuarioDeSesion, esGestor } from './_comun.js';
import { buscarCliente } from './_cuentas.js';

/**
 * Las tareas del equipo salen de Trello. El navegador no habla con Trello: la
 * clave y el testigo viven acá, igual que los de Windsor y los de Drive.
 *
 * El testigo se generó con alcance de sólo lectura, así que el panel puede ver
 * todo y no puede mover, cerrar ni borrar una tarjeta ni por un error nuestro.
 * Y sólo ve los tableros donde esté la cuenta que lo autorizó: no existe en
 * Trello un permiso de «administrador que ve todo», eso se resuelve sumando esa
 * cuenta al espacio de trabajo de la agencia.
 *
 * Hay un tablero por cliente, declarado en `_cuentas.js`. Los demás tableros
 * que el testigo alcance a ver no se muestran: el panel enseña las tareas del
 * cliente que se está mirando, no todo lo que hay en la cuenta de Trello.
 */

const API = 'https://api.trello.com/1';
const ZONA = 'America/Argentina/Buenos_Aires';
/* Un pedido por tablero cada minuto, muy lejos del límite de Trello de 100
   cada diez segundos. */
const CACHE_MS = 60 * 1000;

/* Una entrada de caché por tablero. */
const cache = new Map();

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

/* Qué significa cada lista, que es lo que decide si una tarjeta está atrasada.
   El equipo marca que algo está listo moviéndolo a HECHO, no tildando la
   casilla de la fecha: si el panel mirara sólo la casilla contaría como
   atrasado trabajo entregado hace un año. Se reconoce por el nombre porque
   cada tablero de cliente arma sus listas por su cuenta, y lo que no encaja
   con ninguna se toma como pendiente, para que nada desaparezca en silencio. */
const ESTADO_DE_LISTA = [
  [/hecho|done|listo|complet|finaliz/i, 'hecho'],
  [/espera|on.?hold|pausad|bloquead|frenad/i, 'bloqueada'],
  [/revisi|review|aprobaci/i, 'revision'],
  [/progreso|en curso|doing|haciendo/i, 'progreso'],
  [/always.?on|backlog|ideas/i, 'backlog'],
];
const estadoDeLista = (nombre) =>
  (ESTADO_DE_LISTA.find(([patron]) => patron.test(nombre)) || [null, 'pendiente'])[1];

/* Sólo lo que está en marcha puede estar atrasado. Lo entregado ya no, lo
   frenado está frenado a propósito y el backlog no tiene fecha comprometida:
   pintarlos de rojo todos los días es ruido que hace abandonar el panel. */
const EN_MARCHA = new Set(['pendiente', 'progreso', 'revision']);

/* El día se cuenta en la zona de Buenos Aires y no en UTC: si no, una tarjeta
   que vence hoy a las 21 aparecería vencida desde la tarde. */
const diaLocal = (fecha) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: ZONA, year: 'numeric', month: '2-digit', day: '2-digit' }).format(fecha);

function ordenarTablero(bruto) {
  const listas = (bruto.lists || []).map((l) => ({ id: l.id, nombre: l.name, estado: estadoDeLista(l.name) }));
  const nombreDeLista = Object.fromEntries(listas.map((l) => [l.id, l.nombre]));
  const estadoPorLista = Object.fromEntries(listas.map((l) => [l.id, l.estado]));
  const miembros = (bruto.members || []).map((m) => ({ id: m.id, nombre: m.fullName || m.username, usuario: m.username }));
  const nombreDeMiembro = Object.fromEntries(miembros.map((m) => [m.id, m.nombre]));

  const ahora = new Date();
  const hoy = diaLocal(ahora);

  const tarjetas = (bruto.cards || []).map((c) => {
    const vence = c.due ? new Date(c.due) : null;
    const estado = estadoPorLista[c.idList] || 'pendiente';
    /* Lo que decide si una tarea terminó es la lista, no la casilla de la
       fecha. Tildar esa casilla en una tarjeta que está EN REVISIÓN quiere
       decir «lo entregué a tiempo», no «el PM ya lo revisó»: si contara como
       entregada, desaparecería de la cola de revisión de quien tiene que
       mirarla. La casilla sólo evita que figure como atrasada. */
    const entregada = estado === 'hecho';
    const aTiempo = !!c.dueComplete;
    const viva = EN_MARCHA.has(estado);
    /* Una misma tarjeta se usa para pedir varias cosas, marcadas con un
       checklist, así que el avance no es sólo «hecha o no hecha». */
    const items = c.badges?.checkItems || 0;
    return {
      id: c.id,
      nombre: c.name,
      url: c.shortUrl,
      lista: nombreDeLista[c.idList] || '',
      estado,
      responsables: (c.idMembers || []).map((id) => nombreDeMiembro[id]).filter(Boolean),
      etiquetas: (c.labels || []).map((e) => e.name || e.color).filter(Boolean),
      vence: c.due || null,
      entregada,
      viva,
      checklist: items ? { hechos: c.badges.checkItemsChecked || 0, total: items } : null,
      comentarios: c.badges?.comments || 0,
      vencida: viva && !aTiempo && !!vence && vence < ahora,
      venceHoy: viva && !aTiempo && !!vence && diaLocal(vence) === hoy,
      ultimoMovimiento: c.dateLastActivity || null,
    };
  });

  return { id: bruto.id, nombre: bruto.name, url: bruto.url, listas, miembros, tarjetas };
}

async function leerTablero(idTablero, refrescar = false) {
  const guardado = cache.get(idTablero);
  /* La caché de un minuto evita machacar a Trello mientras alguien mira la
     pantalla, pero tiene que poder saltearse: si acaba de mover una tarjeta y
     aprieta Actualizar, el panel no puede seguir mostrando lo de hace un rato. */
  if (!refrescar && guardado && guardado.vence > Date.now()) return guardado.datos;

  const bruto = await trello(`/boards/${idTablero}`, {
    fields: 'name,url',
    lists: 'open',
    list_fields: 'name,pos',
    cards: 'open',
    card_fields: 'name,due,dueComplete,idList,idMembers,labels,shortUrl,dateLastActivity,badges',
    members: 'all',
    member_fields: 'fullName,username',
  });

  const tablero = ordenarTablero(bruto);
  const todas = tablero.tarjetas;
  const vivas = todas.filter((c) => c.viva);

  /* La carga de cada persona se cuenta sobre lo que está en marcha: lo que
     alguien entregó hace tres meses no dice nada de cómo está hoy. «En marcha»
     se abre en sus tres estados porque no es lo mismo tener diez cosas sin
     empezar que diez esperando que alguien las revise. Lo bloqueado va por
     separado: justamente no está en marcha. */
  const porPersona = new Map();
  const fila = (quien) => {
    if (!porPersona.has(quien))
      porPersona.set(quien, { persona: quien, pendiente: 0, progreso: 0, revision: 0, enMarcha: 0, vencidas: 0, bloqueadas: 0 });
    return porPersona.get(quien);
  };
  for (const c of todas) {
    if (!c.viva && c.estado !== 'bloqueada') continue;
    for (const quien of (c.responsables.length ? c.responsables : [null])) {
      const f = fila(quien);
      if (c.estado === 'bloqueada') { f.bloqueadas += 1; continue; }
      f.enMarcha += 1;
      if (c.estado === 'revision') f.revision += 1;
      else if (c.estado === 'progreso') f.progreso += 1;
      else f.pendiente += 1;
      if (c.vencida) f.vencidas += 1;
    }
  }

  const datos = {
    tablero: { id: tablero.id, nombre: tablero.nombre, url: tablero.url },
    listas: tablero.listas,
    tarjetas: todas,
    personas: [...porPersona.values()].sort((a, b) => b.vencidas - a.vencidas || b.enMarcha - a.enMarcha),
    /* Las dos cifras que no son de atraso están igual de arriba a propósito: lo
       que espera revisión es trabajo frenado en el escritorio del PM, y lo
       bloqueado es lo que sólo él puede destrabar. */
    resumen: {
      tarjetas: todas.length,
      enMarcha: vivas.length,
      vencidas: vivas.filter((c) => c.vencida).length,
      vencenHoy: vivas.filter((c) => c.venceHoy).length,
      esperandoRevision: todas.filter((c) => c.estado === 'revision').length,
      bloqueadas: todas.filter((c) => c.estado === 'bloqueada').length,
      sinFecha: vivas.filter((c) => !c.vence).length,
      sinResponsable: vivas.filter((c) => !c.responsables.length).length,
      entregadas: todas.filter((c) => c.entregada).length,
    },
    leido: new Date().toISOString(),
  };

  cache.set(idTablero, { datos, vence: Date.now() + CACHE_MS });
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

    const cliente = buscarCliente(String(req.query?.cliente || ''));
    if (!cliente) return res.status(404).json({ error: 'Ese cliente no existe.' });

    res.setHeader('Cache-Control', 'private, max-age=0, no-store');
    /* Un cliente sin tablero declarado no es un error: todavía no tiene uno. */
    if (!cliente.trello) return res.status(200).json({ tablero: null });
    return res.status(200).json(await leerTablero(cliente.trello, req.query?.refrescar === '1'));
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
