const COLORS = ["#8752e8", "#000000"];

const metricDefs = {
  spend: ["Inversión", "currency"], impressions: ["Impresiones", "number"], cpm: ["CPM", "currency"], reach: ["Alcance", "number"], frequency: ["Frecuencia", "decimal"],
  conversions: ["Leads / conversiones", "number"], cpa: ["CPL / CPA", "currency"], instagramProfileVisits: ["Visitas al perfil de Instagram", "number"], instagramFollows: ["Seguimientos de Instagram", "number"],
  clicks: ["Clics", "number"], ctr: ["CTR", "percent"], cpc: ["CPC", "currency"], views: ["Visualizaciones", "number"], cpv: ["CPV", "currency"],
  videoViews: ["Reproducciones de video", "number"], paidFollowers: ["Seguidores pagos", "number"], tiktokProfileVisits: ["Visitas al perfil de TikTok", "number"], shares: ["Compartidos", "number"],
  followers: ["Seguidores totales", "number"], newFollowers: ["Nuevos seguidores", "number"], unfollows: ["Dejaron de seguir", "number"], balance: ["Balance de seguidores", "number"], reels: ["Reels publicados", "number"], feedPosts: ["Posteos en el feed", "number"], stories: ["Historias", "number"], interactions: ["Interacciones totales", "number"], saves: ["Guardados", "number"], likes: ["Me gusta", "number"], comments: ["Comentarios", "number"]
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
    metrics: ["clicks","impressions","ctr","cpc","spend","conversions","cpa","views","cpv","cpm"],
    objectives: { search: "Búsqueda", conversions: "Conversiones", video: "Video" },
    defaults: { search: ["clicks","impressions","ctr","cpc","spend","conversions"], conversions: ["conversions","cpa","spend","clicks","ctr","impressions"], video: ["views","cpv","spend","impressions","cpm","clicks"] },
    campaigns: [["google-1","Search · Marca","search",1], ["google-2","Search · Modelos","conversions",.78], ["google-3","YouTube · Lanzamiento","video",.92]]
  },
  tiktok: {
    title: "TikTok Ads", description: "Rendimiento de campañas y videos promocionados en TikTok.", paid: true,
    metrics: ["spend","impressions","cpm","reach","frequency","videoViews","cpv","paidFollowers","tiktokProfileVisits","shares"],
    objectives: { video: "Video", traffic: "Tráfico al perfil", followers: "Seguidores" },
    defaults: { video: ["spend","impressions","videoViews","cpv","reach","frequency"], traffic: ["spend","impressions","tiktokProfileVisits","shares","cpm","frequency"], followers: ["spend","paidFollowers","tiktokProfileVisits","reach","frequency","impressions"] },
    campaigns: [["tiktok-1","TikTok · Lanzamiento SUV","video",1], ["tiktok-2","TikTok · Visitas al perfil","traffic",.74], ["tiktok-3","TikTok · Seguidores","followers",.58]]
  },
  instagram: {
    title: "Instagram orgánico", description: "Audiencia, publicaciones, alcance e interacción orgánica.", paid: false,
    metrics: ["followers","balance","reels","feedPosts","stories","reach","interactions","shares","saves","likes","comments","newFollowers","unfollows"],
    defaults: { organic: ["followers","balance","reels","feedPosts","stories","reach"] }, objectives: { organic: "Orgánico" }, campaigns: []
  },
  tiktokOrganic: {
    title: "TikTok orgánico", description: "Publicaciones, visualizaciones e interacción orgánica en TikTok.", paid: false,
    metrics: ["followers","balance","videoViews","reach","interactions","shares","likes","comments","saves"],
    defaults: { organic: ["followers","balance","videoViews","reach","interactions","shares"] }, objectives: { organic: "Orgánico" }, campaigns: []
  }
};

const state = {
  platform: "meta", objective: "leads", start: "2026-09-01", end: "2026-09-16", comparison: "previous", granularity: "day",
  selectedCampaigns: new Set(["meta-1","meta-2","meta-3"]), selectedMetrics: ["conversions","cpa"], chartTypes: { conversions: "bar", cpa: "line" },
  customKpis: { meta: [], google: [], tiktok: [], instagram: [], tiktokOrganic: [] },
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
  meta: { spend:"spend", impressions:"impressions", clicks:"clicks", conversions:"actions_offsite_conversion_fb_pixel_custom", instagramProfileVisits:"instagram_profile_visits", instagramFollows:"instagram_profile_follow" },
  google: { spend:"spend", impressions:"impressions", clicks:"clicks", conversions:"conversions", views:"video_trueview_views" },
  tiktok: { spend:"spend", impressions:"impressions", clicks:"clicks", videoViews:"play_duration_6s", paidFollowers:"follows", tiktokProfileVisits:"profile_visits", shares:"shares" },
  instagram: { followers:"profile_followers_count", feedPosts:"profile_media_count" },
  tiktokOrganic: {},
};
/* Estos no se suman: son una foto del momento de la consulta. */
const FOTO = new Set(["followers", "feedPosts"]);

const OBJETIVOS_META = { OUTCOME_LEADS:"Leads", OUTCOME_TRAFFIC:"Tráfico", OUTCOME_SALES:"Ventas", OUTCOME_ENGAGEMENT:"Interacción", OUTCOME_AWARENESS:"Reconocimiento", OUTCOME_APP_PROMOTION:"Aplicación" };
const OBJETIVOS_GOOGLE = { SEARCH:"Búsqueda", VIDEO:"Video", DISPLAY:"Display", PERFORMANCE_MAX:"Performance Max", SHOPPING:"Shopping", DEMAND_GEN:"Demand Gen" };

const DATOS = {
  cliente: "geely",
  filas: [],
  filasComparacion: [],
  alcance: null,
  alcanceComparacion: null,
  moneda: null,
  campanias: [],
  objetivos: {},
  cargando: false,
  error: null,
  consultadoEn: null,
};

const num = (v) => (v === null || v === undefined || v === "" ? 0 : Number(v) || 0);

function objetivoDeFila(plataforma, fila) {
  if (plataforma === "meta") return OBJETIVOS_META[fila.campaign_objective] || "Otros";
  if (plataforma === "google") return OBJETIVOS_GOOGLE[fila.advertising_channel_type] || "Otros";
  return "Campañas";
}

/** Totales de un conjunto de filas. Las tasas se calculan sobre los totales del
    período, nunca promediando tasas diarias. */
function totalizar(plataforma, filas, alcance) {
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
  if (alcance !== null && alcance !== undefined) t.reach = alcance;
  const tasa = (a, b, factor = 1) => (b ? (a / b) * factor : 0);
  t.cpm = tasa(t.spend, t.impressions, 1000);
  t.ctr = tasa(t.clicks, t.impressions, 100);
  t.cpc = tasa(t.spend, t.clicks);
  t.cpa = tasa(t.spend, t.conversions);
  t.cpv = tasa(t.spend, t.views || t.videoViews);
  t.frequency = tasa(t.impressions, t.reach);
  return t;
}

const filasElegidas = (filas) =>
  filas.filter((f) => !f.campaign || state.selectedCampaigns.has(f.campaign));

function totalesActuales() {
  // El alcance único es de toda la cuenta: con un filtro de campaña no aplica.
  const todas = state.selectedCampaigns.size === DATOS.campanias.length;
  return totalizar(state.platform, filasElegidas(DATOS.filas), todas ? DATOS.alcance : null);
}
function totalesComparacion() {
  if (state.comparison === "none" || !DATOS.filasComparacion.length) return null;
  const todas = state.selectedCampaigns.size === DATOS.campanias.length;
  return totalizar(state.platform, filasElegidas(DATOS.filasComparacion), todas ? DATOS.alcanceComparacion : null);
}

/** Rango del período de comparación, con la misma regla que el selector. */
function rangoComparacion() {
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
  const pedido = ++ultimoPedido;
  const vigente = () => pedido === ultimoPedido;
  DATOS.cargando = true;
  DATOS.error = null;
  pintarEstadoDatos();
  try {
    const actual = await pedir(state.platform, state.start, state.end);
    if (!vigente()) return;
    DATOS.filas = actual.filas || [];
    DATOS.alcance = actual.alcance;
    DATOS.moneda = actual.cuenta?.moneda || null;
    DATOS.consultadoEn = actual.consultadoEn;

    DATOS.filasComparacion = [];
    DATOS.alcanceComparacion = null;
    if (state.comparison !== "none") {
      const [desde, hasta] = rangoComparacion();
      try {
        const previo = await pedir(state.platform, desde, hasta);
        if (!vigente()) return;
        DATOS.filasComparacion = previo.filas || [];
        DATOS.alcanceComparacion = previo.alcance;
      } catch (e) { /* sin comparación: la vista lo muestra como «—» */ }
    }

    // Las campañas y los objetivos salen de lo que devolvió la cuenta.
    const vistas = new Map();
    for (const f of DATOS.filas) {
      if (!f.campaign) continue;
      if (!vistas.has(f.campaign)) vistas.set(f.campaign, objetivoDeFila(state.platform, f));
    }
    DATOS.campanias = [...vistas.entries()].map(([nombre, objetivo]) => [nombre, nombre, objetivo]);
    DATOS.objetivos = {};
    for (const [, , objetivo] of DATOS.campanias) DATOS.objetivos[objetivo] = objetivo;

    const previas = state.selectedCampaigns;
    const siguen = DATOS.campanias.filter((c) => previas.has(c[0])).map((c) => c[0]);
    state.selectedCampaigns = new Set(siguen.length ? siguen : DATOS.campanias.map((c) => c[0]));

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
function pintarEstadoDatos() {
  const caja = document.querySelector("#data-state");
  if (!caja) return;
  if (DATOS.cargando) { caja.hidden = false; caja.className = "data-state"; caja.textContent = "Consultando Windsor…"; return; }
  if (DATOS.error) { caja.hidden = false; caja.className = "data-state is-error"; caja.textContent = DATOS.error; return; }
  if (!DATOS.filas.length) {
    caja.hidden = false; caja.className = "data-state";
    caja.textContent = `La cuenta no devolvió datos entre ${dateText(state.start)} y ${dateText(state.end)}.`;
    return;
  }
  caja.hidden = true;
}

function fmt(metric, value) {
  const type = metricDefs[metric]?.[1] || "number";
  if (type === "currency") return new Intl.NumberFormat("es-AR", { style:"currency", currency: (typeof DATOS !== "undefined" && DATOS.moneda) || "USD", maximumFractionDigits:2 }).format(value);
  if (type === "percent") return `${new Intl.NumberFormat("es-AR", { maximumFractionDigits:2 }).format(value)}%`;
  if (type === "decimal") return new Intl.NumberFormat("es-AR", { maximumFractionDigits:2 }).format(value);
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits:0 }).format(value);
}
function metricLabel(metric) { return metricDefs[metric]?.[0] || metric; }
function currentPlatform() { return platforms[state.platform]; }
function hayComparacion(){ return state.comparison !== "none" && !!DATOS.filasComparacion.length; }
/* Variación real de cada indicador contra el período de comparación. */
function deltaFor(metric){ const c=totalesComparacion(); if(!c) return null; const previo=c[metric]; if(!previo) return null; return (totalesActuales()[metric]/previo-1)*100; }
function currentMetrics() { const p=currentPlatform(); const base=(p.defaults[state.objective]||p.metrics).slice(0,6); return [...base, ...state.customKpis[state.platform]]; }
/* El valor de un indicador sale de los totales reales del período. `filas`
   permite pedir los de una campaña concreta para la tabla. */
function valueFor(metric, filas) {
  const totales = filas ? totalizar(state.platform, filas, null) : totalesActuales();
  return totales[metric] ?? 0;
}
function toISO(date){return date.toISOString().slice(0,10)}
function dateText(value){return new Intl.DateTimeFormat("es-AR",{day:"2-digit",month:"2-digit",year:"numeric"}).format(new Date(`${value}T12:00:00`))}
function syncPeriodControls(){document.querySelector("#date-start").value=state.start;document.querySelector("#date-end").value=state.end;document.querySelector("#period-summary").textContent=`${dateText(state.start)} — ${dateText(state.end)}`}
function syncComparisonDates(mode){const start=new Date(`${state.start}T12:00:00`),end=new Date(`${state.end}T12:00:00`);let cs,ce;if(mode==="previous"){const days=Math.round((end-start)/86400000)+1;ce=new Date(start);ce.setDate(ce.getDate()-1);cs=new Date(ce);cs.setDate(cs.getDate()-days+1)}else if(mode==="month"){cs=new Date(start);ce=new Date(end);cs.setMonth(cs.getMonth()-1);ce.setMonth(ce.getMonth()-1)}else return;document.querySelector("#compare-start").value=toISO(cs);document.querySelector("#compare-end").value=toISO(ce)}
function applyPeriod(){state.start=document.querySelector("#date-start").value;state.end=document.querySelector("#date-end").value;syncPeriodControls();syncComparisonDates(document.querySelector('input[name="comparison"]:checked').value);document.querySelector("#period-popover").hidden=true;marcarFiltrosPendientes()}

function setPlatform(id) {
  state.platform=id;
  const p=currentPlatform();
  state.objective="";
  state.selectedCampaigns=new Set();
  state.selectedMetrics=(p.defaults[Object.keys(p.defaults)[0]]||p.metrics).slice(0,2);
  state.chartTypes[state.selectedMetrics[0]]="bar"; state.chartTypes[state.selectedMetrics[1]]="line";
  state.expandedMetrics=new Set(state.tableMetrics[id]);
  cargarDatos();
}

function renderPlatformHeader() {
  const p=currentPlatform(); document.querySelector("#platform-title").textContent=p.title; { const e=document.querySelector("#platform-eyebrow"); if(e) e.textContent=`${(DATOS.nombreCliente||"").toUpperCase()} · PERFORMANCE`.replace(/^ · /,""); } if(window.PanelEmisarios) window.PanelEmisarios.rutaDelPanel(); document.querySelector("#platform-description").textContent=p.description;
  document.querySelectorAll("[data-platform]").forEach(b=>b.classList.toggle("active",b.dataset.platform===state.platform));
  document.querySelector("#campaign-filter-wrap").classList.toggle("hidden",!p.paid); document.querySelector("#objective-row").classList.toggle("hidden",!p.paid); document.querySelector(".performance-panel").classList.toggle("hidden",!p.paid);
  document.querySelector("#network-filter-wrap").classList.toggle("hidden",state.platform!=="instagram");
}

function renderObjectives() {
  // Los objetivos que se ofrecen son los de las campañas elegidas arriba: con
  // una sola campaña queda su objetivo y nada más.
  const deLasCampanias=[...new Set(DATOS.campanias.filter(c=>state.selectedCampaigns.has(c[0])).map(c=>c[2]))];
  const lista=deLasCampanias.length?deLasCampanias:Object.keys(DATOS.objetivos);
  if(!lista.includes(state.objective)) state.objective=lista[0]||"";
  document.querySelector("#objective-buttons").innerHTML=lista.map(id=>`<button class="objective-button ${id===state.objective?"active":""}" data-objective="${id}">${id}</button>`).join("");
  document.querySelector("#objective-row").classList.toggle("single-objective",lista.length<=1);
  document.querySelectorAll("[data-objective]").forEach(b=>b.onclick=()=>{ state.objective=b.dataset.objective; renderObjectives(); renderKpis(); renderChart(); marcarFiltrosPendientes(); });
}
function renderCampaigns() {
  const list=DATOS.campanias;
  document.querySelector("#campaign-options").innerHTML=list.length
    ? list.map(c=>`<label class="campaign-option"><input type="checkbox" value="${c[0]}" ${state.selectedCampaigns.has(c[0])?"checked":""}><span>${c[1]}<small>${c[2]}</small></span></label>`).join("")
    : '<p class="campaign-empty">La cuenta no devolvió campañas en este período.</p>';
  document.querySelectorAll("#campaign-options input").forEach(i=>i.onchange=()=>{ i.checked?state.selectedCampaigns.add(i.value):state.selectedCampaigns.delete(i.value); if(!state.selectedCampaigns.size){state.selectedCampaigns.add(i.value);i.checked=true} renderCampaigns(); renderObjectives(); marcarFiltrosPendientes(); });
  const elegidas=list.filter(c=>state.selectedCampaigns.has(c[0]));
  document.querySelector("#campaign-summary").textContent = !list.length ? "Sin campañas" : elegidas.length===1 ? elegidas[0][1] : `${elegidas.length} seleccionadas`;
}
function renderKpis() {
  const metrics=currentMetrics(); const grid=document.querySelector("#kpi-grid");
  let html=metrics.map(metric=>{
    const idx=state.selectedMetrics.indexOf(metric);
    const delta=deltaFor(metric);
    const signo=delta===null?"":delta>=0?"↑":"↓";
    const clase=delta===null?"":delta>=0?"positive":"negative";
    const removable=state.customKpis[state.platform].includes(metric);
    return `<button class="kpi-card ${idx>=0?"selected":""}" data-metric="${metric}" data-order="${idx>=0?idx+1:""}" style="--series-color:${COLORS[Math.max(0,idx)]}"><span class="kpi-label">${metricLabel(metric)}</span><div class="kpi-value">${fmt(metric,valueFor(metric))}</div>${delta===null?"":`<span class="kpi-delta ${clase}">${signo} ${Math.abs(delta).toFixed(1).replace(".",",")}% vs. comparación</span>`}${removable?`<span class="kpi-remove" data-remove="${metric}">Quitar</span>`:""}</button>`;
  }).join("");
  const empty=3-state.customKpis[state.platform].length; for(let i=0;i<empty;i++) html+=`<button class="kpi-add" type="button">+<span>Agregar KPI</span></button>`; grid.innerHTML=html;
  grid.querySelectorAll(".kpi-card").forEach(card=>card.onclick=e=>{ if(e.target.dataset.remove){removeCustom(e.target.dataset.remove);return} toggleChartMetric(card.dataset.metric); });
  grid.querySelectorAll(".kpi-add").forEach(b=>b.onclick=openKpiDialog);
}

function openKpiDialog() {
  const p=currentPlatform(); const shown=currentMetrics(); const choices=p.metrics.filter(m=>!shown.includes(m));
  document.querySelector("#kpi-dialog-options").innerHTML=choices.length?choices.map(m=>`<button type="button" class="kpi-choice" data-add-kpi="${m}">${metricLabel(m)}<span>+</span></button>`).join(""):`<p>Ya se muestran todos los KPI disponibles.</p>`;
  document.querySelectorAll("[data-add-kpi]").forEach(b=>b.onclick=()=>{ if(state.customKpis[state.platform].length<3)state.customKpis[state.platform].push(b.dataset.addKpi); document.querySelector("#kpi-dialog").close(); renderKpis(); }); document.querySelector("#kpi-dialog").showModal();
}
function removeCustom(metric){ state.customKpis[state.platform]=state.customKpis[state.platform].filter(m=>m!==metric); state.selectedMetrics=state.selectedMetrics.filter(m=>m!==metric); if(!state.selectedMetrics.length)state.selectedMetrics=[currentPlatform().defaults[state.objective][0]]; renderKpis();renderChart(); }
function toggleChartMetric(metric){ const i=state.selectedMetrics.indexOf(metric); if(i>=0&&state.selectedMetrics.length>1)state.selectedMetrics.splice(i,1); else if(i<0){if(state.selectedMetrics.length===2)state.selectedMetrics.shift();state.selectedMetrics.push(metric);if(!state.chartTypes[metric])state.chartTypes[metric]="line"} renderKpis();renderChart(); }

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
  const metrics=state.selectedMetrics; document.querySelector("#chart-title").textContent=`Evolución de ${metrics.map(metricLabel).join(" vs. ")}`;
  document.querySelector("#series-controls").innerHTML=metrics.map((m,i)=>`<label class="series-control" style="--series-color:${COLORS[i]}"><i></i><strong>${metricLabel(m)}</strong><select data-chart-type="${m}"><option value="line" ${state.chartTypes[m]==="line"?"selected":""}>Línea</option><option value="bar" ${state.chartTypes[m]==="bar"?"selected":""}>Barras</option></select><span class="series-values"><input type="checkbox" data-show-values="${m}" ${state.showValues[m]?"checked":""}> Mostrar datos</span></label>`).join("");
  document.querySelectorAll("[data-chart-type]").forEach(s=>s.onchange=()=>{state.chartTypes[s.dataset.chartType]=s.value;renderChart()});
  document.querySelectorAll("[data-show-values]").forEach(i=>i.onchange=()=>{state.showValues[i.dataset.showValues]=i.checked;renderChart()});
  const cubos=serieAgrupada(); const labels=cubos.map(c=>etiquetaDeCubo(c[0])); const svg=document.querySelector("#evolution-chart"), width=Math.max(700,svg.clientWidth||900), height=280, margin={l:68,r:68,t:22,b:48}, iw=width-margin.l-margin.r, ih=height-margin.t-margin.b;
  const values=metrics.map(m=>cubos.map(c=>valueFor(m,c[1]))); const max=values.map(v=>Math.max(...v,1)*1.12); const x=i=>margin.l+(labels.length===1?iw/2:i*iw/(labels.length-1)); const y=(v,s)=>margin.t+ih-v/max[s]*ih;
  let html=`<rect class="chart-hit" x="${margin.l}" y="${margin.t}" width="${iw}" height="${ih}"/>`;for(let t=0;t<5;t++){const py=margin.t+ih-t*ih/4;html+=`<line class="chart-grid" x1="${margin.l}" y1="${py}" x2="${width-margin.r}" y2="${py}"/>`;metrics.forEach((m,s)=>{if(s===0||s===1&&metrics.length===2)html+=`<text class="chart-axis chart-y-axis" x="${s===0?margin.l-10:width-margin.r+10}" y="${py+4}" text-anchor="${s===0?"end":"start"}">${fmt(m,max[s]*t/4)}</text>`})}
  const step=Math.max(1,Math.ceil(labels.length/8));labels.forEach((l,i)=>{if(i%step===0||i===labels.length-1)html+=`<text class="chart-axis" x="${x(i)}" y="${height-17}" text-anchor="middle">${l}</text>`});
  metrics.forEach((m,s)=>{if(state.chartTypes[m]==="bar"){const bw=Math.max(8,Math.min(30,iw/labels.length*.42));values[s].forEach((v,i)=>html+=`<rect class="chart-bar" x="${x(i)-bw/2+s*bw*.28}" y="${y(v,s)}" width="${bw}" height="${margin.t+ih-y(v,s)}" rx="3" fill="${COLORS[s]}"/>`)}else{html+=`<path class="chart-line" d="${values[s].map((v,i)=>`${i?"L":"M"}${x(i)},${y(v,s)}`).join(" ")}" stroke="${COLORS[s]}"/>`;values[s].forEach((v,i)=>html+=`<circle class="chart-point" cx="${x(i)}" cy="${y(v,s)}" r="4" fill="${COLORS[s]}"/>`)}});
  // Los valores se dibujan al final para que queden por encima de barras y líneas.
  // Se muestran aunque se pisen entre sí: es el usuario el que decide encenderlos.
  metrics.forEach((m,s)=>{ if(!state.showValues[m])return; const esBarra=state.chartTypes[m]==="bar"; const bw=Math.max(8,Math.min(30,iw/labels.length*.42));
    values[s].forEach((v,i)=>{ const px=esBarra?x(i)+s*bw*.28:x(i); const py=y(v,s)-(esBarra?6:10);
      html+=`<text class="chart-value" x="${px}" y="${py}" text-anchor="middle" fill="${COLORS[s]}">${fmt(m,v)}</text>`; }); });
  svg.setAttribute("viewBox",`0 0 ${width} ${height}`);svg.innerHTML=html;
  const tooltip=document.querySelector("#chart-tooltip");
  svg.onpointermove=e=>{
    const rect=svg.getBoundingClientRect();
    // El índice se saca de la posición dentro del área del gráfico, repartida
    // entre todos los puntos: sin multiplicar por los tramos, el redondeo sólo
    // devolvía el primero o el último.
    const avance=((e.clientX-rect.left)/rect.width*width-margin.l)/iw;
    const idx=Math.max(0,Math.min(labels.length-1,Math.round(avance*(labels.length-1))));
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

function renderColumnOptions(){ const p=currentPlatform(); const selected=state.tableMetrics[state.platform]; document.querySelector("#column-options").innerHTML=`<label class="column-option"><input id="select-all-columns" type="checkbox" ${selected.length===p.metrics.length?"checked":""}> Seleccionar todos</label>`+p.metrics.map(m=>`<label class="column-option"><input type="checkbox" data-column="${m}" ${selected.includes(m)?"checked":""}> ${metricLabel(m)}</label>`).join(""); document.querySelector("#select-all-columns").onchange=e=>{state.tableMetrics[state.platform]=e.target.checked?[...p.metrics]:[];renderColumnOptions();renderTable()};document.querySelectorAll("[data-column]").forEach(i=>i.onchange=()=>{const list=state.tableMetrics[state.platform];i.checked?list.push(i.dataset.column):state.tableMetrics[state.platform]=list.filter(m=>m!==i.dataset.column);renderTable()}); }

function renderTable(){
  const metrics=state.tableMetrics[state.platform];
  const head=document.querySelector("#performance-head"), body=document.querySelector("#performance-body");
  const hay=hayComparacion();
  let h1=`<tr><th rowspan="2">Campaña</th>`,h2=`<tr class="subhead">`;
  metrics.forEach(m=>{const open=hay&&state.expandedMetrics.has(m);h1+=`<th class="metric-group" colspan="${open?3:1}">${metricLabel(m)} ${hay?`<button class="metric-toggle" data-expand-metric="${m}">${open?"←":"→"}</button>`:""}</th>`;h2+=`<th>Actual</th>${open?"<th>Comparación</th><th>Cambio</th>":""}`});
  head.innerHTML=`${h1}</tr>${h2}</tr>`;
  document.querySelectorAll("[data-expand-metric]").forEach(b=>b.onclick=()=>{state.expandedMetrics.has(b.dataset.expandMetric)?state.expandedMetrics.delete(b.dataset.expandMetric):state.expandedMetrics.add(b.dataset.expandMetric);renderTable()});

  const elegidas=DATOS.campanias.filter(c=>state.selectedCampaigns.has(c[0]));
  if(!elegidas.length){ body.innerHTML=`<tr><td colspan="${metrics.length+1}">Sin campañas en este período.</td></tr>`; return; }
  const porCampania=(lista,nombre)=>lista.filter(f=>f.campaign===nombre);

  body.innerHTML=elegidas.map(c=>{
    const filas=porCampania(DATOS.filas,c[0]);
    const previas=porCampania(DATOS.filasComparacion,c[0]);
    let celdas=`<td>${c[1]}</td>`;
    metrics.forEach(m=>{
      const v=valueFor(m,filas);
      celdas+=`<td>${fmt(m,v)}</td>`;
      if(hay&&state.expandedMetrics.has(m)){
        const previo=valueFor(m,previas);
        const cambio=previo?(v/previo-1)*100:null;
        celdas+=`<td>${fmt(m,previo)}</td><td class="${cambio===null?"":cambio>=0?"positive":"negative"}">${cambio===null?"—":`${cambio>=0?"+":"−"}${Math.abs(cambio).toFixed(1).replace(".",",")}%`}</td>`;
      }
    });
    return `<tr class="level-campaign">${celdas}</tr>`;
  }).join("");
}
function moduleTable(title,first,metrics,rows){return `<section class="panel"><div class="panel-heading"><div><p class="eyebrow">GOOGLE ADS</p><h2>${title}</h2></div></div><div class="table-scroll"><table class="module-table"><thead><tr><th>${first}</th>${metrics.map(m=>`<th>${m}</th>`).join("")}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map((v,i)=>`<td>${v}</td>`).join("")}</tr>`).join("")}</tbody></table></div></section>`}
function renderAdditionalModules(){
  /* Los desgloses por palabra clave, zona o contenido necesitan consultas
     aparte en Windsor que todavía no están conectadas. Antes que mostrar
     números de ejemplo, se dice qué falta. */
  const root=document.querySelector("#additional-modules");
  const pendientes={
    google:"El desglose por palabra clave y por ciudad necesita una consulta aparte en Windsor.",
    instagram:"El perfil conectado es el público de Instagram: informa seguidores y publicaciones. El alcance, las interacciones y el contenido necesitan la cuenta de Instagram Insights conectada en Windsor.",
    tiktokOrganic:"TikTok orgánico todavía no está conectado en Windsor.",
  };
  const texto=pendientes[state.platform];
  root.innerHTML=texto?`<section class="panel"><p class="eyebrow">PENDIENTE DE CONEXIÓN</p><p class="form-note">${texto}</p></section>`:"";
}
function renderReelsTable(){const reels=[["Reel lanzamiento","1 sep 2026","12.400","4,8%","18.200","310","1.540","48"],["Test drive","6 sep 2026","10.900","5,2%","15.600","280","1.320","39"],["Detalle interior","12 sep 2026","8.700","4,1%","11.900","190","980","27"]];const labels=["Contenido","Fecha","Alcance","Engagement","Visualizaciones","Guardados","Me gusta","Comentarios"];return `<section class="panel"><p class="eyebrow">CONTENIDO</p><h2>Reels publicados</h2><div class="table-scroll"><table class="module-table reels-table"><tbody><tr><th>Vista previa</th>${reels.map(()=>`<td><div class="placeholder-media">Sin imagen</div></td>`).join("")}</tr>${labels.map((l,i)=>`<tr><th>${l}</th>${reels.map(r=>`<td>${r[i]}</td>`).join("")}</tr>`).join("")}</tbody></table></div></section>`}

function marcarFiltrosPendientes(){ if (window.PanelEmisarios) window.PanelEmisarios.filtrosPendientes(); }
function renderAll(){syncPeriodControls();renderPlatformHeader();renderObjectives();renderCampaigns();renderKpis();renderChart();renderColumnOptions();renderTable();renderAdditionalModules();}
function bindPopover(trigger,pop){const t=document.querySelector(trigger),p=document.querySelector(pop);t.onclick=e=>{e.stopPropagation();document.querySelectorAll(".popover").forEach(x=>x.hidden=true);p.hidden=!p.hidden};p.onclick=e=>e.stopPropagation()}

document.querySelectorAll("[data-platform]").forEach(b=>b.onclick=()=>setPlatform(b.dataset.platform));
bindPopover("#period-trigger","#period-popover");bindPopover("#campaign-trigger","#campaign-popover");bindPopover("#comparison-trigger","#comparison-popover");bindPopover("#columns-trigger","#columns-popover");document.addEventListener("click",()=>document.querySelectorAll(".popover").forEach(x=>x.hidden=true));
document.querySelector("#campaign-select-all").onclick=()=>{state.selectedCampaigns=new Set(DATOS.campanias.map(c=>c[0]));renderCampaigns();renderObjectives();marcarFiltrosPendientes()};
document.querySelector("#campaign-clear").onclick=()=>{state.selectedCampaigns.clear();renderCampaigns();renderObjectives();marcarFiltrosPendientes()};
document.querySelectorAll('input[name="comparison"]').forEach(i=>{const sync=e=>{if(e.target.value!=="custom")syncComparisonDates(e.target.value)};i.onchange=sync;i.onclick=sync});
document.querySelector("#apply-comparison").onclick=()=>{const input=document.querySelector('input[name="comparison"]:checked');state.comparison=input.value;document.querySelector("#comparison-summary").textContent=input.parentElement.textContent.trim();document.querySelector("#comparison-popover").hidden=true;marcarFiltrosPendientes()};
document.querySelectorAll("[data-granularity]").forEach(b=>b.onclick=()=>{state.granularity=b.dataset.granularity;document.querySelectorAll("[data-granularity]").forEach(x=>x.classList.toggle("active",x===b));renderChart()});
document.querySelectorAll("[data-quick-period]").forEach(b=>b.onclick=()=>{const end=new Date(`${state.end}T12:00:00`),start=new Date(end);if(b.dataset.quickPeriod==="today"){}else if(b.dataset.quickPeriod==="yesterday"){start.setDate(start.getDate()-1);end.setDate(end.getDate()-1)}else if(b.dataset.quickPeriod==="last7")start.setDate(start.getDate()-6);else if(b.dataset.quickPeriod==="last14")start.setDate(start.getDate()-13);else if(b.dataset.quickPeriod==="thisMonth")start.setDate(1);else {end.setDate(0);start.setTime(end.getTime());start.setDate(1)}state.start=toISO(start);state.end=toISO(end);syncPeriodControls();applyPeriod()});
document.querySelector("#apply-period").onclick=applyPeriod;
window.onresize=()=>{clearTimeout(window.chartTimer);window.chartTimer=setTimeout(renderChart,100)};
window.DatosEmisarios = {
  cargar: cargarDatos,
  /* Volver a pedir sólo cuando cambió el período o la comparación; si sólo se
     tocaron campañas u objetivos alcanza con repintar lo que ya está. */
  aplicarFiltros: () => cargarDatos(),
  elegirCliente: (id, nombre) => { DATOS.cliente = id; DATOS.nombreCliente = nombre || id; cargarDatos(); },
};
