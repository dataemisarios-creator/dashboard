const COLORS = ["#9966ff", "#161616"];

const metricDefs = {
  spend: ["Inversión", "currency"], impressions: ["Impresiones", "number"], cpm: ["CPM", "currency"], reach: ["Alcance", "number"], frequency: ["Frecuencia", "decimal"],
  conversions: ["Leads / conversiones", "number"], cpa: ["CPL / CPA", "currency"], instagramProfileVisits: ["Visitas al perfil de Instagram", "number"], instagramFollows: ["Seguimientos de Instagram", "number"],
  clicks: ["Clics", "number"], ctr: ["CTR", "percent"], cpc: ["CPC", "currency"], views: ["Visualizaciones", "number"], cpv: ["CPV", "currency"],
  allConversions: ["Todas las conversiones", "number"], cpaTodas: ["Costo / todas las conv.", "currency"],
  /* TikTok: retención de video, interacción y embudo. Las tasas se calculan
     sobre impresiones, que es el denominador con el que se leen en la
     plataforma. */
  views2s: ["Reproducciones de 2 s", "number"], views6s: ["Reproducciones de 6 s", "number"],
  views25: ["Vistas al 25%", "number"], views50: ["Vistas al 50%", "number"], views75: ["Vistas al 75%", "number"], views100: ["Vistas al 100%", "number"],
  hookRate: ["Tasa de gancho (2 s)", "percent"], vtr: ["Tasa de finalización", "percent"],
  interactions: ["Interacciones", "number"],
  revenue: ["Ingresos", "currency"], roas: ["ROAS", "decimal"], purchases: ["Compras", "number"],
  pageViews: ["Visitas a la página", "number"], landingPageViews: ["Vistas de la página de destino", "number"],
  addToCart: ["Añadir al carrito", "number"], checkout: ["Inicio de pago", "number"],
  videoViews: ["Reproducciones de video", "number"], paidFollowers: ["Seguidores pagos", "number"], tiktokProfileVisits: ["Visitas al perfil de TikTok", "number"], shares: ["Compartidos", "number"],
  followers: ["Seguidores totales", "number"], newFollowers: ["Nuevos seguidores", "number"], unfollows: ["Dejaron de seguir", "number"], balance: ["Balance de seguidores", "number"], reels: ["Reels publicados", "number"], feedPosts: ["Posteos en el feed", "number"], stories: ["Historias", "number"], saves: ["Guardados", "number"], likes: ["Me gusta", "number"], comments: ["Comentarios", "number"]
};

const platforms = {
  meta: {
    title: "Meta Ads", description: "Rendimiento de campañas de Facebook e Instagram.", paid: true,
    metrics: ["spend","impressions","cpm","reach","frequency","conversions","cpa","instagramProfileVisits","instagramFollows"],
    objectives: { leads: "Leads", profile: "Tráfico al perfil" },
    defaults: { leads: ["spend","impressions","conversions","cpa","reach","frequency"], profile: ["spend","impressions","instagramProfileVisits","instagramFollows","cpm","frequency"] },
    campaigns: [
      ["meta-1","AR_AON_MT_LEAD_ZONA_1_CABA_AMBA","leads",1], ["meta-2","AR_AON_MT_LEAD_ZONA_2_CORDOBA","leads",.82], ["meta-3","AR_AON_MT_LEAD_RMK","leads",.63], ["meta-4","AR_AON_MT_TRFP_INSTAGRAM","profile",.74]
    ]
  },
  google: {
    title: "Google Ads", description: "Búsqueda, conversiones y visualizaciones de Google Ads.", paid: true,
    metrics: ["clicks","impressions","ctr","cpc","spend","conversions","cpa","allConversions","cpaTodas","views","cpv","cpm"],
    objectives: { search: "Búsqueda", conversions: "Conversiones", video: "Video" },
    defaults: { search: ["clicks","impressions","ctr","cpc","spend","conversions"], conversions: ["conversions","cpa","spend","clicks","ctr","impressions"], video: ["views","cpv","spend","impressions","cpm","clicks"] },
    campaigns: [["google-1","Search · Marca","search",1], ["google-2","Search · Modelos","conversions",.78], ["google-3","YouTube · Lanzamiento","video",.92]]
  },
  tiktok: {
    title: "TikTok Ads", description: "Rendimiento de campañas y videos promocionados en TikTok.", paid: true,
    metrics: ["spend","impressions","cpm","reach","frequency","videoViews","cpv","clicks","ctr","cpc",
      "views2s","views6s","views25","views50","views75","views100","hookRate","vtr",
      "interactions","likes","comments","shares","paidFollowers","tiktokProfileVisits",
      "conversions","cpa","revenue","roas","purchases","pageViews","landingPageViews","addToCart","checkout"],
    objectives: { video: "Video", traffic: "Tráfico al perfil", followers: "Seguidores" },
    defaults: { video: ["spend","impressions","videoViews","cpv","reach","frequency"], traffic: ["spend","impressions","tiktokProfileVisits","shares","cpm","frequency"], followers: ["spend","paidFollowers","tiktokProfileVisits","reach","frequency","impressions"] },
    campaigns: [["tiktok-1","TikTok · Lanzamiento SUV","video",1], ["tiktok-2","TikTok · Visitas al perfil","traffic",.74], ["tiktok-3","TikTok · Seguidores","followers",.58]]
  },
  instagram: {
    title: "Instagram orgánico", description: "Audiencia, publicaciones, alcance e interacción orgánica.", paid: false,
    metrics: ["followers","newFollowers","unfollows","balance","reach","views","interactions","likes","comments","shares","saves","reels","feedPosts"],
    defaults: { organic: ["followers","newFollowers","balance","reach","views","interactions"] }, objectives: { organic: "Orgánico" }, campaigns: [],
    /* Instagram informa el alcance de cada día, no el del período: sumarlo
       cuenta dos veces a quien vio contenido dos días distintos. Se dice en la
       etiqueta en lugar de hacerlo pasar por alcance único. */
    etiquetas: { reach: "Alcance (suma diaria)", views: "Visualizaciones", interactions: "Interacciones totales" }
  },
  tiktokOrganic: {
    title: "TikTok orgánico", description: "Publicaciones, visualizaciones e interacción orgánica en TikTok.", paid: false,
    metrics: ["followers","balance","videoViews","reach","interactions","shares","likes","comments","saves"],
    defaults: { organic: ["followers","balance","videoViews","reach","interactions","shares"] }, objectives: { organic: "Orgánico" }, campaigns: []
  }
};

const state = {
  platform: "meta", objective: "__todos", estadoCampanias: "todas", rapido: "thisMonth", start: "", end: "", comparison: "previous", granularity: "day",
  selectedCampaigns: new Set(["meta-1","meta-2","meta-3"]), selectedMetrics: ["conversions","cpa"], chartTypes: { conversions: "bar", cpa: "line" },
  /* Las tarjetas de indicadores: una lista ordenada por plataforma. El usuario
     las quita, las agrega y las reordena arrastrando, así que el orden es suyo
     y no una constante del código. */
  kpis: {},
  networks: new Set(["instagram","facebook"]),
  tableMetrics: { meta: ["spend","conversions","cpa"], google: ["spend","clicks","conversions"], tiktok: ["spend","videoViews","cpv"], instagram: ["reach","interactions","shares"], tiktokOrganic: ["reach","interactions","shares"] },
  expandedMetrics: new Set(["spend","conversions","cpa"]), expandedRows: new Set(["row-0","row-0-adset"]), showValues: {}
};

/* ── Datos reales de Windsor ─────────────────────────────────────────────
   El navegador nunca habla con Windsor: le pide a /api/windsor, que es la
   única que tiene la clave. Acá sólo se arman totales, series y campañas a
   partir de las filas que devuelve esa función. */

/* Qué campo de Windsor corresponde a cada indicador del panel. Lo que no está
   en este mapa no se muestra: nunca se rellena con datos de ejemplo. */
const CAMPOS = {
  meta: { spend:"spend", impressions:"impressions", clicks:"clicks", conversions:"resultado", instagramProfileVisits:"instagram_profile_visits", instagramFollows:"instagram_profile_follow" },
  google: { spend:"spend", impressions:"impressions", clicks:"clicks", conversions:"conversions", allConversions:"all_conversions", views:"video_trueview_views" },
  tiktok: { spend:"spend", impressions:"impressions", clicks:"clicks",
    videoViews:"total_play", views2s:"play_duration_2s", views6s:"play_duration_6s",
    views25:"play_first_quartile", views50:"play_midpoint", views75:"play_third_quartile", views100:"play_over",
    likes:"likes", comments:"comments", shares:"shares",
    paidFollowers:"follows", tiktokProfileVisits:"profile_visits",
    conversions:"conversions", purchases:"complete_payment", revenue:"total_complete_payment_rate",
    pageViews:"total_pageview", landingPageViews:"total_landing_page_view",
    addToCart:"web_event_add_to_cart", checkout:"initiate_checkout" },
  instagram: { reach:"reach", views:"views", interactions:"total_interactions", likes:"likes", comments:"comments", shares:"shares", saves:"saves", newFollowers:"follower_count" },
  tiktokOrganic: {},
};
/* Estos no se suman: son una foto del momento de la consulta. */
const FOTO = new Set(["followers", "feedPosts"]);
/* Plataformas cuyo alcance único llega en su propia consulta y nunca se suma. */
const ALCANCE_APARTE = new Set(["meta", "tiktok"]);
/* Estos no tienen serie diaria: son una foto del día de la consulta o un
   recuento de todo el período, así que no se pueden dibujar por día. La
   tarjeta se muestra igual, pero no se puede llevar al gráfico. */
const SIN_SERIE = new Set(["followers", "feedPosts", "reels"]);
/* Los que llegan en la consulta de foto, que no tiene fecha. */
const CAMPOS_FOTO = { instagram: { followers: "followers_count" } };
/* Cada tipo de publicación de Instagram, tal como lo nombra la API. */
const CONTENIDO_INSTAGRAM = { reels: "REEL", feedPosts: "FEED" };

const OBJETIVOS_META = { OUTCOME_LEADS:"Leads", OUTCOME_TRAFFIC:"Tráfico", OUTCOME_SALES:"Ventas", OUTCOME_ENGAGEMENT:"Interacción", OUTCOME_AWARENESS:"Reconocimiento", OUTCOME_APP_PROMOTION:"Aplicación" };
/* Cada plataforma nombra el estado a su manera: ACTIVE en Meta, ENABLED en
   Google, CAMPAIGN_STATUS_ENABLE en TikTok. Se reducen a dos, que es lo que
   se muestra y lo que se filtra. */
function estadoDeFila(fila, campo = "campaign_status") {
  const crudo = String(fila[campo] || "").toUpperCase();
  if (!crudo) return "desconocido";
  /* El orden importa: AD_STATUS_DELETE también contiene otras palabras, y
     DISABLE no contiene ENABLE, así que se descarta lo eliminado primero. */
  if (crudo.includes("REMOVE") || crudo.includes("DELETE") || crudo.includes("ARCHIV")) return "eliminada";
  if (crudo.includes("ACTIVE") || crudo.includes("ENABLE") || crudo.includes("DELIVERY_OK")) return "activa";
  return "pausada";
}

/* Una entidad no puede entregar más que la que la contiene: una palabra clave
   habilitada en un grupo pausado está, en los hechos, pausada. Vale el peor de
   los dos estados, que es lo que muestra la plataforma. */
const GRAVEDAD = { activa: 0, desconocido: 1, pausada: 2, eliminada: 3 };
function estadoEfectivo(fila, campo, campoPadre) {
  const propio = estadoDeFila(fila, campo);
  if (!campoPadre || !fila[campoPadre]) return propio;
  const padre = estadoDeFila(fila, campoPadre);
  return GRAVEDAD[padre] > GRAVEDAD[propio] ? padre : propio;
}

const TITULO_ESTADO = { activa: "Activa", pausada: "En pausa", eliminada: "Eliminada", desconocido: "Estado no informado" };
const punto = (estado) => (estado ? `<i class="estado-punto estado-${estado}" title="${TITULO_ESTADO[estado]}"></i>` : "");

const OBJETIVOS_GOOGLE = { SEARCH:"Búsqueda", VIDEO:"Video", DISPLAY:"Display", PERFORMANCE_MAX:"Performance Max", SHOPPING:"Shopping", DEMAND_GEN:"Demand Gen" };
const OBJETIVOS_TIKTOK = { VIDEO_VIEWS:"Video", TRAFFIC:"Tráfico", REACH:"Alcance", CONVERSIONS:"Conversiones", WEB_CONVERSIONS:"Conversiones web", LEAD_GENERATION:"Generación de leads", ENGAGEMENT:"Interacción", PRODUCT_SALES:"Ventas", SHOP_PURCHASES:"Compras en tienda", APP_PROMOTION:"Promoción de app", TOPVIEW_REACH:"TopView", RF_REACH:"Alcance y frecuencia" };

const TODOS_LOS_OBJETIVOS = "__todos";

const DATOS = {
  cliente: "geely",
  nombreCliente: "",
  cuentasCliente: [],
  tipo: "meta",
  filas: [],
  filasComparacion: [],
  desglose: [],
  desgloseComparacion: [],
  foto: null,
  fotoComparacion: null,
  contenido: [],
  contenidoComparacion: [],
  extras: [],
  niveles: [],
  nivelesEstado: [],
  alcance: null,
  alcanceComparacion: null,
  alcanceCampania: {},
  alcanceCampaniaComparacion: {},
  alcanceConjunto: {},
  alcanceConjuntoComparacion: {},
  resultado: null,
  resultadoCosto: null,
  moneda: null,
  campanias: [],
  objetivos: {},
  cargando: false,
  error: null,
  consultadoEn: null,
};

/* Hay dos clases de filtro: los que obligan a volver a consultar a Windsor
   (período y comparación) y los que se resuelven sobre lo que ya está cargado
   (campañas y objetivo). Distinguirlos evita una consulta entera cada vez que
   se tilda una campaña. */
let necesitaConsulta=false;

const num = (v) => (v === null || v === undefined || v === "" ? 0 : Number(v) || 0);

function objetivoDeFila(plataforma, fila) {
  if (plataforma === "meta") return OBJETIVOS_META[fila.campaign_objective] || "Otros";
  if (plataforma === "google") return OBJETIVOS_GOOGLE[fila.advertising_channel_type] || "Otros";
  if (plataforma === "tiktok") return OBJETIVOS_TIKTOK[fila.objective_type] || "Otros";
  return "Campañas";
}

/** Totales de un conjunto de filas. Las tasas se calculan sobre los totales del
    período, nunca promediando tasas diarias. */
function totalizar(plataforma, filas, alcance, extra = {}) {
  const mapa = CAMPOS[plataforma] || {};
  const t = {};
  for (const [indicador, campo] of Object.entries(mapa)) {
    if (FOTO.has(indicador)) {
      const conDato = filas.filter((f) => f[campo] !== null && f[campo] !== undefined);
      t[indicador] = conDato.length ? num(conDato[conDato.length - 1][campo]) : 0;
    } else {
      t[indicador] = filas.reduce((suma, f) => suma + num(f[campo]), 0);
    }
  }
  /* En medios pagos el alcance único sale de una consulta aparte. Si para esta
     fila no hay uno, no se inventa sumando los días: queda vacío. */
  if (ALCANCE_APARTE.has(plataforma)) t.reach = alcance === null || alcance === undefined ? null : alcance;
  else if (alcance !== null && alcance !== undefined) t.reach = alcance;
  const tasa = (a, b, factor = 1) => (b ? (a / b) * factor : 0);
  t.cpm = tasa(t.spend, t.impressions, 1000);
  t.ctr = tasa(t.clicks, t.impressions, 100);
  t.cpc = tasa(t.spend, t.clicks);
  t.cpa = tasa(t.spend, t.conversions);
  t.cpv = tasa(t.spend, t.views || t.videoViews);
  t.cpaTodas = tasa(t.spend, t.allConversions);
  /* Retención de video: qué parte de lo que se mostró llegó a cada punto. */
  t.hookRate = tasa(t.views2s, t.impressions, 100);
  t.vtr = tasa(t.views100, t.impressions, 100);
  t.roas = tasa(t.revenue, t.spend);
  /* Donde el conector no informa una interacción total propia, se suma. En
     Instagram sí la informa y es más amplia, así que ahí no se toca. */
  if (!mapa.interactions && (t.likes !== undefined || t.comments !== undefined || t.shares !== undefined))
    t.interactions = (t.likes || 0) + (t.comments || 0) + (t.shares || 0);
  t.frequency = t.reach === null ? null : tasa(t.impressions, t.reach);

  /* Seguidores totales y publicaciones son el valor de hoy: llegan en una
     consulta sin fecha y no se suman. */
  for (const [indicador, campo] of Object.entries(CAMPOS_FOTO[plataforma] || {}))
    if (extra.foto && extra.foto[campo] !== null && extra.foto[campo] !== undefined) t[indicador] = num(extra.foto[campo]);

  /* Reels y posteos se cuentan sobre lo publicado dentro del período. */
  if (extra.contenido)
    for (const [indicador, tipo] of Object.entries(CONTENIDO_INSTAGRAM))
      t[indicador] = extra.contenido.filter((m) => String(m.media_product_type || "").toUpperCase().includes(tipo)).length;

  /* Instagram informa altas más bajas en un solo número, así que la baja es la
     diferencia con las altas. Sin ese dato no se inventa un cero: queda nulo. */
  if (plataforma === "instagram") {
    const informadas = filas.some((f) => f.follower_count !== null && f.follower_count !== undefined);
    const movimientos = filas.reduce((suma, f) => suma + num(f.follows_and_unfollows), 0);
    if (!informadas) t.newFollowers = null;
    t.unfollows = informadas && movimientos ? Math.max(0, movimientos - t.newFollowers) : null;
    t.balance = t.unfollows === null ? null : t.newFollowers - t.unfollows;
  }
  return t;
}

/* Tres filtros se cruzan sobre la misma lista: las campañas tildadas arriba,
   el objetivo elegido y el estado. Los tres son locales, sobre las filas que ya
   están cargadas, así que se aplican al instante y sin volver a consultar. */
function campaniasEnJuego() {
  return new Set(DATOS.campanias
    .filter((c) => state.selectedCampaigns.has(c[0]))
    .filter((c) => state.objective === TODOS_LOS_OBJETIVOS || c[2] === state.objective)
    .filter((c) => state.estadoCampanias === "todas" || c[3] === state.estadoCampanias)
    .map((c) => c[0]));
}

const filasElegidas = (filas) => {
  const activas = campaniasEnJuego();
  return filas.filter((f) => !f.campaign || activas.has(f.campaign));
};

/* El alcance único no se suma. Con todas las campañas vale el de la cuenta;
   con una sola, el de esa campaña, que se pide aparte. Con un subconjunto de
   varias no existe un valor válido: sumarlos contaría dos veces a quien vio
   dos campañas, así que se muestra vacío. */
function alcanceDelFiltro(mapa, total) {
  const elegidas = [...campaniasEnJuego()];
  if (elegidas.length === DATOS.campanias.length) return total;
  if (elegidas.length === 1) return mapa[elegidas[0]] ?? null;
  return null;
}
function totalesActuales() {
  return totalizar(DATOS.tipo, filasElegidas(DATOS.filas), alcanceDelFiltro(DATOS.alcanceCampania, DATOS.alcance), { foto: DATOS.foto, contenido: DATOS.contenido });
}
function totalesComparacion() {
  if (state.comparison === "none" || !DATOS.filasComparacion.length) return null;
  return totalizar(DATOS.tipo, filasElegidas(DATOS.filasComparacion), alcanceDelFiltro(DATOS.alcanceCampaniaComparacion, DATOS.alcanceComparacion), { foto: DATOS.fotoComparacion, contenido: DATOS.contenidoComparacion });
}

/** Rango del período de comparación, con la misma regla que el selector. */
function rangoComparacion() {
  /* El período personalizado sale de sus dos campos; los demás se calculan. */
  if (state.comparison === "custom") {
    const desde = document.querySelector("#compare-start").value;
    const hasta = document.querySelector("#compare-end").value;
    if (desde && hasta) return [desde, hasta];
  }
  const inicio = new Date(`${state.start}T12:00:00`), fin = new Date(`${state.end}T12:00:00`);
  if (state.comparison === "month") {
    const a = new Date(inicio), b = new Date(fin);
    a.setMonth(a.getMonth() - 1); b.setMonth(b.getMonth() - 1);
    return [toISO(a), toISO(b)];
  }
  const dias = Math.round((fin - inicio) / 86400000) + 1;
  const b = new Date(inicio); b.setDate(b.getDate() - 1);
  const a = new Date(b); a.setDate(a.getDate() - dias + 1);
  return [toISO(a), toISO(b)];
}

async function pedir(plataforma, desde, hasta) {
  const r = await fetch(`/api/windsor?cliente=${encodeURIComponent(DATOS.cliente)}&plataforma=${encodeURIComponent(plataforma)}&desde=${desde}&hasta=${hasta}`, { credentials: "same-origin" });
  const cuerpo = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(cuerpo.error || `El servidor respondió ${r.status}.`);
  return cuerpo;
}

/* Guardia por número de pedido: si se cambia de cuenta mientras una consulta
   está en vuelo, la respuesta vieja no pisa a la nueva. */
let ultimoPedido = 0;

async function cargarDatos() {
  // Consultar de nuevo salda cualquier cambio de período o de comparación.
  necesitaConsulta = false;
  const pedido = ++ultimoPedido;
  const vigente = () => pedido === ultimoPedido;
  DATOS.cargando = true;
  DATOS.error = null;
  progreso.mostrado = 0; progreso.objetivo = 0;
  fijarProgreso(4, 45);
  pintarEstadoDatos();
  try {
    /* El período pedido y el de comparación se consultan a la vez: uno detrás
       del otro duplicaba la espera. */
    const conComparacion = state.comparison !== "none";
    /* Cada consulta que vuelve empuja el porcentaje: son los únicos puntos en
       los que sabemos algo cierto sobre el avance. */
    let hechas = 0;
    const total = conComparacion ? 2 : 1;
    const anotar = (r) => { hechas++; fijarProgreso(40 + (hechas / total) * 45, 60 + (hechas / total) * 35); return r; };
    const [actual, previo] = await Promise.all([
      pedir(state.platform, state.start, state.end).then(anotar),
      conComparacion ? pedir(state.platform, ...rangoComparacion()).then(anotar).catch(() => null) : Promise.resolve(null),
    ]);
    if (!vigente()) return;

    DATOS.filas = actual.filas || [];
    DATOS.desglose = actual.desglose || [];
    DATOS.extras = actual.extras || [];
    DATOS.foto = actual.foto || null;
    DATOS.contenido = actual.contenido || [];
    DATOS.niveles = actual.niveles || [];
    DATOS.nivelesEstado = actual.nivelesEstado || [];
    DATOS.alcance = actual.alcance;
    DATOS.alcanceCampania = actual.alcanceCampania || {};
    DATOS.alcanceConjunto = actual.alcanceConjunto || {};
    DATOS.resultado = actual.cuenta?.resultado || null;
    DATOS.resultadoCosto = actual.cuenta?.resultadoCosto || null;
    DATOS.moneda = actual.cuenta?.moneda || null;
    DATOS.consultadoEn = actual.consultadoEn;

    DATOS.filasComparacion = previo ? previo.filas || [] : [];
    DATOS.desgloseComparacion = previo ? previo.desglose || [] : [];
    DATOS.alcanceComparacion = previo ? previo.alcance : null;
    DATOS.alcanceCampaniaComparacion = previo ? previo.alcanceCampania || {} : {};
    DATOS.alcanceConjuntoComparacion = previo ? previo.alcanceConjunto || {} : {};
    DATOS.fotoComparacion = previo ? previo.foto || null : null;
    DATOS.contenidoComparacion = previo ? previo.contenido || [] : [];

    // Las campañas y los objetivos salen de lo que devolvió la cuenta.
    const vistas = new Map();
    for (const f of DATOS.filas) {
      if (!f.campaign) continue;
      /* El estado puede cambiar dentro del período: vale el de la fila más
         reciente, que es el estado con el que la campaña quedó. */
      vistas.set(f.campaign, { objetivo: objetivoDeFila(DATOS.tipo, f), estado: estadoDeFila(f) });
    }
    DATOS.campanias = [...vistas.entries()].map(([nombre, x]) => [nombre, nombre, x.objetivo, x.estado]);
    DATOS.objetivos = {};
    for (const [, , objetivo] of DATOS.campanias) DATOS.objetivos[objetivo] = objetivo;

    const previas = state.selectedCampaigns;
    const siguen = DATOS.campanias.filter((c) => previas.has(c[0])).map((c) => c[0]);
    state.selectedCampaigns = new Set(siguen.length ? siguen : DATOS.campanias.map((c) => c[0]));
    // Un objetivo que ya no existe en esta cuenta vuelve a «todos».
    if (state.objective !== TODOS_LOS_OBJETIVOS && !DATOS.campanias.some((c) => c[2] === state.objective))
      state.objective = TODOS_LOS_OBJETIVOS;

    fijarProgreso(100, 100);
    DATOS.cargando = false;
    avisarConexion(true);
    renderAll();
  } catch (e) {
    if (!vigente()) return;
    DATOS.cargando = false;
    DATOS.error = e.message;
    DATOS.filas = [];
    DATOS.campanias = [];
    avisarConexion(false);
    renderAll();
  }
  pintarEstadoDatos();
}

function avisarConexion(viva) {
  if (window.PanelEmisarios && window.PanelEmisarios.conexion) window.PanelEmisarios.conexion(viva, DATOS.error);
}

/** Cartel sobre la vista: consultando, error, o cuenta sin datos. */
/* Frases de la cortina de carga. Van en orden y no al azar: así no se repite
   la misma dos veces seguidas en una espera corta. */
const FRASES_CARGA = [
  "Estamos escarbando en los datos",
  "Despertando al servidor, que estaba en modo siesta",
  "Convenciendo a la API de que somos gente de bien",
  "Explicándole a Google que sí, que somos nosotros",
  "Negociando con el límite de consultas por minuto",
  "Encontramos oro, pero viene sin documentación",
  "Traduciendo del JSON al castellano",
  "Esperando que TikTok termine de bailar",
  "Contando los clics de a uno, como corresponde",
  "Preguntándole a la nube; la nube consulta con otra nube",
  "Cargando la barra de carga",
  "Meta dice que ya casi, pero lo viene diciendo hace rato",
  "Alineando husos horarios, monedas y egos",
  "Aplicando inteligencia artificial, mayormente decorativa",
  "Bajando los datos a 56k, por nostalgia",
  "Buscando el dato en la última pestaña que quedó abierta",
];

let frasesTimer = null;
let cortinaTimer = null;
let pctTimer = null;

/* El porcentaje es una estimación, no una medición: la API no informa avance.
   Sube sola y despacio hacia un techo, y pega un salto cada vez que pasa algo
   de verdad —llegó el período, llegó la comparación, se pintó la vista—. Así
   nunca dice 90 % cuando todavía no volvió nada. */
const progreso = { mostrado: 0, objetivo: 0 };
function fijarProgreso(piso, techo) {
  progreso.mostrado = Math.max(progreso.mostrado, piso);
  progreso.objetivo = Math.max(progreso.objetivo, techo);
}

function mostrarCortina(visible) {
  const cortina = document.querySelector("#cargando");
  if (!cortina) return;
  clearTimeout(cortinaTimer);
  clearInterval(frasesTimer);
  clearInterval(pctTimer);
  if (!visible) {
    const pct = document.querySelector("#cargando-pct");
    if (pct) pct.textContent = "100%";
    cortina.hidden = true;
    return;
  }
  /* Un cuarto de segundo de gracia: si la consulta vuelve enseguida, la
     cortina no llega a aparecer y no se ve un parpadeo. */
  cortinaTimer = setTimeout(() => {
    const texto = document.querySelector("#cargando-frase");
    let i = 0;
    texto.textContent = FRASES_CARGA[0];
    cortina.hidden = false;
    const pct = document.querySelector("#cargando-pct");
    pctTimer = setInterval(() => {
      progreso.mostrado += (progreso.objetivo - progreso.mostrado) * 0.07;
      pct.textContent = `${Math.round(progreso.mostrado)}%`;
    }, 90);
    frasesTimer = setInterval(() => {
      i = (i + 1) % FRASES_CARGA.length;
      texto.style.opacity = 0;
      setTimeout(() => { texto.textContent = FRASES_CARGA[i]; texto.style.opacity = 1; }, 180);
    }, 2200);
  }, 250);
}

function pintarEstadoDatos() {
  const caja = document.querySelector("#data-state");
  mostrarCortina(DATOS.cargando);
  if (!caja) return;
  if (DATOS.cargando) { caja.hidden = true; return; }
  if (DATOS.error) { caja.hidden = false; caja.className = "data-state is-error"; caja.textContent = DATOS.error; return; }
  if (!DATOS.filas.length) {
    caja.hidden = false; caja.className = "data-state";
    caja.textContent = `La cuenta no devolvió datos entre ${dateText(state.start)} y ${dateText(state.end)}.`;
    return;
  }
  caja.hidden = true;
}

/* Cuántos decimales hacen falta para que un valor que no es cero no se vea
   como cero. Un CTR de 0,00064% redondeado a dos decimales es un cero que
   miente, y en TikTok pasa de verdad: 8 clics sobre 1.240.013 impresiones. */
function decimalesVisibles(valor, base, tope = 6) {
  if (!valor) return base;
  let d = base;
  while (d < tope && Number(Math.abs(valor).toFixed(d)) === 0) d++;
  return d;
}

function fmt(metric, value) {
  const type = metricDefs[metric]?.[1] || "number";
  // Lo que la fuente no informa se muestra vacío, nunca como un cero.
  if (value === null || value === undefined) return "—";
  /* Las tasas y los importes llevan siempre dos decimales, para que una
     columna de números se lea alineada; los enteros no llevan ninguno. */
  const base = type === "number" ? 0 : 2;
  const d = decimalesVisibles(value, base);
  const opciones = { minimumFractionDigits: type === "number" ? 0 : base, maximumFractionDigits: d };
  if (type === "currency")
    return new Intl.NumberFormat("es-AR", { style:"currency", currency: (typeof DATOS !== "undefined" && DATOS.moneda) || "USD", ...opciones }).format(value);
  if (type === "percent") return `${new Intl.NumberFormat("es-AR", opciones).format(value)}%`;
  return new Intl.NumberFormat("es-AR", opciones).format(value);
}
/* Una plataforma puede renombrar un indicador cuando su dato no significa lo
   mismo que en el resto (el alcance de Instagram, por ejemplo). */
function metricLabel(metric) {
  /* Cada cuenta de Meta nombra su resultado a su manera: compras, leads o
     conversaciones. Lo dice el servidor, que es quien sabe qué evento pidió. */
  if (metric === "conversions" && DATOS.resultado) return DATOS.resultado;
  if (metric === "cpa" && DATOS.resultadoCosto) return DATOS.resultadoCosto;
  return platforms[state.platform]?.etiquetas?.[metric] || metricDefs[metric]?.[0] || metric;
}

/* Iconos de las vistas orgánicas. En medios pagos no van: ahí lo que ordena la
   lectura es el número, y un icono por tarjeta sería ruido. */
const ICONOS_ORGANICOS = {
  followers: '<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/><circle cx="17.5" cy="9.5" r="2.4"/><path d="M15 19a4.6 4.6 0 0 1 5.5-3.9"/>',
  newFollowers: '<circle cx="10" cy="8" r="3.4"/><path d="M4 19a6 6 0 0 1 12 0"/><path d="M18 8v6M15 11h6"/>',
  unfollows: '<circle cx="10" cy="8" r="3.4"/><path d="M4 19a6 6 0 0 1 12 0"/><path d="M15 11h6"/>',
  balance: '<path d="M4 17h4V9H4zM10 17h4V5h-4zM16 17h4v-5h-4z"/>',
  reels: '<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><path d="M8 3.8 11 9M14 3.8 17 9M3.6 9h16.8"/><path d="m11 12.6 3.4 1.9-3.4 1.9z"/>',
  feedPosts: '<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="m4 16 4-4 4 4 3-3 5 5"/><circle cx="9" cy="8.5" r="1.4"/>',
  stories: '<circle cx="12" cy="12" r="8.5" stroke-dasharray="3.4 2.6"/><circle cx="12" cy="12" r="3.4"/>',
  reach: '<circle cx="12" cy="9" r="2.8"/><path d="M7 19a5 5 0 0 1 10 0"/><path d="M4.5 7.5 2 5M19.5 7.5 22 5"/>',
  interactions: '<path d="M4 12a8 8 0 1 1 3.2 6.4L3 20l1.3-4.1A7.9 7.9 0 0 1 4 12Z"/>',
  shares: '<path d="M4 12v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6"/><path d="M12 15V4M8 7.5 12 3.5l4 4"/>',
  saves: '<path d="M6 3.5h12v17l-6-4.2-6 4.2z"/>',
  likes: '<path d="M12 20s-7.5-4.6-7.5-9.3A4.2 4.2 0 0 1 12 8a4.2 4.2 0 0 1 7.5 2.7C19.5 15.4 12 20 12 20Z"/>',
  comments: '<path d="M20 15a2.5 2.5 0 0 1-2.5 2.5H8L4 21V6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5z"/>',
  videoViews: '<rect x="3" y="5.5" width="18" height="13" rx="3"/><path d="m10.5 10 4.5 2.5-4.5 2.5z"/>',
  views: '<path d="M2.5 12S6 6 12 6s9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.8"/>',
};
const iconoDeMetrica = (metric) => {
  if (currentPlatform().paid) return "";
  const trazo = ICONOS_ORGANICOS[metric];
  return trazo ? `<i class="kpi-icono" aria-hidden="true"><svg viewBox="0 0 24 24">${trazo}</svg></i>` : "";
};

/* En los indicadores de costo, subir es malo y bajar es bueno: un CPC que sube
   no es una buena noticia aunque el número crezca. Lo mismo con quienes dejan
   de seguir la cuenta. El resto son de volumen y se leen al derecho. */
const INDICADORES_INVERSOS = new Set(["cpm", "cpa", "cpc", "cpv", "frequency", "unfollows"]);

/** Clase de color de una variación: mira el indicador, no sólo el signo. */
function claseDeCambio(metric, cambio) {
  if (cambio === null || cambio === undefined) return "";
  const mejora = INDICADORES_INVERSOS.has(metric) ? cambio < 0 : cambio >= 0;
  return mejora ? "positive" : "negative";
}
function currentPlatform() { return platforms[DATOS.tipo] || platforms.meta; }
function tipoDe(cuentaId){ const c=(DATOS.cuentasCliente||[]).find(x=>x.id===cuentaId); return c ? c.tipo : "meta"; }
function hayComparacion(){ return state.comparison !== "none" && !!DATOS.filasComparacion.length; }
/* Variación real de cada indicador contra el período de comparación. */
function deltaFor(metric){ const c=totalesComparacion(); if(!c) return null; const previo=c[metric]; if(!previo) return null; return (totalesActuales()[metric]/previo-1)*100; }
const MAX_KPIS = 9;

/* La disposición ya no se guarda sola: se guarda cuando la persona lo pide,
   con «Guardar vista». Así queda explícito que quiso dejarlo así, en lugar de
   arrastrar sin querer un cambio de paso hasta la próxima sesión. */
function guardarKpis() { /* la persistencia vive en las vistas guardadas */ }

/* La primera vez que se entra a una plataforma se toma lo que dejó el usuario
   y, si no dejó nada, los seis de siempre. Lo guardado se revisa contra los
   indicadores que hoy existen: un indicador que se quitó del código no puede
   volver desde una preferencia vieja. */
function listaKpis() {
  const tipo=DATOS.tipo, p=currentPlatform();
  /* La lista se revisa siempre contra los indicadores que esta plataforma
     tiene: uno de otra plataforma no puede sobrevivir acá ni llegar a
     guardarse en una vista. */
  const guardada=state.kpis[tipo];
  const limpia=Array.isArray(guardada)?guardada.filter(m=>p.metrics.includes(m)):null;
  if(!limpia||!limpia.length) state.kpis[tipo]=(p.defaults[state.objective]||p.metrics).slice(0,6);
  else if(limpia.length!==guardada.length) state.kpis[tipo]=limpia;
  return state.kpis[tipo];
}

/* Volver a los seis de fábrica de esta plataforma. */
function restablecerKpis(){
  const p=currentPlatform();
  state.kpis[DATOS.tipo]=(p.defaults[state.objective]||p.metrics).slice(0,6);
  state.selectedMetrics=listaKpis().filter(m=>!SIN_SERIE.has(m)).slice(0,2);
  guardarKpis(); renderKpis(); renderChart();
}
function currentMetrics() { return listaKpis(); }

/* Hay filtro cuando lo que se mira no es la cuenta entera: un objetivo
   concreto o un subconjunto de campañas. */
function hayFiltroActivo() {
  if (state.objective && state.objective !== TODOS_LOS_OBJETIVOS) return true;
  return DATOS.campanias.length > 0 && campaniasEnJuego().size < DATOS.campanias.length;
}

/* Con un filtro puesto, una tarjeta en cero no informa nada: ofrecer CPV en una
   campaña de búsqueda es ofrecer un cero. Se esconde de la grilla, pero no se
   saca de la lista del usuario, así vuelve sola al quitar el filtro.
   Sin filtro no se esconde nada: ahí un cero sí es información (no hubo leads
   este mes), y hacer desaparecer la tarjeta sería ocultar el dato. */
function kpisVisibles() {
  const lista=listaKpis();
  if(!hayFiltroActivo()) return lista;
  const totales=totalesActuales();
  const conDato=lista.filter(m=>{ const v=totales[m]; return v!==null && v!==undefined && v!==0; });
  return conDato.length?conDato:lista;
}
/* El valor de un indicador sale de los totales reales del período. `filas`
   permite pedir los de una campaña concreta para la tabla. */
function valueFor(metric, filas, alcance = null) {
  const totales = filas ? totalizar(DATOS.tipo, filas, alcance) : totalesActuales();
  return totales[metric] === undefined ? 0 : totales[metric];
}
function toISO(date){return date.toISOString().slice(0,10)}
function dateText(value){return new Intl.DateTimeFormat("es-AR",{day:"2-digit",month:"2-digit",year:"numeric"}).format(new Date(`${value}T12:00:00`))}
function syncPeriodControls(){document.querySelector("#date-start").value=state.start;document.querySelector("#date-end").value=state.end;document.querySelector("#period-summary").textContent=`${dateText(state.start)} — ${dateText(state.end)}`}
function syncComparisonDates(mode){const start=new Date(`${state.start}T12:00:00`),end=new Date(`${state.end}T12:00:00`);let cs,ce;if(mode==="previous"){const days=Math.round((end-start)/86400000)+1;ce=new Date(start);ce.setDate(ce.getDate()-1);cs=new Date(ce);cs.setDate(cs.getDate()-days+1)}else if(mode==="month"){cs=new Date(start);ce=new Date(end);cs.setMonth(cs.getMonth()-1);ce.setMonth(ce.getMonth()-1)}else return;document.querySelector("#compare-start").value=toISO(cs);document.querySelector("#compare-end").value=toISO(ce)}
/* «Hoy» y «ayer» son un día puntual y «el mes pasado» está cerrado: en esos
   tres la casilla de incluir hoy no cambia nada, así que se oculta. */
const RAPIDOS_CON_HOY = new Set(["last7", "last14", "thisMonth"]);

function incluyeHoy(){ const c=document.querySelector("#include-today"); return !c || c.checked; }

/** Rango de un período rápido, contado siempre desde el día de hoy. */
function rangoRapido(clave, conHoy = incluyeHoy()){
  const hoy=new Date();
  const fin=new Date(hoy), inicio=new Date(hoy);
  if(clave==="today"){ /* un solo día: hoy */ }
  else if(clave==="yesterday"){ inicio.setDate(inicio.getDate()-1); fin.setDate(fin.getDate()-1); }
  else {
    if(!conHoy) fin.setDate(fin.getDate()-1);
    if(clave==="last7"){ inicio.setTime(fin.getTime()); inicio.setDate(inicio.getDate()-6); }
    else if(clave==="last14"){ inicio.setTime(fin.getTime()); inicio.setDate(inicio.getDate()-13); }
    else if(clave==="thisMonth"){ inicio.setTime(fin.getTime()); inicio.setDate(1); }
    else if(clave==="lastMonth"){ fin.setTime(hoy.getTime()); fin.setDate(0); inicio.setTime(fin.getTime()); inicio.setDate(1); }
  }
  return [toISO(inicio), toISO(fin)];
}

function aplicarRapido(clave){
  state.rapido=clave;
  [state.start,state.end]=rangoRapido(clave);
  document.querySelectorAll("[data-quick-period]").forEach(x=>x.classList.toggle("active",x.dataset.quickPeriod===clave));
  document.querySelector("#include-today-wrap").classList.toggle("hidden",!RAPIDOS_CON_HOY.has(clave));
  syncPeriodControls();
  applyPeriod();
}

function applyPeriod(cerrar=true){
  state.start=document.querySelector("#date-start").value;
  state.end=document.querySelector("#date-end").value;
  syncPeriodControls();
  syncComparisonDates(document.querySelector('input[name="comparison"]:checked').value);
  if(cerrar) document.querySelector("#period-popover").hidden=true;
  marcarFiltrosPendientes(true);
}

function setPlatform(id) {
  state.platform=id;
  DATOS.tipo=tipoDe(id);
  const p=currentPlatform();
  state.objective="";
  state.selectedCampaigns=new Set();
  state.selectedMetrics=listaKpis().filter(m=>!SIN_SERIE.has(m)).slice(0,2);
  state.chartTypes[state.selectedMetrics[0]]="bar"; state.chartTypes[state.selectedMetrics[1]]="line";
  state.expandedMetrics=new Set(state.tableMetrics[DATOS.tipo]||[]);
  /* Si la persona dejó una vista abierta en esta cuenta, se abre esa; si no,
     la de fábrica. Nada se guarda solo: si nunca guardó, siempre la de
     fábrica. */
  vistaAbierta=null;
  const ultima=VISTAS_GUARDADAS.ultima[claveDeVista()];
  const guardada=ultima && VISTAS_GUARDADAS.vistas.find(v=>v.id===ultima && v.cliente===DATOS.cliente && v.plataforma===id);
  if(guardada) aplicarVista(guardada);
  pintarVistas();
  cargarDatos();
  if(window.PanelEmisarios) window.PanelEmisarios.filtrosAplicados();
}

function renderPlatformHeader() {
  const p=currentPlatform(); const cuenta=(DATOS.cuentasCliente||[]).find(x=>x.id===state.platform); document.querySelector("#platform-title").textContent=cuenta?cuenta.titulo:p.title; { const e=document.querySelector("#platform-eyebrow"); if(e) e.textContent=`${(DATOS.nombreCliente||"").toUpperCase()} · PERFORMANCE`.replace(/^ · /,""); } if(window.PanelEmisarios) window.PanelEmisarios.rutaDelPanel(); document.querySelector("#platform-description").textContent=p.description;
  document.querySelectorAll("[data-platform]").forEach(b=>b.classList.toggle("active",b.dataset.platform===state.platform));
  document.querySelector("#campaign-filter-wrap").classList.toggle("hidden",!p.paid); document.querySelector("#objective-row").classList.toggle("hidden",!p.paid); document.querySelector(".performance-panel").classList.toggle("hidden",!p.paid);
  document.querySelector("#network-filter-wrap").classList.add("hidden");
}

function renderObjectives() {
  /* Los objetivos dejan de ser un rótulo: son un filtro. Se ofrecen los de las
     campañas tildadas arriba, más «Todos», y al elegir uno se repinta el panel
     entero en el acto, sin volver a consultar a Windsor. */
  const deLasCampanias=[...new Set(DATOS.campanias.filter(c=>state.selectedCampaigns.has(c[0])).map(c=>c[2]))];
  if(!deLasCampanias.includes(state.objective)) state.objective=TODOS_LOS_OBJETIVOS;
  const opciones=[[TODOS_LOS_OBJETIVOS,"Todos los objetivos"],...deLasCampanias.map(o=>[o,o])];
  document.querySelector("#objective-buttons").innerHTML=opciones
    .map(([id,texto])=>`<button class="objective-button ${id===state.objective?"active":""}" data-objective="${id}">${texto}</button>`).join("");
  /* Igual que las campañas: se elige y lo confirma APLICAR FILTROS. Un solo
     objetivo también se puede elegir; que quedara fijo confundía. */
  document.querySelectorAll("[data-objective]").forEach(b=>b.onclick=()=>{
    state.objective=b.dataset.objective;
    document.querySelectorAll("[data-objective]").forEach(x=>x.classList.toggle("active",x===b));
    marcarFiltrosPendientes();
  });
}
const ESTADOS_CAMPANIA=[["todas","Todas"],["activa","Activas"],["pausada","En pausa"],["eliminada","Eliminadas"]];

function renderCampaigns() {
  const list=DATOS.campanias;
  const filtro=document.querySelector("#campaign-states");
  if(filtro){
    filtro.innerHTML=ESTADOS_CAMPANIA.map(([id,texto])=>{
      const cuantas=id==="todas"?list.length:list.filter(c=>c[3]===id).length;
      return `<button class="estado-chip ${id===state.estadoCampanias?"active":""}" data-estado-campania="${id}" type="button">${texto} <b>${cuantas}</b></button>`;
    }).join("");
    document.querySelectorAll("[data-estado-campania]").forEach(b=>b.onclick=()=>{
      state.estadoCampanias=b.dataset.estadoCampania;
      renderCampaigns(); renderObjectives(); renderKpis(); renderChart(); renderTable(); renderAdditionalModules();
    });
  }

  const visibles=list.filter(c=>state.estadoCampanias==="todas"||c[3]===state.estadoCampanias);
  document.querySelector("#campaign-options").innerHTML=visibles.length
    ? visibles.map(c=>`<label class="campaign-option"><input type="checkbox" value="${c[0]}" ${state.selectedCampaigns.has(c[0])?"checked":""}><span>${punto(c[3])}${c[1]}<small>${c[2]}</small></span></label>`).join("")
    : '<p class="campaign-empty">No hay campañas con ese estado en este período.</p>';
  /* Tildar una campaña no repinta el panel: con muchas campañas eso era un
     recálculo entero por cada clic. Queda pendiente hasta APLICAR FILTROS. */
  document.querySelectorAll("#campaign-options input").forEach(i=>i.onchange=()=>{
    i.checked?state.selectedCampaigns.add(i.value):state.selectedCampaigns.delete(i.value);
    if(!state.selectedCampaigns.size){state.selectedCampaigns.add(i.value);i.checked=true}
    renderCampaigns(); marcarFiltrosPendientes();
  });

  const elegidas=[...campaniasEnJuego()];
  document.querySelector("#campaign-summary").textContent = !list.length ? "Sin campañas"
    : elegidas.length===1 ? elegidas[0] : `${elegidas.length} seleccionadas`;
}
function renderKpis() {
  const lista=currentMetrics(), metrics=kpisVisibles(); const grid=document.querySelector("#kpi-grid");
  grid.innerHTML=metrics.map(metric=>{
    const idx=state.selectedMetrics.indexOf(metric);
    const delta=deltaFor(metric);
    const signo=delta===null?"":delta>=0?"↑":"↓";
    const clase=claseDeCambio(metric,delta);
    const estatico=SIN_SERIE.has(metric);
    return `<button class="kpi-card ${idx>=0?"selected":""} ${estatico?"is-static":""}" draggable="true" ${estatico?`title="Este indicador no tiene serie diaria"`:""} data-metric="${metric}" data-order="${idx>=0?idx+1:""}" style="--series-color:${COLORS[Math.max(0,idx)]}"><span class="kpi-label">${iconoDeMetrica(metric)}${metricLabel(metric)}</span><div class="kpi-value">${fmt(metric,valueFor(metric))}</div>${delta===null?"":`<span class="kpi-delta ${clase}">${signo} ${Math.abs(delta).toFixed(1).replace(".",",")}% vs. comparación</span>`}${lista.length>1?`<span class="kpi-remove" data-remove="${metric}" title="Quitar esta tarjeta">Quitar</span>`:""}</button>`;
  }).join("");

  /* El botón de agregar vive en el encabezado, no en la grilla: una casilla
     vacía por cada hueco ensucia el panel cuando se usa como informe. */
  const volver=document.querySelector("#restablecer-kpi");
  if(volver){
    const p=currentPlatform();
    const fabrica=(p.defaults[state.objective]||p.metrics).slice(0,6);
    volver.hidden=lista.length===fabrica.length && lista.every((m,i)=>m===fabrica[i]);
  }
  /* El botón abre el selector siempre: ahora también sirve para quitar. */
  const agregar=document.querySelector("#agregar-kpi");
  if(agregar) agregar.title=`${lista.length} de ${MAX_KPIS} indicadores elegidos`;

  grid.querySelectorAll(".kpi-card").forEach(card=>card.onclick=e=>{
    if(e.target.dataset.remove){quitarKpi(e.target.dataset.remove);return}
    // Soltar una tarjeta después de arrastrarla no cuenta como un clic.
    if(Date.now()-finArrastre<300)return;
    toggleChartMetric(card.dataset.metric);
  });
  conectarArrastre(grid);
}

/* ── Reordenar las tarjetas arrastrando ──────────────────────────────────
   Mover una tarjeta de lugar es más directo que quitarla y volver a
   agregarla, que era la única forma de cambiar el orden. */
let arrastrada=null, finArrastre=0;
function conectarArrastre(grid){
  grid.querySelectorAll(".kpi-card").forEach(card=>{
    card.ondragstart=e=>{ arrastrada=card.dataset.metric; card.classList.add("arrastrando"); e.dataTransfer.effectAllowed="move"; e.dataTransfer.setData("text/plain",arrastrada); };
    card.ondragend=()=>{ finArrastre=Date.now(); arrastrada=null; grid.querySelectorAll(".kpi-card").forEach(c=>c.classList.remove("arrastrando","encima")); };
    card.ondragover=e=>{ if(!arrastrada||card.dataset.metric===arrastrada)return; e.preventDefault(); e.dataTransfer.dropEffect="move"; card.classList.add("encima"); };
    card.ondragleave=()=>card.classList.remove("encima");
    card.ondrop=e=>{ e.preventDefault(); card.classList.remove("encima"); if(arrastrada) moverKpi(arrastrada,card.dataset.metric); };
  });
}
function moverKpi(origen,destino){
  const lista=listaKpis();
  const i=lista.indexOf(origen), j=lista.indexOf(destino);
  if(i<0||j<0||i===j)return;
  lista.splice(j,0,...lista.splice(i,1));
  guardarKpis(); renderKpis();
}

/* Siempre queda una tarjeta: una grilla vacía no dice nada y deja al gráfico
   sin ningún indicador que dibujar. */
function quitarKpi(metric, repintar=true){
  const lista=listaKpis();
  if(lista.length<=1)return;
  state.kpis[DATOS.tipo]=lista.filter(m=>m!==metric);
  state.selectedMetrics=state.selectedMetrics.filter(m=>m!==metric);
  if(!state.selectedMetrics.length){
    const otro=state.kpis[DATOS.tipo].find(m=>!SIN_SERIE.has(m));
    if(otro) state.selectedMetrics=[otro];
  }
  guardarKpis();
  // El selector repinta una sola vez al final, no con cada casilla.
  if(repintar){ renderKpis(); renderChart(); }
}

/* Elegir indicadores es una sola visita al diálogo: se marcan y se desmarcan
   todos los que hagan falta y el panel de atrás se va actualizando. Antes cada
   indicador obligaba a abrirlo, elegir uno y volver a abrirlo. */
/* Qué indicadores tienen algo que mostrar con el filtro puesto. Se mira el
   dato, no una tabla de compatibilidades: en una campaña de búsqueda el CPV da
   cero porque no hay reproducciones, así que se cae solo de la lista sin que
   nadie tenga que declararlo. */
function indicadoresConDatos() {
  const totales=totalesActuales();
  return new Set(currentPlatform().metrics.filter(m=>{
    const v=totales[m];
    return v !== null && v !== undefined && v !== 0;
  }));
}

let verSinDatos=false, sinDatosAhora=new Set();
function pintarOpcionesKpi() {
  const p=currentPlatform(), elegidos=currentMetrics(), conDatos=indicadoresConDatos();
  sinDatosAhora=new Set(p.metrics.filter(m=>!conDatos.has(m)));
  /* Los que el usuario ya eligió y hoy no tienen dato bajan igual al grupo de
     abajo, pero se pueden desmarcar: si no, quedarían atrapados en su lista. */
  const utiles=p.metrics.filter(m=>conDatos.has(m));
  let vacios=p.metrics.filter(m=>!conDatos.has(m));
  // Si el filtro no deja ninguno con dato, se ofrecen todos antes que nada.
  if(!utiles.length){ sinDatosAhora=new Set(); vacios=[]; }

  const casilla=(m)=>`<label class="kpi-opcion"><input type="checkbox" data-kpi="${m}"> <span>${metricLabel(m)}</span></label>`;
  const lista=(utiles.length?utiles:p.metrics).map(casilla).join("");
  const plegado=vacios.length?`<button type="button" class="kpi-vacios" id="ver-vacios">${verSinDatos?"Ocultar":"Ver"} los ${vacios.length} sin datos con este filtro</button>
      <div id="kpi-sin-datos" ${verSinDatos?"":"hidden"}>${vacios.map(casilla).join("")}</div>`:"";
  document.querySelector("#kpi-dialog-options").innerHTML=lista+plegado;

  const alternar=document.querySelector("#ver-vacios");
  if(alternar) alternar.onclick=()=>{ verSinDatos=!verSinDatos; pintarOpcionesKpi(); };
  document.querySelectorAll("[data-kpi]").forEach(c=>c.onchange=()=>{
    if(c.checked){ if(listaKpis().length<MAX_KPIS){ listaKpis().push(c.dataset.kpi); guardarKpis(); } }
    else quitarKpi(c.dataset.kpi, false);
    renderKpis(); renderChart(); sincronizarOpcionesKpi();
  });
  sincronizarOpcionesKpi();
}

/* Sólo se actualiza el estado de cada casilla, no se rehace la lista: con
   treinta y pico de indicadores, volver a dibujarla mandaba el scroll arriba
   en cada clic. */
function sincronizarOpcionesKpi() {
  const puestos=currentMetrics();
  // Al llegar al tope no se puede sumar otro, y nunca se quita el último.
  const lleno=puestos.length>=MAX_KPIS, ultimo=puestos.length<=1;
  const filtro=state.objective===TODOS_LOS_OBJETIVOS?"":` · con el filtro «${state.objective}»`;
  document.querySelector("#kpi-dialog-cuenta").textContent=`${puestos.length} de ${MAX_KPIS} en pantalla${filtro}`;
  document.querySelectorAll("[data-kpi]").forEach(c=>{
    const puesto=puestos.includes(c.dataset.kpi);
    c.checked=puesto;
    /* Un indicador sin datos con este filtro no se puede sumar: sería agregar
       una tarjeta en cero. Si ya estaba elegido sí se puede sacar. */
    c.disabled=puesto?ultimo:(lleno||sinDatosAhora.has(c.dataset.kpi));
    c.closest(".kpi-opcion").classList.toggle("bloqueada",c.disabled);
  });
}
function openKpiDialog() { verSinDatos=false; pintarOpcionesKpi(); document.querySelector("#kpi-dialog").showModal(); }

function toggleChartMetric(metric){ if(SIN_SERIE.has(metric))return; const i=state.selectedMetrics.indexOf(metric); if(i>=0&&state.selectedMetrics.length>1)state.selectedMetrics.splice(i,1); else if(i<0){if(state.selectedMetrics.length===2)state.selectedMetrics.shift();state.selectedMetrics.push(metric);if(!state.chartTypes[metric])state.chartTypes[metric]="line"} renderKpis();renderChart(); }

/* La serie sale de las filas por fecha. Con granularidad semanal o mensual se
   agrupan esas mismas filas: nunca se inventa un punto que no vino. */
function serieAgrupada(){
  const filas=filasElegidas(DATOS.filas).filter(f=>f.date);
  const cubos=new Map();
  for(const f of filas){
    const fecha=new Date(`${f.date}T12:00:00`);
    let clave=f.date;
    if(state.granularity==="month") clave=f.date.slice(0,7);
    else if(state.granularity==="week"){ const l=new Date(fecha); l.setDate(l.getDate()-((l.getDay()+6)%7)); clave=toISO(l); }
    if(!cubos.has(clave)) cubos.set(clave,[]);
    cubos.get(clave).push(f);
  }
  return [...cubos.entries()].sort((a,b)=>a[0].localeCompare(b[0]));
}
function etiquetaDeCubo(clave){
  if(state.granularity==="month") return new Intl.DateTimeFormat("es-AR",{month:"short",year:"numeric"}).format(new Date(`${clave}-01T12:00:00`));
  return new Intl.DateTimeFormat("es-AR",{day:"2-digit",month:"short"}).format(new Date(`${clave}T12:00:00`));
}
function renderChart(){
  /* Si el filtro escondió una tarjeta, su serie tampoco tiene sentido: se
     reemplaza por la primera visible que sí tenga serie diaria. */
  const visibles=kpisVisibles();
  state.selectedMetrics=state.selectedMetrics.filter(m=>visibles.includes(m));
  if(!state.selectedMetrics.length){
    const otro=visibles.find(m=>!SIN_SERIE.has(m));
    if(otro) state.selectedMetrics=[otro];
  }
  const metrics=state.selectedMetrics;
  if(!metrics.length){
    document.querySelector("#chart-title").textContent="Evolución diaria";
    document.querySelector("#series-controls").innerHTML='<p class="form-note">Ninguno de los indicadores que quedan tiene serie diaria.</p>';
    document.querySelector("#evolution-chart").innerHTML="";
    return;
  } document.querySelector("#chart-title").textContent=`Evolución de ${metrics.map(metricLabel).join(" vs. ")}`;
  document.querySelector("#series-controls").innerHTML=metrics.map((m,i)=>`<label class="series-control" style="--series-color:${COLORS[i]}"><i></i><strong>${metricLabel(m)}</strong><select data-chart-type="${m}"><option value="line" ${state.chartTypes[m]==="line"?"selected":""}>Línea</option><option value="bar" ${state.chartTypes[m]==="bar"?"selected":""}>Barras</option></select><span class="series-values"><input type="checkbox" data-show-values="${m}" ${state.showValues[m]?"checked":""}> Mostrar datos</span></label>`).join("");
  document.querySelectorAll("[data-chart-type]").forEach(s=>s.onchange=()=>{state.chartTypes[s.dataset.chartType]=s.value;renderChart()});
  document.querySelectorAll("[data-show-values]").forEach(i=>i.onchange=()=>{state.showValues[i.dataset.showValues]=i.checked;renderChart()});
  const cubos=serieAgrupada(); const labels=cubos.map(c=>etiquetaDeCubo(c[0])); const svg=document.querySelector("#evolution-chart"), width=Math.max(700,svg.clientWidth||900), height=280, margin={l:68,r:68,t:22,b:48}, iw=width-margin.l-margin.r, ih=height-margin.t-margin.b;
  const values=metrics.map(m=>cubos.map(c=>valueFor(m,c[1]))); const max=values.map(v=>Math.max(...v,1)*1.12); /* Cada punto va en el centro de su banda y no repartido de borde a borde:
     con pocos puntos las barras quedaban pisando los ejes. */
  const paso=iw/labels.length; const x=i=>margin.l+paso*(i+.5); const y=(v,s)=>margin.t+ih-v/max[s]*ih;
  let html=`<rect class="chart-hit" x="${margin.l}" y="${margin.t}" width="${iw}" height="${ih}"/>`;for(let t=0;t<5;t++){const py=margin.t+ih-t*ih/4;html+=`<line class="chart-grid" x1="${margin.l}" y1="${py}" x2="${width-margin.r}" y2="${py}"/>`;metrics.forEach((m,s)=>{if(s===0||s===1&&metrics.length===2)html+=`<text class="chart-axis chart-y-axis" x="${s===0?margin.l-10:width-margin.r+10}" y="${py+4}" text-anchor="${s===0?"end":"start"}">${fmt(m,max[s]*t/4)}</text>`})}
  const step=Math.max(1,Math.ceil(labels.length/8));labels.forEach((l,i)=>{if(i%step===0||i===labels.length-1)html+=`<text class="chart-axis" x="${x(i)}" y="${height-17}" text-anchor="middle">${l}</text>`});
  const cuantasBarras=metrics.filter(m=>state.chartTypes[m]==="bar").length;
  let puestaBarra=0;
  metrics.forEach((m,s)=>{if(state.chartTypes[m]==="bar"){const bw=Math.max(8,Math.min(30,paso*.62/cuantasBarras));const desplazada=puestaBarra++;values[s].forEach((v,i)=>html+=`<rect class="chart-bar" x="${x(i)-bw*cuantasBarras/2+bw*desplazada}" y="${y(v,s)}" width="${bw}" height="${margin.t+ih-y(v,s)}" rx="3" fill="${COLORS[s]}"/>`)}else{html+=`<path class="chart-line" d="${values[s].map((v,i)=>`${i?"L":"M"}${x(i)},${y(v,s)}`).join(" ")}" stroke="${COLORS[s]}"/>`;values[s].forEach((v,i)=>html+=`<circle class="chart-point" cx="${x(i)}" cy="${y(v,s)}" r="4" fill="${COLORS[s]}"/>`)}});
  // Los valores se dibujan al final para que queden por encima de barras y líneas.
  // Se muestran aunque se pisen entre sí: es el usuario el que decide encenderlos.
  let puestaValor=0;
  metrics.forEach((m,s)=>{ const esBarra=state.chartTypes[m]==="bar"; const bw=Math.max(8,Math.min(30,paso*.62/Math.max(1,cuantasBarras))); const desplazada=esBarra?puestaValor++:0;
    if(!state.showValues[m])return;
    values[s].forEach((v,i)=>{ const px=esBarra?x(i)-bw*cuantasBarras/2+bw*desplazada+bw/2:x(i); const py=y(v,s)-(esBarra?6:10);
      html+=`<text class="chart-value" x="${px}" y="${py}" text-anchor="middle" fill="${COLORS[s]}">${fmt(m,v)}</text>`; }); });
  svg.setAttribute("viewBox",`0 0 ${width} ${height}`);svg.innerHTML=html;
  const tooltip=document.querySelector("#chart-tooltip");
  svg.onpointermove=e=>{
    const rect=svg.getBoundingClientRect();
    // El índice se saca de la posición dentro del área del gráfico, repartida
    // entre todos los puntos: sin multiplicar por los tramos, el redondeo sólo
    // devolvía el primero o el último.
    const avance=((e.clientX-rect.left)/rect.width*width-margin.l)/iw;
    const idx=Math.max(0,Math.min(labels.length-1,Math.floor(avance*labels.length)));
    tooltip.innerHTML=`<strong>${labels[idx]}</strong>${metrics.map((m,s)=>`<br><span style="color:${COLORS[s]}">●</span> ${metricLabel(m)}: ${fmt(m,values[s][idx])}`).join("")}`;
    tooltip.hidden=false;
    // La tarjeta se ancla al punto, no al cursor, y queda arriba del valor más
    // alto de ese día. Se frena contra los bordes para no salirse del panel.
    const ex=rect.width/width, ey=rect.height/height;
    const px=x(idx)*ex, py=Math.min(...values.map((v,s)=>y(v[idx],s)))*ey;
    const mitad=tooltip.offsetWidth/2+6;
    tooltip.style.left=`${Math.min(rect.width-mitad,Math.max(mitad,px))}px`;
    tooltip.style.top=`${Math.max(tooltip.offsetHeight+4,py-12)}px`;
  };
  svg.onpointerleave=()=>tooltip.hidden=true;
}

function renderColumnOptions(){ const p=currentPlatform(); const selected=state.tableMetrics[DATOS.tipo]; document.querySelector("#column-options").innerHTML=`<label class="column-option"><input id="select-all-columns" type="checkbox" ${selected.length===p.metrics.length?"checked":""}> Seleccionar todos</label>`+p.metrics.map(m=>`<label class="column-option"><input type="checkbox" data-column="${m}" ${selected.includes(m)?"checked":""}> ${metricLabel(m)}</label>`).join(""); document.querySelector("#select-all-columns").onchange=e=>{state.tableMetrics[DATOS.tipo]=e.target.checked?[...p.metrics]:[];renderColumnOptions();renderTable()};document.querySelectorAll("[data-column]").forEach(i=>i.onchange=()=>{const list=state.tableMetrics[DATOS.tipo];i.checked?list.push(i.dataset.column):state.tableMetrics[DATOS.tipo]=list.filter(m=>m!==i.dataset.column);renderTable()}); }

/* Etiqueta de una fila del desglose. Google devuelve el anuncio como id, no
   como nombre: se muestra como tal en vez de dejar la celda vacía. */
function nombreDeNivel(campo, valor){
  if(valor===null||valor===undefined||valor==="") return "Sin nombre";
  if(campo==="ad_id") return `Anuncio ${valor}`;
  return String(valor);
}
const TITULO_NIVEL = { adset_name:"Conjunto", ad_group_name:"Grupo de anuncios", ad_name:"Anuncio", ad_id:"Anuncio" };
/* TikTok sólo baja hasta el anuncio: la fila se pinta como tal, no como conjunto. */
const CLASE_NIVEL = (campo) => (campo === "ad_name" || campo === "ad_id" ? "ad" : "adset");

/** Filas del desglose que cuelgan de una campaña y, opcionalmente, de un nivel. */
function ramaDe(filas, campania, niveles, valores){
  return filas.filter((f) => f.campaign===campania && valores.every((v,i)=>String(f[niveles[i]]??"")===v));
}

function renderTable(){
  const metrics=state.tableMetrics[DATOS.tipo];
  const head=document.querySelector("#performance-head"), body=document.querySelector("#performance-body");
  const hay=hayComparacion();
  const niveles=DATOS.niveles||[];
  const titulo=["Campaña",...niveles.map(n=>TITULO_NIVEL[n]||n)].join(" / ").toLowerCase().replace(/^c/,"C");
  let h1=`<tr><th class="col-nombre">${titulo}</th>`,h2=`<tr class="subhead"><th class="col-nombre"></th>`;
  metrics.forEach(m=>{
    const open=hay&&state.expandedMetrics.has(m);
    h1+=`<th class="metric-group" colspan="${open?3:1}">${metricLabel(m)}${hay?`<button class="metric-toggle" data-expand-metric="${m}" title="${open?"Ocultar la comparación":"Ver la comparación"}">${open?"←":"→"}</button>`:""}</th>`;
    h2+=`<th class="ini-grupo">Actual</th>${open?"<th>Comparación</th><th>Cambio</th>":""}`;
  });
  head.innerHTML=`${h1}</tr>${h2}</tr>`;
  document.querySelectorAll("[data-expand-metric]").forEach(b=>b.onclick=()=>{state.expandedMetrics.has(b.dataset.expandMetric)?state.expandedMetrics.delete(b.dataset.expandMetric):state.expandedMetrics.add(b.dataset.expandMetric);renderTable()});

  const enJuego=campaniasEnJuego();
  const elegidas=DATOS.campanias.filter(c=>enJuego.has(c[0]));
  if(!elegidas.length){ body.innerHTML=`<tr><td colspan="${metrics.length+1}">Sin campañas en este período.</td></tr>`; return; }

  /* La tabla baja de campaña a conjunto y de conjunto a anuncio. Los totales de
     la campaña salen de la consulta por fecha, para que coincidan con los
     indicadores de arriba; los niveles de abajo, del desglose. */
  const filasTabla=[];
  for(const c of elegidas){
    const nombre=c[0];
    const clave=`camp::${nombre}`;
    filasTabla.push({ clave, etiqueta:c[1], estado:c[3], nivel:"campaign", sangria:0,
      actuales:DATOS.filas.filter(f=>f.campaign===nombre),
      previas:DATOS.filasComparacion.filter(f=>f.campaign===nombre),
      alcance:DATOS.alcanceCampania[nombre] ?? null,
      alcancePrevio:DATOS.alcanceCampaniaComparacion[nombre] ?? null,
      desplegable:niveles.length>0 });
    if(!niveles.length || !state.expandedRows.has(clave)) continue;

    const primeros=[...new Set(ramaDe(DATOS.desglose,nombre,niveles,[]).map(f=>String(f[niveles[0]]??"")))];
    for(const valor of primeros){
      const claveNivel=`${clave}::${valor}`;
      const ramaActual=ramaDe(DATOS.desglose,nombre,niveles,[valor]);
      const ramaPrevia=ramaDe(DATOS.desgloseComparacion,nombre,niveles,[valor]);
      filasTabla.push({ clave:claveNivel, etiqueta:nombreDeNivel(niveles[0],valor), nivel:CLASE_NIVEL(niveles[0]), sangria:1,
        estado: DATOS.nivelesEstado[0] && ramaActual[0] ? estadoDeFila(ramaActual[0], DATOS.nivelesEstado[0]) : null,
        /* Si la rama es una sola fila del desglose (TikTok llega directo al
           anuncio), su alcance ya es el único de esa entidad en el período. */
        alcance:DATOS.alcanceConjunto[`${nombre}::${valor}`] ?? (ramaActual.length===1 && ramaActual[0].reach!=null ? num(ramaActual[0].reach) : null),
        alcancePrevio:DATOS.alcanceConjuntoComparacion[`${nombre}::${valor}`] ?? (ramaPrevia.length===1 && ramaPrevia[0].reach!=null ? num(ramaPrevia[0].reach) : null),
        actuales:ramaActual,
        previas:ramaPrevia,
        desplegable:niveles.length>1 });
      if(niveles.length<2 || !state.expandedRows.has(claveNivel)) continue;

      const segundos=[...new Set(ramaDe(DATOS.desglose,nombre,niveles,[valor]).map(f=>String(f[niveles[1]]??"")))];
      for(const hoja of segundos){
        const ramaHoja=ramaDe(DATOS.desglose,nombre,niveles,[valor,hoja]);
        const previaHoja=ramaDe(DATOS.desgloseComparacion,nombre,niveles,[valor,hoja]);
        filasTabla.push({ clave:`${claveNivel}::${hoja}`, etiqueta:nombreDeNivel(niveles[1],hoja), nivel:"ad", sangria:2,
          estado: DATOS.nivelesEstado[1] && ramaHoja[0] ? estadoDeFila(ramaHoja[0], DATOS.nivelesEstado[1]) : null,
          /* El desglose viene sin fecha, así que el alcance del anuncio ya es
             el único del período: se puede usar tal cual. */
          alcance: ramaHoja.length===1 && ramaHoja[0].reach!=null ? num(ramaHoja[0].reach) : null,
          alcancePrevio: previaHoja.length===1 && previaHoja[0].reach!=null ? num(previaHoja[0].reach) : null,
          actuales:ramaHoja,
          previas:previaHoja,
          desplegable:false });
      }
    }
  }

  body.innerHTML=filasTabla.map(fila=>{
    /* El mismo punto que en el filtro de campañas: verde si sigue corriendo. */
    const nombre=fila.desplegable
      ? `<button class="row-toggle" data-row="${fila.clave}">${state.expandedRows.has(fila.clave)?"⌄":"›"} ${punto(fila.estado)}${fila.etiqueta}</button>`
      : `${punto(fila.estado)}${fila.etiqueta}`;
    let celdas=`<td style="padding-left:${12+fila.sangria*18}px">${nombre}</td>`;
    metrics.forEach(m=>{
      const v=valueFor(m,fila.actuales,fila.alcance ?? null);
      celdas+=`<td class="ini-grupo">${fmt(m,v)}</td>`;
      if(hay&&state.expandedMetrics.has(m)){
        const previo=valueFor(m,fila.previas,fila.alcancePrevio ?? null);
        const cambio=previo?(v/previo-1)*100:null;
        celdas+=`<td>${fmt(m,previo)}</td><td class="${claseDeCambio(m,cambio)}">${cambio===null?"—":`${cambio>=0?"+":"−"}${Math.abs(cambio).toFixed(1).replace(".",",")}%`}</td>`;
      }
    });
    return `<tr class="level-${fila.nivel}">${celdas}</tr>`;
  }).join("");
  document.querySelectorAll("[data-row]").forEach(b=>b.onclick=()=>{state.expandedRows.has(b.dataset.row)?state.expandedRows.delete(b.dataset.row):state.expandedRows.add(b.dataset.row);renderTable()});
}
function moduleTable(title,first,metrics,rows){return `<section class="panel"><div class="panel-heading"><div><p class="eyebrow">GOOGLE ADS</p><h2>${title}</h2></div></div><div class="table-scroll"><table class="module-table"><thead><tr><th>${first}</th>${metrics.map(m=>`<th>${m}</th>`).join("")}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map((v,i)=>`<td>${v}</td>`).join("")}</tr>`).join("")}</tbody></table></div></section>`}
/* ── Desgloses de Google ─────────────────────────────────────────────────
   Palabras clave, términos de búsqueda, ciudades y provincias. Cada tabla se
   ordena haciendo clic en su encabezado y se pagina, porque los términos de
   búsqueda pasan de cinco mil filas y mostrarlos todos no ayuda a nadie.
   Debajo de las geográficas va un gráfico de barras con dos métricas a elegir. */

const COLUMNAS_EXTRA = [
  { id: "nombre", tipo: "texto" },
  { id: "clicks", titulo: "Clics", tipo: "num" },
  { id: "impressions", titulo: "Impresiones", tipo: "num" },
  { id: "ctr", titulo: "CTR", tipo: "num" },
  { id: "spend", titulo: "Inversión", tipo: "num" },
  { id: "conversions", titulo: "Conversiones", tipo: "num" },
  { id: "cpa", titulo: "Costo / conv.", tipo: "num" },
];
const METRICAS_GRAFICO = ["clicks", "impressions", "spend", "conversions"];
const CON_GRAFICO = new Set(["ciudades", "provincias"]);
const POR_PAGINA = [10, 25, 50, 100];
/* El nombre de una ciudad ilegible no sirve para un reporte, así que el tamaño
   del texto del gráfico lo elige quien lo mira. 1 es el tamaño de siempre. */
const ESCALAS_TEXTO = [0.85, 1, 1.2, 1.45, 1.75, 2.1];

/* Cada tabla recuerda su orden y su página por separado. */
/* Las tablas que informan el estado de cada fila —hoy las palabras clave—
   se pueden filtrar por estado, igual que las campañas y como se hace en la
   propia plataforma. */
const ESTADOS_EXTRA=[["todas","Todas"],["activa","Habilitadas"],["pausada","En pausa"],["eliminada","Eliminadas"]];
const estadoExtra = {};
function ajustesDe(id) {
  if (!estadoExtra[id]) estadoExtra[id] = { orden: "spend", desc: true, porPagina: 10, pagina: 1, m1: "clicks", m2: "conversions", valores: {}, escala: 1, estado: "todas" };
  return estadoExtra[id];
}

function filasDeExtra(extra) {
  return extra.filas
    .map((f) => {
      const clicks = num(f.clicks), impressions = num(f.impressions);
      const spend = num(f.spend), conversions = num(f.conversions);
      return {
        nombre: f[extra.campo] || "—",
        estado: extra.estado ? estadoEfectivo(f, extra.estado, extra.estadoPadre) : null,
        clicks, impressions, spend, conversions,
        ctr: impressions ? (clicks / impressions) * 100 : 0,
        cpa: conversions ? spend / conversions : null,
      };
    })
    .filter((f) => f.clicks || f.impressions || f.spend);
}

function ordenar(filas, ajustes) {
  const col = COLUMNAS_EXTRA.find((c) => c.id === ajustes.orden) || COLUMNAS_EXTRA[0];
  const signo = ajustes.desc ? -1 : 1;
  return [...filas].sort((a, b) => {
    if (col.tipo === "texto") return signo * String(a.nombre).localeCompare(String(b.nombre), "es");
    // Las celdas sin dato van siempre al final, se ordene como se ordene.
    const x = a[col.id], y = b[col.id];
    if (x === null) return 1;
    if (y === null) return -1;
    return signo * (x - y);
  });
}

function formatoDe(id) {
  return id === "spend" ? "spend" : id === "cpa" ? "cpa" : id === "ctr" ? "ctr" : id;
}

function tablaExtra(extra) {
  const ajustes = ajustesDe(extra.id);
  const todas = filasDeExtra(extra);
  const filas = ordenar(extra.estado && ajustes.estado !== "todas" ? todas.filter((f) => f.estado === ajustes.estado) : todas, ajustes);
  /* Sin filas de origen no hay tabla. Si las hay pero el filtro no deja
     ninguna, la tabla se queda con sus chips: si no, el panel desaparecería y
     no habría forma de volver atrás. */
  if (!todas.length) return "";
  const paginas = Math.max(1, Math.ceil(filas.length / ajustes.porPagina));
  if (ajustes.pagina > paginas) ajustes.pagina = paginas;
  const desde = (ajustes.pagina - 1) * ajustes.porPagina;
  const visibles = filas.slice(desde, desde + ajustes.porPagina);

  const flecha = (id) => (ajustes.orden === id ? (ajustes.desc ? " ↓" : " ↑") : "");
  const cabecera = COLUMNAS_EXTRA.map((c) =>
    `<th><button class="orden-col${ajustes.orden === c.id ? " activa" : ""}" data-orden="${extra.id}:${c.id}" type="button">${c.id === "nombre" ? extra.columna : c.titulo}${flecha(c.id)}</button></th>`).join("");

  const cuerpo = !filas.length
    ? `<tr><td colspan="${COLUMNAS_EXTRA.length}">No hay filas con ese estado en este período.</td></tr>`
    : visibles.map((f) => `<tr>
      <td>${punto(f.estado)}${f.nombre}</td>
      ${COLUMNAS_EXTRA.slice(1).map((c) => `<td>${f[c.id] === null ? "—" : fmt(formatoDe(c.id), f[c.id])}</td>`).join("")}
    </tr>`).join("");

  const nf = new Intl.NumberFormat("es-AR");
  const pie = !filas.length ? "" : `<div class="paginado">
      <label>Ver <select data-por-pagina="${extra.id}">${POR_PAGINA.map((n) => `<option value="${n}" ${n === ajustes.porPagina ? "selected" : ""}>${n}</option>`).join("")}</select> por página</label>
      <span>${nf.format(desde + 1)} a ${nf.format(desde + visibles.length)} de ${nf.format(filas.length)}</span>
      <span class="paginado-botones">
        <button data-pagina="${extra.id}:1" type="button" ${ajustes.pagina === 1 ? "disabled" : ""}>«</button>
        <button data-pagina="${extra.id}:${ajustes.pagina - 1}" type="button" ${ajustes.pagina === 1 ? "disabled" : ""}>‹</button>
        <b>${ajustes.pagina} / ${paginas}</b>
        <button data-pagina="${extra.id}:${ajustes.pagina + 1}" type="button" ${ajustes.pagina === paginas ? "disabled" : ""}>›</button>
        <button data-pagina="${extra.id}:${paginas}" type="button" ${ajustes.pagina === paginas ? "disabled" : ""}>»</button>
      </span>
    </div>`;

  const grafico = CON_GRAFICO.has(extra.id) ? bloqueGrafico(extra, ajustes) : "";

  /* Los conteos salen de todas las filas, no de las filtradas: si no, el chip
     elegido mostraría su propio total y los demás quedarían en cero. */
  const chips = extra.estado ? `<div class="estados-extra">${ESTADOS_EXTRA.map(([id, texto]) => {
      const cuantas = id === "todas" ? todas.length : todas.filter((f) => f.estado === id).length;
      return `<button class="estado-chip ${id === ajustes.estado ? "active" : ""}" data-estado-extra="${extra.id}:${id}" type="button">${texto} <b>${cuantas}</b></button>`;
    }).join("")}</div>` : "";

  return `<section class="panel"><div class="panel-heading"><div><p class="eyebrow">GOOGLE ADS</p><h2>${extra.titulo}</h2></div>${chips}</div>
    <div class="table-scroll"><table class="module-table extra-table"><thead><tr>${cabecera}</tr></thead><tbody>${cuerpo}</tbody></table></div>
    ${pie}${grafico}</section>`;
}

/* El gráfico sigue a la tabla: dibuja las filas de la página que se está
   viendo y con el orden elegido, así lo de arriba y lo de abajo coinciden. */
function bloqueGrafico(extra, ajustes) {
  const opciones = (sel, cual) => METRICAS_GRAFICO
    .map((m) => `<option value="${m}" ${m === sel ? "selected" : ""}>${metricLabel(m)}</option>`).join("") +
    (cual === 2 ? `<option value="" ${sel ? "" : "selected"}>Ninguna</option>` : "");
  const serie = (cual, sel) => `<label><i style="background:${COLORS[cual - 1]}"></i>M\u00e9trica ${cual}
      <select data-metrica="${extra.id}:${cual}">${opciones(sel, cual)}</select>
      ${sel ? `<span class="series-values"><input type="checkbox" data-valores="${extra.id}:${sel}" ${ajustes.valores[sel] ? "checked" : ""}> Mostrar datos</span>` : ""}
    </label>`;
  const i = ESCALAS_TEXTO.indexOf(ajustes.escala);
  const tamano = `<span class="texto-escala">Tama\u00f1o del texto
      <button data-texto="${extra.id}:-" type="button" aria-label="Reducir el texto" ${i <= 0 ? "disabled" : ""}>\u2212</button>
      <b>${Math.round(ajustes.escala * 100)}%</b>
      <button data-texto="${extra.id}:+" type="button" aria-label="Agrandar el texto" ${i >= ESCALAS_TEXTO.length - 1 ? "disabled" : ""}>+</button>
    </span>`;
  return `<div class="grafico-extra">
      <div class="series-control-row">${serie(1, ajustes.m1)}${serie(2, ajustes.m2)}${tamano}</div>
      <svg id="grafico-${extra.id}" class="barras-extra" role="img" aria-label="${extra.titulo}"></svg>
    </div>`;
}

function pintarBarras(extra) {
  const svg = document.querySelector(`#grafico-${extra.id}`);
  if (!svg) return;
  const ajustes = ajustesDe(extra.id);
  const filas = ordenar(filasDeExtra(extra), ajustes);
  const desde = (ajustes.pagina - 1) * ajustes.porPagina;
  const datos = filas.slice(desde, desde + ajustes.porPagina);
  const metricas = [ajustes.m1, ajustes.m2].filter(Boolean);
  if (!datos.length || !metricas.length) { svg.innerHTML = ""; return; }

  /* Todo lo que ocupa texto crece con la escala: la tipografía, los márgenes que
     la alojan y el alto del gráfico. Con 1 queda igual que siempre. */
  const esc = ajustes.escala;
  const fs = 11 * esc, fsValor = 10 * esc;
  const ancho = Math.max(640, svg.clientWidth || 900);
  const margen = { l: 66 * esc, r: metricas.length > 1 ? 66 * esc : 20, t: 16, b: 85 * esc };
  const alto = Math.round(margen.t + 170 + margen.b);
  const iw = ancho - margen.l - margen.r, ih = alto - margen.t - margen.b;
  /* Cada métrica con su propio eje: clics e impresiones no comparten escala. */
  const topes = metricas.map((m) => Math.max(...datos.map((d) => d[m] || 0), 1) * 1.12);
  const paso = iw / datos.length;
  const bw = Math.min(26, (paso * 0.62) / metricas.length);
  /* Los nombres van en diagonal: lo que entra depende del alto reservado abajo
     y del cuerpo de la letra, no de un número fijo de caracteres. */
  const largo = Math.max(6, Math.floor((margen.b - fs - 14) / Math.sin(0.663) / (fs * 0.55)));

  let html = "";
  for (let t = 0; t < 5; t++) {
    const py = margen.t + ih - (t * ih) / 4;
    html += `<line class="chart-grid" x1="${margen.l}" y1="${py}" x2="${ancho - margen.r}" y2="${py}"/>`;
    metricas.forEach((m, i) => {
      html += `<text class="chart-axis" style="font-size:${fs}px" x="${i === 0 ? margen.l - 9 : ancho - margen.r + 9}" y="${py + fs * 0.36}" text-anchor="${i === 0 ? "end" : "start"}">${fmt(formatoDe(m), (topes[i] * t) / 4)}</text>`;
    });
  }
  let etiquetas = "";
  datos.forEach((d, i) => {
    const centro = margen.l + paso * (i + 0.5);
    metricas.forEach((m, s) => {
      const v = d[m] || 0;
      const h = (v / topes[s]) * ih;
      const x = centro - (bw * metricas.length) / 2 + bw * s;
      html += `<rect class="chart-bar" x="${x}" y="${margen.t + ih - h}" width="${bw}" height="${h}" rx="3" fill="${COLORS[s]}"><title>${d.nombre} \u00b7 ${metricLabel(m)}: ${fmt(formatoDe(m), v)}</title></rect>`;
      // Los valores van al final del dibujo para que no los tape ninguna barra.
      if (ajustes.valores[m]) etiquetas += `<text class="chart-value" style="font-size:${fsValor}px" x="${x + bw / 2}" y="${margen.t + ih - h - 5}" text-anchor="middle" fill="${COLORS[s]}">${fmt(formatoDe(m), v)}</text>`;
    });
    const corto = d.nombre.length > largo ? `${d.nombre.slice(0, largo - 1)}\u2026` : d.nombre;
    html += `<text class="chart-axis" style="font-size:${fs}px" transform="translate(${centro},${margen.t + ih + fs + 8}) rotate(-38)" text-anchor="end">${corto}</text>`;
  });
  svg.setAttribute("viewBox", `0 0 ${ancho} ${alto}`);
  svg.innerHTML = html + etiquetas;
}

function conectarExtras() {
  document.querySelectorAll("[data-orden]").forEach((b) => (b.onclick = () => {
    const [id, col] = b.dataset.orden.split(":");
    const a = ajustesDe(id);
    // Volver a tocar la misma columna da vuelta el orden; otra columna arranca
    // de mayor a menor si son números y de la A a la Z si es texto.
    if (a.orden === col) a.desc = !a.desc;
    else { a.orden = col; a.desc = col !== "nombre"; }
    a.pagina = 1;
    renderAdditionalModules();
  }));
  document.querySelectorAll("[data-estado-extra]").forEach((b) => (b.onclick = () => {
    const [id, estado] = b.dataset.estadoExtra.split(":");
    const a = ajustesDe(id);
    a.estado = estado;
    a.pagina = 1;
    renderAdditionalModules();
  }));
  document.querySelectorAll("[data-por-pagina]").forEach((sel) => (sel.onchange = () => {
    const a = ajustesDe(sel.dataset.porPagina);
    a.porPagina = Number(sel.value);
    a.pagina = 1;
    renderAdditionalModules();
  }));
  document.querySelectorAll("[data-pagina]").forEach((b) => (b.onclick = () => {
    const [id, pagina] = b.dataset.pagina.split(":");
    ajustesDe(id).pagina = Number(pagina);
    renderAdditionalModules();
  }));
  document.querySelectorAll("[data-metrica]").forEach((sel) => (sel.onchange = () => {
    const [id, cual] = sel.dataset.metrica.split(":");
    ajustesDe(id)[cual === "1" ? "m1" : "m2"] = sel.value;
    renderAdditionalModules();
  }));
  document.querySelectorAll("[data-valores]").forEach((casilla) => (casilla.onchange = () => {
    const [id, metrica] = casilla.dataset.valores.split(":");
    ajustesDe(id).valores[metrica] = casilla.checked;
    renderAdditionalModules();
  }));
  document.querySelectorAll("[data-texto]").forEach((b) => (b.onclick = () => {
    const [id, signo] = b.dataset.texto.split(":");
    const a = ajustesDe(id);
    const i = ESCALAS_TEXTO.indexOf(a.escala) + (signo === "+" ? 1 : -1);
    if (i < 0 || i >= ESCALAS_TEXTO.length) return;
    a.escala = ESCALAS_TEXTO[i];
    renderAdditionalModules();
  }));
  DATOS.extras.filter((e) => CON_GRAFICO.has(e.id)).forEach(pintarBarras);
}

/* Lo publicado en el período: sale de la consulta de contenido de Instagram
   Insights. Las historias no están porque la API sólo las guarda 24 horas. */
const COLUMNAS_CONTENIDO = [
  ["media_reach", "Alcance", "number"],
  ["media_views", "Visualizaciones", "number"],
  ["media_engagement", "Interacciones", "number"],
  ["media_like_count", "Me gusta", "number"],
  ["media_comments_count", "Comentarios", "number"],
  ["media_shares", "Compartidos", "number"],
  ["media_saved", "Guardados", "number"],
];
const TIPO_CONTENIDO = { REEL: "Reel", REELS: "Reel", FEED: "Feed", STORY: "Historia", AD: "Aviso", IGTV: "IGTV" };

function tablaContenido(){
  const filas=[...(DATOS.contenido||[])].sort((a,b)=>String(b.timestamp||"").localeCompare(String(a.timestamp||"")));
  if(!filas.length) return `<section class="panel"><p class="eyebrow">CONTENIDO</p><p class="form-note">No hay publicaciones en el período elegido.</p></section>`;
  const nf=new Intl.NumberFormat("es-AR",{maximumFractionDigits:0});
  const cuerpo=filas.map((m)=>{
    const tipo=TIPO_CONTENIDO[String(m.media_product_type||"").toUpperCase()]||String(m.media_product_type||"—");
    const fecha=m.timestamp?new Intl.DateTimeFormat("es-AR",{day:"2-digit",month:"2-digit",year:"numeric"}).format(new Date(m.timestamp)):"—";
    const nombre=m.media_permalink?`<a href="${m.media_permalink}" target="_blank" rel="noreferrer noopener">${fecha}</a>`:fecha;
    return `<tr><td>${nombre}</td><td>${tipo}</td>${COLUMNAS_CONTENIDO.map(([c])=>`<td>${m[c]===null||m[c]===undefined?"—":nf.format(Number(m[c])||0)}</td>`).join("")}</tr>`;
  }).join("");
  return `<section class="panel"><div class="panel-heading"><div><p class="eyebrow">INSTAGRAM</p><h2>Contenido publicado</h2></div></div>
    <div class="table-scroll"><table class="module-table extra-table"><thead><tr><th>Publicación</th><th>Tipo</th>${COLUMNAS_CONTENIDO.map(([,t])=>`<th>${t}</th>`).join("")}</tr></thead><tbody>${cuerpo}</tbody></table></div></section>`;
}

function renderAdditionalModules(){
  const root=document.querySelector("#additional-modules");
  if(DATOS.extras.length){ root.innerHTML=DATOS.extras.map(tablaExtra).join(""); conectarExtras(); return; }
  /* Lo que todavía no está conectado se dice, no se rellena con ejemplos. */
  if(DATOS.tipo==="instagram"){ root.innerHTML=tablaContenido(); return; }
  const pendientes={
    tiktokOrganic:"TikTok orgánico todavía no está conectado en Windsor.",
  };
  const texto=pendientes[DATOS.tipo];
  root.innerHTML=texto?`<section class="panel"><p class="eyebrow">PENDIENTE DE CONEXIÓN</p><p class="form-note">${texto}</p></section>`:"";
}
function renderReelsTable(){const reels=[["Reel lanzamiento","1 sep 2026","12.400","4,8%","18.200","310","1.540","48"],["Test drive","6 sep 2026","10.900","5,2%","15.600","280","1.320","39"],["Detalle interior","12 sep 2026","8.700","4,1%","11.900","190","980","27"]];const labels=["Contenido","Fecha","Alcance","Engagement","Visualizaciones","Guardados","Me gusta","Comentarios"];return `<section class="panel"><p class="eyebrow">CONTENIDO</p><h2>Reels publicados</h2><div class="table-scroll"><table class="module-table reels-table"><tbody><tr><th>Vista previa</th>${reels.map(()=>`<td><div class="placeholder-media">Sin imagen</div></td>`).join("")}</tr>${labels.map((l,i)=>`<tr><th>${l}</th>${reels.map(r=>`<td>${r[i]}</td>`).join("")}</tr>`).join("")}</tbody></table></div></section>`}

/* ── Vistas guardadas ────────────────────────────────────────────────────
   Una vista es la organización del panel para un cliente y una plataforma:
   qué tarjetas, en qué orden, qué hay en el gráfico y con qué filtros. Se
   guarda contra el usuario, del lado del servidor, y sólo cuando la persona
   lo pide: nada se guarda solo, así queda explícito que quiso dejarlo así. */

const NOMBRE_RAPIDO = { today:"Hoy", yesterday:"Ayer", last7:"Últimos 7 días", last14:"Últimos 14 días", thisMonth:"Este mes", lastMonth:"El mes pasado" };
let VISTAS_GUARDADAS = { vistas: [], ultima: {} };
let vistaAbierta = null;
const claveDeVista = () => `${DATOS.cliente}:${state.platform}`;
const vistasDeAqui = () => VISTAS_GUARDADAS.vistas.filter(v => v.cliente === DATOS.cliente && v.plataforma === state.platform);

/* El período se guarda como regla y no como fechas cuando salió de un botón
   rápido: si no, «Este mes» quedaría clavado en el mes en que se guardó. */
function capturarVista() {
  return {
    version: 1,
    objetivo: state.objective,
    estadoCampanias: state.estadoCampanias,
    campanias: [...state.selectedCampaigns],
    rapido: state.rapido || null,
    desde: state.rapido ? null : state.start,
    hasta: state.rapido ? null : state.end,
    incluyeHoy: incluyeHoy(),
    comparacion: state.comparison,
    compararDesde: document.querySelector("#compare-start").value,
    compararHasta: document.querySelector("#compare-end").value,
    granularidad: state.granularity,
    kpis: [...listaKpis()],
    serie: [...state.selectedMetrics],
    /* Los tipos de gráfico son de toda la sesión; en la vista sólo se guardan
       los de esta plataforma. */
    tipos: Object.fromEntries(Object.entries(state.chartTypes).filter(([m]) => currentPlatform().metrics.includes(m))),
    valores: { ...state.showValues },
    columnas: [...(state.tableMetrics[DATOS.tipo] || [])],
    expandidas: [...state.expandedMetrics],
    extras: JSON.parse(JSON.stringify(estadoExtra)),
  };
}

/* Al aplicar se ignora lo que ya no existe: un indicador que sacamos del
   código o una campaña que dejó de estar. Un indicador que hoy da cero no es
   ese caso y se muestra igual, que es lo que se guardó. */
function aplicarVista(v) {
  if (!v) return false;
  const e = v.estado || {};
  const p = platforms[DATOS.tipo] || platforms.meta;
  const validos = (lista) => (Array.isArray(lista) ? lista.filter(m => p.metrics.includes(m)) : []);

  const kpis = validos(e.kpis);
  if (kpis.length) state.kpis[DATOS.tipo] = kpis;
  const serie = validos(e.serie);
  if (serie.length) state.selectedMetrics = serie.slice(0, 2);
  if (e.tipos) state.chartTypes = { ...state.chartTypes, ...e.tipos };
  state.showValues = e.valores || {};
  const columnas = validos(e.columnas);
  state.tableMetrics[DATOS.tipo] = columnas;
  state.expandedMetrics = new Set(validos(e.expandidas));
  if (e.granularidad) state.granularity = e.granularidad;
  if (e.extras) for (const [id, ajustes] of Object.entries(e.extras)) estadoExtra[id] = { ...ajustesDe(id), ...ajustes };

  state.objective = e.objetivo || TODOS_LOS_OBJETIVOS;
  state.estadoCampanias = e.estadoCampanias || "todas";
  if (Array.isArray(e.campanias) && e.campanias.length) state.selectedCampaigns = new Set(e.campanias);

  const casilla = document.querySelector("#include-today");
  if (casilla && typeof e.incluyeHoy === "boolean") casilla.checked = e.incluyeHoy;
  if (e.rapido && NOMBRE_RAPIDO[e.rapido]) aplicarRapido(e.rapido);
  else if (e.desde && e.hasta) {
    state.rapido = null;
    state.start = e.desde; state.end = e.hasta;
    document.querySelectorAll("[data-quick-period]").forEach(x => x.classList.remove("active"));
    syncPeriodControls();
  }
  if (e.comparacion) {
    state.comparison = e.comparacion;
    const radio = document.querySelector(`input[name="comparison"][value="${e.comparacion}"]`);
    if (radio) { radio.checked = true; document.querySelector("#comparison-summary").textContent = radio.parentElement.textContent.trim(); }
    if (e.compararDesde) document.querySelector("#compare-start").value = e.compararDesde;
    if (e.compararHasta) document.querySelector("#compare-end").value = e.compararHasta;
  }
  vistaAbierta = v.id;
  return true;
}

/* Un nombre que describa lo que se está viendo, para no tener que inventarlo:
   «Búsqueda · Este mes». Se puede editar antes de guardar. */
function nombreSugerido() {
  const partes = [];
  partes.push(state.objective && state.objective !== TODOS_LOS_OBJETIVOS ? state.objective : "Todos los objetivos");
  partes.push(state.rapido ? NOMBRE_RAPIDO[state.rapido] : `${dateText(state.start)} a ${dateText(state.end)}`);
  const base = partes.join(" · ");
  /* Dos vistas con el mismo nombre no se distinguen en la lista, así que el
     sugerido se numera si ya existe. */
  const usados = new Set(vistasDeAqui().map((v) => v.nombre));
  if (!usados.has(base)) return base;
  let n = 2;
  while (usados.has(`${base} (${n})`)) n++;
  return `${base} (${n})`;
}

/* ¿La pantalla sigue igual a como se guardó? Se compara el estado capturado
   contra el guardado, ignorando lo que cambia solo: la página en la que quedó
   cada tabla, el orden de las campañas y las fechas de comparación cuando se
   calculan solas. */
function estable(x) {
  if (Array.isArray(x)) return `[${x.map(estable).join(",")}]`;
  if (x && typeof x === "object")
    return `{${Object.keys(x).sort().map((k) => `${k}:${estable(x[k])}`).join(",")}}`;
  return JSON.stringify(x ?? null);
}
function comparable(estado) {
  const c = JSON.parse(JSON.stringify(estado || {}));
  if (c.extras) for (const k of Object.keys(c.extras)) delete c.extras[k].pagina;
  if (Array.isArray(c.campanias)) c.campanias = [...c.campanias].sort();
  if (c.comparacion !== "custom") { delete c.compararDesde; delete c.compararHasta; }
  return estable(c);
}
const vistaSinCambios = (v) => !!v && comparable(capturarVista()) === comparable(v.estado);

async function pedirVistas(opciones) {
  const r = await fetch("/api/vistas", { credentials: "same-origin", ...opciones });
  const cuerpo = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(cuerpo.error || `El servidor respondió ${r.status}.`);
  return cuerpo;
}

async function cargarVistas() {
  try { VISTAS_GUARDADAS = await pedirVistas({}); } catch (e) { VISTAS_GUARDADAS = { vistas: [], ultima: {} }; }
  pintarVistas();
}

function pintarVistas() {
  const lista=vistasDeAqui();
  const trigger=document.querySelector("#views-summary");
  if(!trigger) return;
  const actual=lista.find(v=>v.id===vistaAbierta);
  trigger.textContent=actual?actual.nombre:"Predeterminada";
  /* Una sola vista a la vez: es una lista de selección, no casillas. */
  const opcion=(id,texto)=>`<label class="view-option${id===(actual?actual.id:"")?" activa":""}">
      <input type="radio" name="vista-elegida" value="${id}" ${id===(actual?actual.id:"")?"checked":""}> <span>${texto}</span>
    </label>`;
  document.querySelector("#views-list").innerHTML=
    opcion("","Predeterminada")+lista.map(v=>opcion(v.id,v.nombre)).join("");
  /* Actualizar y eliminar sólo tienen sentido parado en una vista guardada, y
     actualizar sólo si además hay algo distinto que guardar. */
  const actualizar=document.querySelector("#view-update");
  actualizar.hidden=!actual;
  const igual=vistaSinCambios(actual);
  actualizar.disabled=igual;
  actualizar.title=igual?"No hay cambios para guardar en esta vista":"Sobrescribe la vista con lo que ves ahora";
  document.querySelector("#view-delete").hidden=!actual;
  document.querySelectorAll('input[name="vista-elegida"]').forEach(r=>r.onchange=()=>abrirVista(r.value));
}

function abrirVista(id) {
  document.querySelector("#views-popover").hidden=true;
  if(!id){ volverAPredeterminada(); return; }
  const v=VISTAS_GUARDADAS.vistas.find(x=>x.id===id);
  if(!aplicarVista(v)) return;
  recordarUltima(id);
  pintarVistas();
  cargarDatos();
  if(window.PanelEmisarios) window.PanelEmisarios.filtrosAplicados();
}

/* Volver a la de fábrica es olvidar la vista abierta y rearmar la plataforma
   desde cero, que es justo lo que hace setPlatform. */
function volverAPredeterminada() {
  vistaAbierta=null;
  delete VISTAS_GUARDADAS.ultima[claveDeVista()];
  recordarUltima(null);
  delete state.kpis[DATOS.tipo];
  setPlatform(state.platform);
}

/* Guardar: con id actualiza la vista abierta, sin id crea una nueva. */
async function guardarVista(id, nombre) {
  try{
    const r=await pedirVistas({ method:"POST", headers:{"content-type":"application/json"},
      body: JSON.stringify({ id, nombre, cliente: DATOS.cliente, plataforma: state.platform, estado: capturarVista() }) });
    VISTAS_GUARDADAS={ vistas:r.vistas, ultima:r.ultima, leidas:true };
    vistaAbierta=r.guardada;
    pintarVistas();
    avisarVista(`Vista «${nombre}» guardada.`);
  }catch(e){ avisarVista(e.message); }
}

function recordarUltima(id) {
  VISTAS_GUARDADAS.ultima[claveDeVista()] = id;
  pedirVistas({ method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ ultima: id, cliente: DATOS.cliente, plataforma: state.platform }) }).catch(() => {});
}

function marcarFiltrosPendientes(consulta=false){ if(consulta) necesitaConsulta=true; if (window.PanelEmisarios) window.PanelEmisarios.filtrosPendientes(); }
function renderAll(){syncPeriodControls();renderPlatformHeader();renderObjectives();renderCampaigns();renderKpis();renderChart();renderColumnOptions();renderTable();renderAdditionalModules();}
function bindPopover(trigger,pop){const t=document.querySelector(trigger),p=document.querySelector(pop);t.onclick=e=>{e.stopPropagation();document.querySelectorAll(".popover").forEach(x=>x.hidden=true);p.hidden=!p.hidden};p.onclick=e=>e.stopPropagation()}

document.querySelectorAll("[data-platform]").forEach(b=>b.onclick=()=>setPlatform(b.dataset.platform));
document.querySelector("#agregar-kpi").onclick=openKpiDialog;
bindPopover("#views-trigger","#views-popover");
/* El estado del botón se recalcula al abrir el menú, que es el único momento
   en que se ve: así no hay que vigilar cada cambio del panel. */
{
  const trigger=document.querySelector("#views-trigger");
  const abrir=trigger.onclick;
  trigger.onclick=(e)=>{ pintarVistas(); abrir(e); };
}
document.querySelector("#view-update").onclick=()=>{
  const actual=vistasDeAqui().find(v=>v.id===vistaAbierta);
  if(!actual) return;
  document.querySelector("#views-popover").hidden=true;
  guardarVista(actual.id, actual.nombre);
};
document.querySelector("#view-save").onclick=()=>{
  document.querySelector("#view-name").value=nombreSugerido();
  document.querySelector("#view-dialog-nota").textContent="Se guarda la organización del panel y los filtros de esta pantalla.";
  document.querySelector("#views-popover").hidden=true;
  document.querySelector("#view-dialog").showModal();
};
document.querySelector("#view-cancel").onclick=()=>document.querySelector("#view-dialog").close();
document.querySelector("#view-confirm").onclick=async()=>{
  const nombre=document.querySelector("#view-name").value.trim();
  if(!nombre) return;
  document.querySelector("#view-dialog").close();
  await guardarVista(null, nombre);
};
document.querySelector("#view-delete").onclick=()=>{
  const actual=vistasDeAqui().find(v=>v.id===vistaAbierta);
  if(!actual) return;
  document.querySelector("#view-delete-texto").textContent=`¿Seguro que querés eliminar la vista «${actual.nombre}»? No se puede deshacer.`;
  document.querySelector("#view-delete-dialog").showModal();
};
document.querySelector("#view-delete-cancel").onclick=()=>document.querySelector("#view-delete-dialog").close();
document.querySelector("#view-delete-confirm").onclick=async()=>{
  const actual=vistasDeAqui().find(v=>v.id===vistaAbierta);
  document.querySelector("#view-delete-dialog").close();
  if(!actual) return;
  try{
    const r=await fetch(`/api/vistas?id=${encodeURIComponent(actual.id)}`,{ method:"DELETE", credentials:"same-origin" });
    const cuerpo=await r.json().catch(()=>({}));
    if(!r.ok) throw new Error(cuerpo.error||`El servidor respondió ${r.status}.`);
    VISTAS_GUARDADAS={ vistas:cuerpo.vistas, ultima:cuerpo.ultima, leidas:true };
    vistaAbierta=null;
    pintarVistas();
    avisarVista(`Vista «${actual.nombre}» eliminada.`);
  }catch(e){ avisarVista(e.message); }
};
const avisarVista=(texto)=>{ if(window.PanelEmisarios&&window.PanelEmisarios.aviso) window.PanelEmisarios.aviso(texto); };
document.querySelector("#restablecer-kpi").onclick=restablecerKpis;
bindPopover("#period-trigger","#period-popover");bindPopover("#campaign-trigger","#campaign-popover");bindPopover("#comparison-trigger","#comparison-popover");bindPopover("#columns-trigger","#columns-popover");document.addEventListener("click",()=>document.querySelectorAll(".popover").forEach(x=>x.hidden=true));
document.querySelector("#campaign-select-all").onclick=()=>{state.selectedCampaigns=new Set(DATOS.campanias.map(c=>c[0]));renderCampaigns();marcarFiltrosPendientes()};
document.querySelector("#campaign-clear").onclick=()=>{state.selectedCampaigns.clear();renderCampaigns();marcarFiltrosPendientes()};
document.querySelectorAll('input[name="comparison"]').forEach(i=>{const sync=e=>{if(e.target.value!=="custom")syncComparisonDates(e.target.value);elegirComparacion()};i.onchange=sync;i.onclick=sync});
function elegirComparacion(){
  const input=document.querySelector('input[name="comparison"]:checked');
  state.comparison=input.value;
  document.querySelector("#comparison-summary").textContent=input.parentElement.textContent.trim();
  marcarFiltrosPendientes(true);
}
/* Las fechas del período personalizado también cuentan como un cambio. */
["#compare-start","#compare-end"].forEach(sel=>document.querySelector(sel).onchange=()=>{
  const custom=document.querySelector('input[name="comparison"][value="custom"]');
  custom.checked=true; elegirComparacion();
});
document.querySelectorAll("[data-granularity]").forEach(b=>b.onclick=()=>{state.granularity=b.dataset.granularity;document.querySelectorAll("[data-granularity]").forEach(x=>x.classList.toggle("active",x===b));renderChart()});
document.querySelectorAll("[data-quick-period]").forEach(b=>b.onclick=()=>{ aplicarRapido(b.dataset.quickPeriod); });
/* Marcar o desmarcar «Incluir hoy» vuelve a calcular el último período rápido
   elegido: es lo que se está preguntando, si el rango llega a hoy o cierra ayer. */
document.querySelector("#include-today").onchange=()=>{ if(state.rapido) aplicarRapido(state.rapido); };
/* Elegir una fecha a mano deja de ser un período rápido. El menú no se cierra
   porque casi siempre se tocan las dos fechas, una después de la otra. */
["#date-start","#date-end"].forEach(sel=>document.querySelector(sel).onchange=()=>{
  state.rapido=null;
  document.querySelectorAll("[data-quick-period]").forEach(x=>x.classList.remove("active"));
  document.querySelector("#include-today-wrap").classList.add("hidden");
  applyPeriod(false);
});
/* El panel abre con el mes en curso hasta hoy. */
aplicarRapido("thisMonth");
window.onresize=()=>{clearTimeout(window.chartTimer);window.chartTimer=setTimeout(renderChart,100)};
window.DatosEmisarios = {
  cargar: cargarDatos,
  /* Volver a pedir sólo cuando cambió el período o la comparación; si sólo se
     tocaron campañas u objetivos alcanza con repintar lo que ya está. */
  aplicarFiltros: () => {
    if (necesitaConsulta) { necesitaConsulta = false; cargarDatos(); return; }
    /* Campañas y objetivo se resuelven sobre las filas que ya están: repintar
       es instantáneo y no hace falta molestar a Windsor. */
    renderObjectives(); renderCampaigns(); renderKpis(); renderChart(); renderTable(); renderAdditionalModules();
  },
  elegirCliente: async (cliente, primera) => {
    DATOS.cliente = cliente.id;
    DATOS.nombreCliente = cliente.nombre;
    DATOS.cuentasCliente = cliente.cuentas;
    if (!VISTAS_GUARDADAS.leidas) { await cargarVistas(); VISTAS_GUARDADAS.leidas = true; }
    if (primera) setPlatform(primera.id); else cargarDatos();
  },
};
