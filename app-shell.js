/* Marco del panel: navegación, estados y secciones de gestión.
   El dashboard de cada plataforma sigue viviendo en app-v2.js. */

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

function aviso(texto) {
  const t = $("#toast");
  t.textContent = texto;
  t.classList.add("visible");
  clearTimeout(window.__avisoTimer);
  window.__avisoTimer = setTimeout(() => t.classList.remove("visible"), 2600);
}

/* ── Navegación entre vistas ─────────────────────────────────────────── */
const VISTAS = ["dashboard", "reports", "tasks", "users", "new-user", "profile"];
const CASA = "Emisarios Argentina";

/* La ruta se arma con las partes de donde está parado el usuario:
   Usuarios y Accesos / Editar usuario / yan. */
function pintarRuta(partes) {
  $("#breadcrumb").innerHTML = partes
    .map((p, i) => (i === partes.length - 1 ? `<strong>${p}</strong>` : `<span>${p}</span>`))
    .join("<b>/</b>");
}
function rutaDeVista(nombre) {
  if (nombre === "dashboard") return [CASA, clienteActual ? clienteActual.nombre : "—", currentPlatform().title];
  if (nombre === "reports") return [CASA, "Reportes"];
  if (nombre === "tasks") return [CASA, clienteActual ? clienteActual.nombre : "—", "Seguimiento de Tareas"];
  if (nombre === "users") return [CASA, "Usuarios y Accesos"];
  if (nombre === "profile") return [CASA, "Mi Perfil"];
  if (nombre === "new-user") {
    const u = idEditando ? usuarios.find((x) => x.id === idEditando) : null;
    return u ? ["Usuarios y Accesos", "Editar usuario", u.usuario] : ["Usuarios y Accesos", "Nuevo usuario"];
  }
  return [CASA];
}

let vistaActiva = "dashboard";
function mostrarVista(nombre) {
  VISTAS.forEach((v) => { const el = $(`#view-${v}`); if (el) el.hidden = v !== nombre; });
  $$(".sidebar .nav-item").forEach((b) => b.classList.toggle("active", b.dataset.view === nombre));
  if (nombre === "dashboard") {
    $$(".sidebar [data-platform]").forEach((b) => b.classList.toggle("active", b.dataset.platform === state.platform));
  }
  pintarRuta(rutaDeVista(nombre));
  vistaActiva = nombre;
  if (nombre === "users") pintarUsuarios();
  if (nombre === "reports") pintarReportes();
  if (nombre === "tasks") pintarTareas();
  window.scrollTo({ top: 0 });
}

$$("[data-view]").forEach((b) => (b.onclick = () => mostrarVista(b.dataset.view)));
$$("[data-platform]").forEach((b) => b.addEventListener("click", () => mostrarVista("dashboard")));

/* ── Lateral: contraído y desplegado al pasar el mouse ───────────────── */
/* En el teléfono el lateral no vive en pantalla: es un cajón que abre la
   hamburguesa, con la marca y los accesos adentro. En escritorio el mismo
   botón sigue contrayendo el panel, que es lo aprobado. */
const enMovil = () => window.matchMedia("(max-width: 700px)").matches;
function cerrarMenuMovil() { $("#app-shell").classList.remove("menu-abierto"); $("#velo-menu").hidden = true; }
$("#sidebar-toggle").onclick = () => {
  if (enMovil()) {
    const abierto = $("#app-shell").classList.toggle("menu-abierto");
    $("#velo-menu").hidden = !abierto;
    $("#sidebar-toggle").setAttribute("aria-expanded", String(abierto));
    return;
  }
  const contraido = $("#app-shell").classList.toggle("collapsed");
  $("#sidebar-toggle").setAttribute("aria-pressed", String(contraido));
  aviso(contraido ? "Panel contraído. Pasá el mouse por encima para desplegarlo." : "Panel desplegado.");
};
$("#velo-menu").onclick = cerrarMenuMovil;
/* Elegir a dónde ir cierra el cajón: si no, tapa lo que se acaba de abrir.
   Va por delegación porque los clientes y las cuentas se dibujan después. */
$("#sidebar").addEventListener("click", (e) => {
  if (enMovil() && e.target.closest("[data-view], [data-platform], [data-cliente]")) cerrarMenuMovil();
});

/* El despliegue va también por JS: el :hover del CSS no alcanza cuando el
   puntero entra sobre un hijo y el panel está por encima del contenido. */
const lateral = $("#sidebar");
const ANCHO_CERRADO = 74;
/* Tras elegir una sección el panel se cierra y no vuelve a abrirse hasta que el
   puntero se mueva de nuevo: sin esta pausa se reabría solo, porque el cursor
   todavía está encima del panel. */
let sinDesplegarHasta = 0;
function desplegarLateral() {
  if (esEscritorio() && Date.now() > sinDesplegarHasta) lateral.classList.add("expanded");
}
function cerrarLateral() {
  lateral.classList.remove("expanded");
  abrirListaClientes(false);
}
function esEscritorio() { return window.innerWidth > 700; }

lateral.addEventListener("mouseover", desplegarLateral);
lateral.addEventListener("mouseleave", cerrarLateral);
lateral.addEventListener("focusin", desplegarLateral);
lateral.addEventListener("focusout", (e) => { if (!lateral.contains(e.relatedTarget)) cerrarLateral(); });
/* Al elegir una sección el panel se cierra solo: si no, el clic repinta la vista
   y el puntero queda sobre el contenido sin que llegue a dispararse mouseleave. */
lateral.addEventListener("click", (e) => {
  /* El selector de cliente no cierra el panel: abre la lista ahí mismo. Quien
     lo cierra es elegir una cuenta, un cliente de esa lista, o cerrar sesión. */
  if (!e.target.closest(".nav-item, .logout, .client-option")) return;
  cerrarLateral();
  sinDesplegarHasta = Date.now() + 600;
});
/* Red de seguridad: si el puntero ya está fuera del panel, se cierra igual. */
document.addEventListener("pointermove", (e) => {
  if (lateral.classList.contains("expanded") && e.clientX > lateral.getBoundingClientRect().right) cerrarLateral();
});
/* En escritorio el lateral vive siempre contraído; abajo de 700 px pasa a ser la
   barra horizontal y el estado contraído no corresponde. Se recalcula en cada
   cambio de tamaño: mirarlo una sola vez al cargar dejaba el panel fijo abierto. */
function ajustarLateral() {
  if (esEscritorio()) {
    $("#app-shell").classList.add("collapsed");
  } else {
    $("#app-shell").classList.remove("collapsed");
    cerrarLateral();
  }
}
ajustarLateral();
window.addEventListener("resize", ajustarLateral);

$("#logout").onclick = () => cerrarSesion();

/* ── Conexión con Windsor ────────────────────────────────────────────── */
let conexionViva = true;
let detalleConexion = "";
function pintarConexion() {
  const c = $("#connection");
  c.classList.toggle("is-live", conexionViva);
  c.classList.toggle("is-down", !conexionViva);
  $("#connection-text").textContent = conexionViva ? "Datos Sincronizados" : "DATOS DESINCRONIZADOS";
  /* El detalle del error va en el título: en la barra entra una palabra, pero
     quien necesite saber qué falló lo tiene a un hover. */
  c.title = conexionViva
    ? "Los datos son los que devolvió Windsor en la última consulta. Clic para volver a consultar."
    : (detalleConexion ? `No se pudo consultar Windsor: ${detalleConexion} Clic para reintentar.` : "No se pudo consultar Windsor. Clic para reintentar.");
}
$("#connection").onclick = () => {
  if (window.DatosEmisarios) window.DatosEmisarios.cargar();
};
/* Volver a preguntarle a Windsor sin cambiar nada: los mismos filtros, datos
   nuevos. Cambiar un filtro ya vuelve a consultar, pero no siempre hay un
   filtro que cambiar para ver lo último. */
/* Actualizar vuelve a pedir lo que se está mirando. Antes siempre consultaba a
   Windsor, así que en Reportes y en Tareas parecía no hacer nada: los datos de
   esas dos pantallas no vienen de ahí. */
$("#refrescar").onclick = () => {
  if (vistaActiva === "tasks") { pintarTareas(true); return; }
  if (vistaActiva === "reports") { pintarReportes(); return; }
  if (window.DatosEmisarios) window.DatosEmisarios.cargar();
};
pintarConexion();

/* ── Filtros: quedan pendientes hasta que se aplican ─────────────────── */
const botonFiltros = $("#apply-filters");
function filtrosPendientes() {
  botonFiltros.disabled = false;
  botonFiltros.textContent = "APLICAR FILTROS";
}
function filtrosAplicados() {
  botonFiltros.disabled = true;
  botonFiltros.textContent = "APLICADO";
}
botonFiltros.onclick = () => {
  if (window.DatosEmisarios) window.DatosEmisarios.aplicarFiltros();
  filtrosAplicados();
};
filtrosAplicados();
window.PanelEmisarios = {
  filtrosPendientes,
  filtrosAplicados,
  aviso,
  /* Quién está adentro: el panel lo usa para guardar la disposición de sus
     tarjetas sin mezclarla con la de otra persona en la misma computadora. */
  usuario: () => (sesion ? sesion.id : null),
  rutaDelPanel: () => { if (vistaActiva === "dashboard") pintarRuta(rutaDeVista("dashboard")); },
  conexion: (viva, detalle) => { conexionViva = viva; detalleConexion = detalle || ""; pintarConexion(); },
  recargarDatos: () => { if (window.DatosEmisarios) window.DatosEmisarios.cargar(); },
  clientesListos: (lista) => pintarClientes(lista),
};

/* ── Clientes y cuentas del lateral ──────────────────────────────────────
   Todo el menú sale de /api/cuentas: sólo aparece lo que está conectado en
   Windsor y además habilitado para este usuario. */
const ICONOS = {
  google: '<svg viewBox="0 0 24 24"><path d="m12 3 8 18H4z" /></svg>',
  meta: '<svg viewBox="0 0 24 24"><path d="M3 15c0-4 2-8 4.5-8S11 12 12 12s2-5 4.5-5S21 11 21 15c0 2-1 3-2.5 3S15 15 12 15s-5 3-6.5 3S3 17 3 15Z" /></svg>',
  tiktok: '<svg viewBox="0 0 24 24"><path d="M14 4v10.5a3.5 3.5 0 1 1-3-3.46" /><path d="M14 4c.6 2.4 2.2 3.8 5 4" /></svg>',
  instagram: '<svg viewBox="0 0 24 24"><rect x="3.5" y="3.5" width="17" height="17" rx="5" /><circle cx="12" cy="12" r="3.6" /><circle cx="17.2" cy="6.8" r=".9" fill="currentColor" stroke="none" /></svg>',
};

let clienteActual = null;
let listaClientes = [];

function pintarClientes(lista) {
  listaClientes = lista;
  if (!lista.length) {
    $("#account-nav").innerHTML = '<p class="nav-vacio">Tu usuario todavía no tiene ninguna cuenta habilitada.</p>';
    $(".client-name").textContent = "Sin cuentas";
    $(".client-avatar").textContent = "—";
    return;
  }
  $("#client-list").innerHTML = lista.map((c) => `
    <button class="client-option" type="button" role="menuitem" data-cliente="${c.id}">
      <span class="client-avatar">${c.inicial}</span>
      <span>${c.nombre}<small>${c.cuentas.length} cuenta${c.cuentas.length === 1 ? "" : "s"}</small></span>
    </button>`).join("");
  marcarClienteElegido();
  $$("[data-cliente]").forEach((b) => (b.onclick = () => {
    elegirCliente(lista.find((c) => c.id === b.dataset.cliente));
    abrirListaClientes(false);
  }));
  // Con un solo cliente el selector es una tarjeta fija, no un desplegable.
  $("#client-switcher").disabled = lista.length < 2;
  if (!clienteActual || !lista.some((c) => c.id === clienteActual.id)) elegirCliente(lista[0]);
}

function marcarClienteElegido() {
  $$("[data-cliente]").forEach((b) =>
    b.setAttribute("aria-pressed", String(!!clienteActual && b.dataset.cliente === clienteActual.id)));
}

function abrirListaClientes(abrir) {
  if (!$("#client-list")) return;
  $("#client-list").hidden = !abrir;
  $("#client-switcher").setAttribute("aria-expanded", String(abrir));
}
$("#client-switcher").onclick = (e) => {
  e.stopPropagation();
  abrirListaClientes($("#client-list").hidden);
};

const GRUPOS = [["pagas", "CUENTAS PAGAS"], ["organicas", "CUENTAS ORGÁNICAS"]];

function pintarNavDeCuentas(cliente) {
  $("#account-nav").innerHTML = GRUPOS.map(([grupo, titulo]) => {
    const cuentas = cliente.cuentas.filter((c) => c.grupo === grupo);
    if (!cuentas.length) return "";
    return `<p class="nav-heading">${titulo}</p>
      <nav aria-label="${titulo}">${cuentas.map((c) => `
        <button class="nav-item" data-platform="${c.id}" type="button">
          <span class="nav-icon" aria-hidden="true">${ICONOS[c.tipo] || ""}</span>
          <span class="nav-label">${c.titulo}</span><i></i>
        </button>`).join("")}</nav>`;
  }).join("");
  $$("#account-nav [data-platform]").forEach((b) => (b.onclick = () => {
    setPlatform(b.dataset.platform);
    mostrarVista("dashboard");
    filtrosAplicados();
  }));
}

function elegirCliente(cliente) {
  clienteActual = cliente;
  $(".client-avatar").textContent = cliente.inicial;
  $(".client-name").textContent = cliente.nombre;
  marcarClienteElegido();
  pintarNavDeCuentas(cliente);
  if (window.DatosEmisarios) window.DatosEmisarios.elegirCliente(cliente, cliente.cuentas[0]);
  if (vistaActiva === "dashboard") pintarRuta(rutaDeVista("dashboard"));
  /* Los reportes son de un cliente: si se cambia de cliente estando en esa
     vista, hay que volver a preguntar por su carpeta. */
  if (vistaActiva === "reports") pintarReportes();
  if (vistaActiva === "tasks") { pintarRuta(rutaDeVista("tasks")); pintarTareas(); }
}

/* Al cambiar de cuenta el panel se repinta entero: los filtros quedan aplicados. */
$$("[data-platform]").forEach((b) => b.addEventListener("click", () => { pintarRedes(); filtrosAplicados(); }));

/* ── Plataformas del panel orgánico (Instagram / Facebook) ───────────── */
const REDES = [["instagram", "Instagram"], ["facebook", "Facebook"]];
function pintarRedes() {
  $("#network-options").innerHTML = REDES.map(([id, label]) =>
    `<label class="campaign-option"><input type="checkbox" value="${id}" ${state.networks.has(id) ? "checked" : ""}><span>${label}</span></label>`).join("");
  $$("#network-options input").forEach((i) => (i.onchange = () => {
    i.checked ? state.networks.add(i.value) : state.networks.delete(i.value);
    if (!state.networks.size) { state.networks.add(i.value); i.checked = true; }
    pintarRedes();
    filtrosPendientes();
  }));
  const elegidas = REDES.filter(([id]) => state.networks.has(id)).map(([, l]) => l);
  $("#network-summary").textContent = elegidas.length === 2 ? "Instagram y Facebook" : elegidas[0] || "—";
}
$("#network-select-all").onclick = () => { REDES.forEach(([id]) => state.networks.add(id)); pintarRedes(); filtrosPendientes(); };
$("#network-clear").onclick = () => { state.networks.clear(); state.networks.add("instagram"); pintarRedes(); filtrosPendientes(); };
bindPopover("#network-trigger", "#network-popover");
pintarRedes();

/* ── Descargas: se resuelven con la impresión a PDF del navegador ────── */
function resumenFiltros() {
  const partes = [`Período ${dateText(state.start)} — ${dateText(state.end)}`];
  if (currentPlatform().paid) partes.push(`${state.selectedCampaigns.size} campañas`);
  else partes.push(REDES.filter(([id]) => state.networks.has(id)).map(([, l]) => l).join(" + "));
  partes.push(`Comparación: ${$("#comparison-summary").textContent}`);
  return partes.join(" · ");
}

function cabeceraImpresion(titulo, detalle) {
  $("#print-header").innerHTML = `<strong>${titulo}</strong>Emisarios Argentina · Geely Argentina · ${detalle}`;
}

$("#export-view").onclick = async () => {
  aviso("Preparando el PDF de la vista actual…");
  /* La cortina de carga es un panel fijo que tapa la pantalla: si la consulta
     sigue en curso cuando se abre el diálogo de impresión, sale impresa encima
     de la primera hoja. Se espera a que los datos estén. */
  if (window.DatosEmisarios && !(await window.DatosEmisarios.listo()))
    aviso("Los datos tardaron más de lo normal: el PDF puede salir incompleto.");
  cabeceraImpresion(currentPlatform().title, resumenFiltros());
  setTimeout(() => window.print(), 250);
};

const dialogoDescarga = $("#download-dialog");
$("#export-all").onclick = () => {
  $("#download-start").value = state.start;
  $("#download-end").value = state.end;
  dialogoDescarga.showModal();
};
$("#download-cancel").onclick = () => dialogoDescarga.close();
$$("[data-download-period]").forEach((b) => (b.onclick = () => {
  $$("[data-download-period]").forEach((x) => x.classList.toggle("active", x === b));
  const modo = b.dataset.downloadPeriod;
  if (modo === "custom") return;
  // Los mismos rangos que el filtro de arriba, contados desde hoy.
  const [desde, hasta] = rangoRapido(modo);
  $("#download-start").value = desde;
  $("#download-end").value = hasta;
}));

$("#download-confirm").onclick = () => {
  const desde = $("#download-start").value, hasta = $("#download-end").value;
  dialogoDescarga.close();
  descargarTodo(desde, hasta);
};

/* Arma un documento con todas las cuentas, una por página, y lo manda a imprimir. */
function descargarTodo(desde, hasta) {
  const plataformaOriginal = state.platform;
  const inicioOriginal = state.start, finOriginal = state.end;
  state.start = desde; state.end = hasta;

  const contenedor = document.createElement("div");
  contenedor.id = "print-all";
  contenedor.className = "print-only";

  Object.keys(platforms).forEach((id) => {
    setPlatform(id);
    const bloque = document.createElement("div");
    bloque.className = "print-block";
    bloque.innerHTML = `<div class="print-header"><strong>${platforms[id].title}</strong>Emisarios Argentina · Geely Argentina · ${resumenFiltros()}</div>` +
      $("#view-dashboard").innerHTML;
    contenedor.appendChild(bloque);
  });

  document.body.appendChild(contenedor);
  document.body.classList.add("printing-all");
  aviso("Preparando el PDF con todas las cuentas…");

  setTimeout(() => {
    window.print();
    document.body.classList.remove("printing-all");
    contenedor.remove();
    state.start = inicioOriginal; state.end = finOriginal;
    setPlatform(plataformaOriginal);
    pintarRedes();
    filtrosAplicados();
  }, 400);
}

/* ── Reportes ────────────────────────────────────────────────────────────
   Dos bloques: las descargas rápidas de cada cuenta conectada y el histórico
   mensual. Lo que puede hacer cada perfil con un mes cambia: el cliente sólo
   descarga el reporte ya publicado, el especialista y el PM entran a
   trabajarlo, y el PM y el administrador además lo aprueban y publican. */

const MESES = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
  "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];

/* Qué botones ve cada perfil en cada mes, y qué hace el primero. El cliente
   DESCARGA el reporte ya publicado; quien lo trabaja INGRESA al archivo en
   Drive, que es donde se edita. Son dos acciones distintas, no la misma con
   otro nombre. */
const ACCIONES_POR_ROL = {
  Cliente: { entrar: "DESCARGAR", descarga: true, aprueba: false },
  Lectura: { entrar: "DESCARGAR", descarga: true, aprueba: false },
  Especialista: { entrar: "INGRESAR", descarga: false, aprueba: false },
  PM: { entrar: "INGRESAR", descarga: false, aprueba: true },
  Administrador: { entrar: "INGRESAR", descarga: false, aprueba: true },
};
const accionesDelPerfil = () => ACCIONES_POR_ROL[sesion?.rol] || ACCIONES_POR_ROL.Cliente;

function pintarReportes() {
  pintarReportesRapidos();
  pintarAnios();
  cargarMeses();
}

/* Marcas de cada plataforma, planas y con su color, para reconocer la tarjeta
   de un vistazo. Son versiones simplificadas, no los logotipos oficiales: acá
   cumplen la función de identificar la cuenta, no la de representar la marca.
   El degradado de Instagram necesita un id propio por tarjeta, porque un
   cliente puede tener dos perfiles y los ids repetidos se pisan. */
const MARCAS = {
  google: () => `<svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9.4 2.6 3.1 13.5a3.1 3.1 0 0 0 5.4 3.1L14.8 5.7A3.1 3.1 0 0 0 9.4 2.6Z" fill="#FBBC04"/>
      <path d="M14.6 2.6a3.1 3.1 0 0 0-1.1 4.2l5.4 9.4a3.1 3.1 0 0 0 5.4-3.1L18.8 3.7a3.1 3.1 0 0 0-4.2-1.1Z" fill="#4285F4" transform="translate(-3.6)"/>
      <circle cx="6" cy="18.4" r="3.1" fill="#34A853"/>
    </svg>`,
  meta: () => `<svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M2.4 14.1c0-3.9 1.9-8 4.6-8 1.6 0 2.8 1 4.3 3.3l1.3 2 1.5-2.4C15.7 6.5 17 6.1 18.2 6.1c2.8 0 4.4 3.5 4.4 7.4 0 2.6-1.2 4.4-3.3 4.4-1.8 0-2.8-1-4.3-3.5l-1.3-2.2-1.6 2.7c-1.4 2.3-2.6 3-4.2 3-2.1 0-3.5-1.7-3.5-3.8Zm3.3-.3c0 1.2.5 1.9 1.3 1.9.7 0 1.2-.4 2.1-1.8l1.4-2.3-1.2-1.9C8.3 8 7.7 7.6 7 7.6c-1.2 0-2.3 2.3-2.3 5 0 .4 0 .8.1 1.2Zm10.2-1.4 1.3 2.2c.9 1.4 1.4 1.8 2.1 1.8.8 0 1.2-.7 1.2-1.9 0-3-1.1-5.3-2.5-5.3-.7 0-1.3.4-2.2 1.9z" fill="#0081FB"/>
    </svg>`,
  tiktok: () => `<svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M13 2.5h2.9c.4 2.3 1.9 3.9 4.4 4.2v2.9c-1.6 0-3-.5-4.3-1.4v6.2a5.9 5.9 0 1 1-5.1-5.9v3a2.9 2.9 0 1 0 2.1 2.8Z" fill="#25F4EE" transform="translate(-1.3 -.6)"/>
      <path d="M13 2.5h2.9c.4 2.3 1.9 3.9 4.4 4.2v2.9c-1.6 0-3-.5-4.3-1.4v6.2a5.9 5.9 0 1 1-5.1-5.9v3a2.9 2.9 0 1 0 2.1 2.8Z" fill="#FE2C55" transform="translate(1.3 .6)"/>
      <path d="M13 2.5h2.9c.4 2.3 1.9 3.9 4.4 4.2v2.9c-1.6 0-3-.5-4.3-1.4v6.2a5.9 5.9 0 1 1-5.1-5.9v3a2.9 2.9 0 1 0 2.1 2.8Z" fill="#161616"/>
    </svg>`,
  instagram: (id) => `<svg viewBox="0 0 24 24" aria-hidden="true">
      <defs><linearGradient id="ig-${id}" x1="0" y1="1" x2="1" y2="0">
        <stop offset="0" stop-color="#FFC947"/><stop offset=".35" stop-color="#FF5B4D"/>
        <stop offset=".7" stop-color="#E1306C"/><stop offset="1" stop-color="#8A3AB9"/>
      </linearGradient></defs>
      <rect x="2.2" y="2.2" width="19.6" height="19.6" rx="5.6" fill="url(#ig-${id})"/>
      <circle cx="12" cy="12" r="4.4" fill="none" stroke="#fff" stroke-width="1.9"/>
      <circle cx="17.4" cy="6.7" r="1.25" fill="#fff"/>
    </svg>`,
};
const marcaDe = (cuenta) => {
  const dibujo = MARCAS[cuenta.tipo];
  return dibujo ? `<i class="marca" aria-hidden="true">${dibujo(cuenta.id)}</i>` : "";
};

/* Una tarjeta por cuenta conectada de este cliente, más el PDF con todas. */
function pintarReportesRapidos() {
  const cuentas = clienteActual ? clienteActual.cuentas : [];
  $("#report-grid").innerHTML = cuentas.map((c) =>
    `<button class="report-card" type="button" data-report="${c.id}">${marcaDe(c)}<span><strong>${c.titulo}</strong><small>PDF de la vista con los filtros aplicados</small></span></button>`).join("") +
    `<button class="report-card todas" type="button" data-report="__todo"><i class="marca" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M6 3.4h8.6L20 8.8v11.8a1.2 1.2 0 0 1-1.2 1.2H6a1.2 1.2 0 0 1-1.2-1.2V4.6A1.2 1.2 0 0 1 6 3.4Z" fill="#7b4de0"/><path d="M14.6 3.4 20 8.8h-4.2a1.2 1.2 0 0 1-1.2-1.2Z" fill="#c0a5ff"/><path d="M7.8 12.4h8.4v1.6H7.8zM7.8 15.8h8.4v1.6H7.8z" fill="#fff"/></svg></i><span><strong>Todas las cuentas</strong><small>Un PDF con las ${cuentas.length} vistas</small></span></button>`;
  $$("[data-report]").forEach((b) => (b.onclick = () => {
    if (b.dataset.report === "__todo") { $("#export-all").click(); return; }
    setPlatform(b.dataset.report);
    mostrarVista("dashboard");
    filtrosAplicados();
    /* Lo justo para que la consulta arranque; de esperar a que termine se
       encarga el propio botón de descarga. */
    setTimeout(() => $("#export-view").click(), 400);
  }));
}

/* Qué meses tienen reporte sale de la carpeta del cliente en Google Drive, y
   cuáles están aprobados sale del almacén propio: Drive guarda los archivos, no
   el estado del circuito. El navegador no habla con Google ni con el almacén:
   pide a /api/drive, que es quien tiene la credencial y quien decide. */
let mesesConReporte = {};
let mesesPublicados = {};
let puedoAprobar = false;
let pedidoDeMeses = 0;

async function cargarMeses() {
  if (!clienteActual) { mesesConReporte = {}; mesesPublicados = {}; pintarMeses(); return; }
  const pedido = (pedidoDeMeses += 1);
  mesesConReporte = {};
  mesesPublicados = {};
  pintarMeses(true);
  try {
    const datos = await api(`/api/drive?cliente=${encodeURIComponent(clienteActual.id)}`);
    /* Si mientras tanto se cambió de cliente, esta respuesta ya no corresponde
       a lo que se está mirando. */
    if (pedido !== pedidoDeMeses) return;
    mesesConReporte = datos.meses || {};
    mesesPublicados = datos.publicados || {};
    puedoAprobar = !!datos.aprueba;
  } catch (e) {
    if (pedido !== pedidoDeMeses) return;
    aviso(`No se pudieron leer los reportes: ${e.message}`);
  }
  pintarAnios();
  pintarMeses();
}

/* Los años salen de lo que haya en la carpeta, más el año en curso: si alguien
   sube el reporte de un año viejo, aparece sin tocar código. */
function pintarAnios() {
  const select = $("#report-year");
  const elegido = Number(select.value) || new Date().getFullYear();
  const anios = new Set([new Date().getFullYear()]);
  for (const clave of Object.keys(mesesConReporte)) anios.add(Number(clave.slice(0, 4)));
  const orden = [...anios].sort((a, b) => b - a);

  select.innerHTML = "";
  for (const a of orden) select.add(new Option(a, a));
  select.value = anios.has(elegido) ? elegido : orden[0];
  select.onchange = () => pintarMeses();
}

const claveDeMes = (anio, i) => `${anio}-${String(i + 1).padStart(2, "0")}`;

const fechaCorta = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" });
};

function pintarMeses(cargando = false) {
  const { entrar, descarga, aprueba } = accionesDelPerfil();
  const anio = Number($("#report-year").value);
  const hoy = new Date();
  $("#months-grid").innerHTML = MESES.map((mes, i) => {
    /* Sólo los meses cerrados. El reporte de un mes se arma al mes siguiente,
       así que el mes en curso todavía no tiene nada que pedir. */
    const abierto = anio > hoy.getFullYear() || (anio === hoy.getFullYear() && i >= hoy.getMonth());
    const clave = claveDeMes(anio, i);
    const reporte = mesesConReporte[clave];
    const sello = mesesPublicados[clave];
    const hay = !abierto && !cargando && !!reporte;
    /* El cliente sólo puede bajar lo que ya se publicó; quien lo trabaja entra
       al archivo apenas existe. */
    const listo = hay && (descarga ? !!sello : !!reporte.enlace);

    let nota = "";
    if (!abierto && !cargando && !reporte) nota = `<span class="month-nota">Sin reporte</span>`;
    else if (hay && sello) nota = `<span class="month-nota es-publicado" title="Publicado por ${sello.por} el ${fechaCorta(sello.cuando)}">Publicado</span>`;
    else if (hay) nota = `<span class="month-nota">Sin publicar</span>`;

    return `<div class="month-row${abierto ? " is-future" : ""}">
      <span class="month-name">${mes}</span>
      ${nota}
      <button class="month-action" type="button" data-mes="${i}" ${listo ? "" : "disabled"}>${entrar}</button>
      ${aprueba ? `<button class="month-action is-approve${sello ? " esta-publicado" : ""}" type="button" data-aprobar="${i}" ${hay ? "" : "disabled"}>${sello ? "QUITAR PUBLICACIÓN" : "APROBAR Y PUBLICAR"}</button>` : ""}
    </div>`;
  }).join("");

  $$("[data-mes]").forEach((b) => (b.onclick = () =>
    (descarga ? bajarReporte : abrirEnDrive)(Number(b.dataset.mes))));
  $$("[data-aprobar]").forEach((b) => (b.onclick = () => cambiarPublicacion(Number(b.dataset.aprobar), b)));
}

/* Quien trabaja el reporte va al archivo donde vive, con su propia cuenta de
   Google. Si no tiene permiso, Drive le ofrece pedirlo: es la pantalla correcta
   para eso y no algo que el panel deba resolver por su cuenta. */
function abrirEnDrive(i) {
  const reporte = mesesConReporte[claveDeMes(Number($("#report-year").value), i)];
  if (!reporte || !reporte.enlace) return;
  window.open(reporte.enlace, "_blank", "noopener");
}

/* El archivo se pide a la propia API y no a Drive: así el cliente que descarga
   su reporte no necesita cuenta de Google ni acceso a la carpeta de la agencia. */
function bajarReporte(i) {
  const anio = Number($("#report-year").value);
  const reporte = mesesConReporte[claveDeMes(anio, i)];
  if (!reporte || !clienteActual) return;
  const enlace = document.createElement("a");
  enlace.href = `/api/drive?cliente=${encodeURIComponent(clienteActual.id)}&archivo=${encodeURIComponent(reporte.id)}`;
  enlace.download = reporte.nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
}

async function cambiarPublicacion(i, boton) {
  if (!clienteActual) return;
  const anio = Number($("#report-year").value);
  const clave = claveDeMes(anio, i);
  const publicar = !mesesPublicados[clave];
  const nombre = `${MESES[i].toLowerCase()} de ${anio}`;
  if (!publicar && !confirm(`Se va a quitar la publicación del reporte de ${nombre}. El cliente deja de poder descargarlo. ¿Seguís?`)) return;

  boton.disabled = true;
  try {
    const datos = await api("/api/drive", {
      method: "POST",
      body: { cliente: clienteActual.id, mes: clave, publicar },
    });
    mesesPublicados = datos.publicados || {};
    aviso(publicar
      ? `El reporte de ${nombre} quedó publicado: el cliente ya puede descargarlo.`
      : `El reporte de ${nombre} dejó de estar publicado.`);
  } catch (e) {
    aviso(`No se pudo guardar: ${e.message}`);
  }
  pintarMeses();
}

/* ── Seguimiento de tareas ───────────────────────────────────────────────
   Un tablero de Trello por cliente. El panel no habla con Trello: pide a
   /api/tareas, que tiene la credencial y decide quién puede mirar. */

let pedidoDeTareas = 0;
let tareasCargadas = null;
let filtroDeTareas = "todas";
/* Varios responsables a la vez: la pregunta suele ser «cómo van los tres de
   diseño», no «cómo va uno». */
const personasDeTareas = new Set();
const paginaDeTareas = {};

const SIN_RESPONSABLE = "__sin__";
const POR_PAGINA_TAREAS = [5, 10, 25, 50];

/* Los cuadros son el filtro: cada uno elige qué se lista abajo, y «Todas»
   muestra los seis paneles uno debajo del otro. */
const CUADROS_TAREAS = [
  { clave: "vencidas", etiqueta: "Vencidas", titulo: "Tareas vencidas", rotulo: "ATRASO", tono: "alerta",
    vacio: "Nada vencido. El tablero está al día.", prueba: (c) => c.vencida },
  { clave: "vencenHoy", etiqueta: "Vencen hoy", titulo: "Vencen hoy", rotulo: "HOY", tono: "aviso",
    vacio: "No vence nada hoy.", prueba: (c) => c.venceHoy },
  { clave: "esperandoRevision", etiqueta: "Esperando revisión", titulo: "Esperando revisión", rotulo: "TU COLA", tono: "",
    vacio: "No hay nada esperando revisión.", prueba: (c) => c.estado === "revision" },
  { clave: "bloqueadas", etiqueta: "Bloqueadas", titulo: "Bloqueadas y en espera", rotulo: "TRABADAS", tono: "",
    vacio: "No hay nada bloqueado.", prueba: (c) => c.estado === "bloqueada" },
  { clave: "enMarcha", etiqueta: "En marcha", titulo: "Todo lo que está en marcha", rotulo: "ACTIVO", tono: "",
    vacio: "No hay tareas en marcha.", prueba: (c) => c.viva },
  { clave: "sinFecha", etiqueta: "Sin fecha", titulo: "En marcha y sin fecha de entrega", rotulo: "SIN PLAZO", tono: "",
    vacio: "Todas las tareas en marcha tienen fecha.", prueba: (c) => c.viva && !c.vence },
];
const TODAS_TAREAS = { clave: "todas", etiqueta: "Todas", prueba: (c) => c.viva || c.estado === "bloqueada" };

/* Cuando algo falta o se rompe, un párrafo gris no ayuda a nadie: explica el
   problema y de paso hace sentir que el panel está roto. El perro con los dos
   cables cortados dice lo mismo, pero deja claro que es una situación prevista
   y no una pantalla colgada. */
const PERRO_ROTO = `<svg class="perro-roto" viewBox="0 0 240 190" role="img" aria-label="Un perro triste sosteniendo dos cables cortados">
  <ellipse cx="120" cy="176" rx="74" ry="9" fill="#e1d7ff" opacity=".55"/>
  <path d="M14 150 C 54 150, 66 128, 92 124" stroke="#9966ff" stroke-width="9" fill="none" stroke-linecap="round"/>
  <path d="M226 150 C 186 150, 174 128, 148 124" stroke="#331d75" stroke-width="9" fill="none" stroke-linecap="round"/>
  <path d="M100 120 l10 -4 M101 126 l11 1 M103 132 l10 5" stroke="#9966ff" stroke-width="3" stroke-linecap="round" fill="none"/>
  <path d="M140 120 l-10 -4 M139 126 l-11 1 M137 132 l-10 5" stroke="#331d75" stroke-width="3" stroke-linecap="round" fill="none"/>
  <path d="M120 100 l7 -13 -2.5 9 7.5 -2.5 -9 14 2.5 -8.5 z" fill="#ffb020"/>
  <path d="M56 120 q-16 -34 4 -50 q16 -12 24 10 z" fill="#c9b8a6"/>
  <path d="M184 120 q16 -34 -4 -50 q-16 -12 -24 10 z" fill="#c9b8a6"/>
  <path d="M120 24 c34 0 54 22 54 50 c0 30 -24 48 -54 48 c-30 0 -54 -18 -54 -48 c0 -28 20 -50 54 -50 z" fill="#e5d9cb"/>
  <ellipse cx="120" cy="96" rx="25" ry="19" fill="#f3ece3"/>
  <path d="M120 84 c7 0 11 4 11 8 c0 5 -5 8 -11 8 c-6 0 -11 -3 -11 -8 c0 -4 4 -8 11 -8 z" fill="#3b2f2a"/>
  <path d="M120 100 v8 M120 108 q-7 5 -13 1 M120 108 q7 5 13 1" stroke="#3b2f2a" stroke-width="2.6" fill="none" stroke-linecap="round"/>
  <path d="M92 66 q9 8 18 0" stroke="#3b2f2a" stroke-width="4" fill="none" stroke-linecap="round"/>
  <path d="M130 66 q9 8 18 0" stroke="#3b2f2a" stroke-width="4" fill="none" stroke-linecap="round"/>
  <path d="M88 52 q10 -6 20 -1" stroke="#b9a894" stroke-width="3.4" fill="none" stroke-linecap="round"/>
  <path d="M132 51 q10 -5 20 1" stroke="#b9a894" stroke-width="3.4" fill="none" stroke-linecap="round"/>
  <path d="M101 78 c4 6 6 9 6 12 a6 6 0 0 1 -12 0 c0 -3 2 -6 6 -12 z" fill="#7cc4f2"/>
  <ellipse cx="92" cy="128" rx="15" ry="11" fill="#e5d9cb"/>
  <ellipse cx="148" cy="128" rx="15" ry="11" fill="#e5d9cb"/>
</svg>`;

/* Un estado vacío con dibujo, para cuando no hay tablero o algo falló. */
const tarjetaRota = (mensaje) => `<div class="estado-roto">${PERRO_ROTO}
  <p class="estado-roto-titulo">Lo siento, algo se rompió</p>
  <p class="estado-roto-texto">${mensaje}</p>
</div>`;

const diaCorto = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("es-AR", { day: "numeric", month: "short" });
};
const horaCorta = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
};
/* Cuánto hace que venció, que es lo que se quiere saber de un vistazo. */
function atraso(iso) {
  const dias = Math.floor((Date.now() - new Date(iso)) / 86400000);
  if (dias <= 0) return "hoy";
  if (dias === 1) return "1 día";
  if (dias < 31) return `${dias} días`;
  const meses = Math.round(dias / 30);
  return meses === 1 ? "1 mes" : `${meses} meses`;
}

const deLasPersonas = (c) => !personasDeTareas.size
  || (personasDeTareas.has(SIN_RESPONSABLE) && !c.responsables.length)
  || c.responsables.some((r) => personasDeTareas.has(r));

const hojaDe = (clave) => (paginaDeTareas[clave] ||= { pagina: 1, porPagina: 5 });

async function pintarTareas(forzar = false) {
  const pedido = (pedidoDeTareas += 1);
  if (!clienteActual) return;
  tareasCargadas = null;
  $("#tasks-eyebrow").textContent = clienteActual.nombre.toUpperCase();
  $("#tasks-kpis").innerHTML = `<p class="tasks-vacio">Consultando Trello…</p>`;
  $("#tasks-gente").hidden = true;
  $("#tasks-panels").innerHTML = "";
  $("#tasks-leido").textContent = "";
  $("#tasks-board").hidden = true;
  if (forzar) aviso("Volviendo a leer el tablero…");

  let datos;
  try {
    datos = await api(`/api/tareas?cliente=${encodeURIComponent(clienteActual.id)}${forzar ? "&refrescar=1" : ""}`);
  } catch (e) {
    if (pedido !== pedidoDeTareas) return;
    $("#tasks-kpis").innerHTML = tarjetaRota(`No pudimos leer el tablero. ${e.message}`);
    return;
  }
  if (pedido !== pedidoDeTareas) return;

  if (!datos.tablero) {
    $("#tasks-title").textContent = "Sin tablero";
    $("#tasks-kpis").innerHTML = tarjetaRota(`${clienteActual.nombre} todavía no tiene un tablero de Trello conectado, así que no hay tareas que mostrar.`);
    return;
  }

  tareasCargadas = datos;
  /* Al cambiar de cliente, un responsable del tablero anterior no existe acá. */
  const conocidas = new Set(datos.personas.map((p) => p.persona || SIN_RESPONSABLE));
  for (const quien of [...personasDeTareas]) if (!conocidas.has(quien)) personasDeTareas.delete(quien);

  $("#tasks-title").textContent = datos.tablero.nombre;
  $("#tasks-leido").textContent = `Leído a las ${horaCorta(datos.leido)}`;
  const enlace = $("#tasks-board");
  enlace.hidden = false;
  enlace.href = datos.tablero.url;

  dibujarTareas();
}

function dibujarTareas() {
  if (!tareasCargadas) return;
  const propias = tareasCargadas.tarjetas.filter(deLasPersonas);

  /* Las cifras se recalculan con los responsables elegidos: la pregunta de un
     PM no es «cuántas hay vencidas» sino «cuántas tienen vencidas estos». */
  $("#tasks-kpis").innerHTML = [TODAS_TAREAS, ...CUADROS_TAREAS].map((c) => {
    const valor = propias.filter(c.prueba).length;
    const clases = ["kpi-card", "tasks-card"];
    if (valor && c.tono) clases.push(`es-${c.tono}`);
    if (c.clave === filtroDeTareas) clases.push("selected");
    return `<button class="${clases.join(" ")}" type="button" data-tarea-filtro="${c.clave}">
      <span class="kpi-label">${c.etiqueta}</span>
      <strong class="kpi-value">${valor}</strong>
    </button>`;
  }).join("");
  $$("[data-tarea-filtro]").forEach((b) => (b.onclick = () => {
    filtroDeTareas = b.dataset.tareaFiltro;
    dibujarTareas();
  }));

  pintarChipsDePersonas();

  const cuadros = filtroDeTareas === "todas"
    ? CUADROS_TAREAS
    : [CUADROS_TAREAS.find((c) => c.clave === filtroDeTareas) || CUADROS_TAREAS[0]];

  $("#tasks-panels").innerHTML =
    cuadros.map((c) => tablaDeTareas(c, propias.filter(c.prueba))).join("")
    + tablaDePersonas(tareasCargadas.personas);

  $$("[data-tarea-pagina]").forEach((b) => (b.onclick = () => {
    const [clave, n] = b.dataset.tareaPagina.split(":");
    hojaDe(clave).pagina = Number(n);
    dibujarTareas();
  }));
  $$("[data-tarea-porpagina]").forEach((sel) => (sel.onchange = () => {
    const hoja = hojaDe(sel.dataset.tareaPorpagina);
    hoja.porPagina = Number(sel.value);
    hoja.pagina = 1;
    dibujarTareas();
  }));
  $$("[data-tarea-persona]").forEach((b) => (b.onclick = () => alternarPersona(b.dataset.tareaPersona)));
}

function alternarPersona(quien) {
  if (!quien) personasDeTareas.clear();
  else if (personasDeTareas.has(quien)) personasDeTareas.delete(quien);
  else personasDeTareas.add(quien);
  /* Con otro filtro el largo de cada panel cambia; volver a la página tres de
     algo que ahora tiene una sola no sirve de nada. */
  for (const clave of Object.keys(paginaDeTareas)) paginaDeTareas[clave].pagina = 1;
  dibujarTareas();
}

/* Los responsables se eligen como los objetivos del panel: botones en píldora,
   varios a la vez, y «Todo el equipo» que los apaga a todos. */
function pintarChipsDePersonas() {
  const fila = $("#tasks-gente");
  const personas = tareasCargadas.personas;
  fila.hidden = !personas.length;
  if (!personas.length) return;

  const chip = (valor, texto, cuantas, activo) =>
    `<button class="objective-button ${activo ? "active" : ""}" type="button" data-tarea-persona="${valor}">${texto}${cuantas === null ? "" : ` <b>${cuantas}</b>`}</button>`;

  $("#tasks-gente-chips").innerHTML =
    chip("", "Todo el equipo", null, !personasDeTareas.size)
    + personas.map((p) => {
      const valor = p.persona || SIN_RESPONSABLE;
      return chip(valor, p.persona || "Sin responsable", p.enMarcha, personasDeTareas.has(valor));
    }).join("");
}

function tablaDeTareas(cuadro, tarjetas) {
  const conAtraso = cuadro.clave === "vencidas";
  const conFecha = cuadro.clave !== "sinFecha";
  const cabecera = `<div class="panel-heading">
      <div><p class="eyebrow">${cuadro.rotulo}</p><h2>${cuadro.titulo}</h2></div>
      <span class="tasks-leido">${tarjetas.length}</span>
    </div>`;

  if (!tarjetas.length)
    return `<section class="panel">${cabecera}<p class="tasks-vacio">${cuadro.vacio}</p></section>`;

  /* Un panel con cuarenta filas empuja todo lo demás fuera de la pantalla: se
     muestran las primeras y el usuario decide si quiere ver más. */
  const hoja = hojaDe(cuadro.clave);
  const paginas = Math.max(1, Math.ceil(tarjetas.length / hoja.porPagina));
  if (hoja.pagina > paginas) hoja.pagina = paginas;
  const desde = (hoja.pagina - 1) * hoja.porPagina;
  const visibles = tarjetas.slice(desde, desde + hoja.porPagina);

  const filas = visibles.map((c) => {
    const avance = c.checklist ? `<span class="tasks-checklist">${c.checklist.hechos}/${c.checklist.total}</span>` : "";
    const quienes = c.responsables.length
      ? c.responsables.join(", ")
      : `<span class="tasks-sin">sin responsable</span>`;
    return `<tr>
      <td><a class="tasks-link" href="${c.url}" target="_blank" rel="noopener">${c.nombre}</a>${avance}</td>
      <td>${c.lista}</td>
      <td>${quienes}</td>
      ${conFecha ? `<td>${c.vence ? diaCorto(c.vence) : "—"}</td>` : `<td>${diaCorto(c.ultimoMovimiento)}</td>`}
      ${conAtraso ? `<td><span class="tasks-atraso">${atraso(c.vence)}</span></td>` : ""}
    </tr>`;
  }).join("");

  const pie = tarjetas.length <= POR_PAGINA_TAREAS[0] ? "" : `<div class="paginado">
      <label>Ver <select data-tarea-porpagina="${cuadro.clave}">${POR_PAGINA_TAREAS
        .map((n) => `<option value="${n}" ${n === hoja.porPagina ? "selected" : ""}>${n}</option>`).join("")}</select> por página</label>
      <span>${desde + 1} a ${desde + visibles.length} de ${tarjetas.length}</span>
      <span class="paginado-botones">
        <button data-tarea-pagina="${cuadro.clave}:1" type="button" ${hoja.pagina === 1 ? "disabled" : ""}>«</button>
        <button data-tarea-pagina="${cuadro.clave}:${hoja.pagina - 1}" type="button" ${hoja.pagina === 1 ? "disabled" : ""}>‹</button>
        <b>${hoja.pagina} / ${paginas}</b>
        <button data-tarea-pagina="${cuadro.clave}:${hoja.pagina + 1}" type="button" ${hoja.pagina === paginas ? "disabled" : ""}>›</button>
        <button data-tarea-pagina="${cuadro.clave}:${paginas}" type="button" ${hoja.pagina === paginas ? "disabled" : ""}>»</button>
      </span>
    </div>`;

  return `<section class="panel">${cabecera}
    <div class="table-scroll"><table class="module-table tasks-table">
      <thead><tr><th>TAREA</th><th>LISTA</th><th>RESPONSABLE</th><th>${conFecha ? "VENCE" : "ÚLTIMO MOVIMIENTO"}</th>${conAtraso ? "<th>ATRASO</th>" : ""}</tr></thead>
      <tbody>${filas}</tbody>
    </table></div>
    ${pie}
    <p class="table-help">El nombre abre la tarjeta en Trello.</p>
  </section>`;
}

function tablaDePersonas(personas) {
  if (!personas.length) return "";
  const filas = personas.map((p) => {
    const valor = p.persona || SIN_RESPONSABLE;
    const cero = (n) => (n ? n : `<span class="tasks-cero">0</span>`);
    return `<tr class="${personasDeTareas.has(valor) ? "es-elegida" : ""}" data-tarea-persona="${valor}">
      <td>${p.persona || `<span class="tasks-sin">sin responsable</span>`}</td>
      <td>${cero(p.pendiente)}</td>
      <td>${cero(p.progreso)}</td>
      <td>${cero(p.revision)}</td>
      <td><strong>${p.enMarcha}</strong></td>
      <td>${p.vencidas ? `<span class="tasks-atraso">${p.vencidas}</span>` : `<span class="tasks-cero">0</span>`}</td>
      <td>${cero(p.bloqueadas)}</td>
    </tr>`;
  }).join("");
  return `<section class="panel">
    <div class="panel-heading"><div><p class="eyebrow">EQUIPO</p><h2>Carga por persona</h2></div></div>
    <div class="table-scroll"><table class="module-table tasks-table tasks-personas">
      <thead>
        <tr>
          <th rowspan="2">PERSONA</th>
          <th colspan="4" class="tasks-grupo">EN MARCHA</th>
          <th rowspan="2">VENCIDAS</th>
          <th rowspan="2">BLOQUEADAS</th>
        </tr>
        <tr>
          <th>PARA HACER</th><th>EN PROGRESO</th><th>EN REVISIÓN</th><th>TOTAL</th>
        </tr>
      </thead>
      <tbody>${filas}</tbody>
    </table></div>
    <p class="table-help"><b>En marcha</b> es todo lo que está abierto: sin empezar, en progreso o esperando que el PM lo revise.
      <b>Vencidas</b> son tareas en marcha cuya fecha de entrega ya pasó, así que están contadas también en alguna de las tres columnas de la izquierda.
      <b>Bloqueadas</b> va aparte porque una tarea frenada no está en marcha. Lo entregado no se cuenta: no dice cómo está alguien hoy.
      Una tarea con varios responsables suma para cada uno, y por eso la suma de la columna no da el total del tablero.
      Clic en una fila para filtrar por esa persona.</p>
  </section>`;
}

/* ── Usuarios y accesos ──────────────────────────────────────────────────
   Todo pasa por el servidor: la lista vive cifrada del otro lado y las reglas
   (no borrarse a uno mismo, que siempre quede un administrador) las impone la
   API, no el navegador. */

async function api(ruta, opciones = {}) {
  const r = await fetch(ruta, {
    credentials: "same-origin",
    headers: opciones.body ? { "content-type": "application/json" } : undefined,
    ...opciones,
    body: opciones.body ? JSON.stringify(opciones.body) : undefined,
  });
  const datos = await r.json().catch(() => ({}));
  if (!r.ok) {
    const error = new Error(datos.error || `El servidor respondió ${r.status}.`);
    error.status = r.status;
    throw error;
  }
  return datos;
}
window.apiEmisarios = api;

let usuarios = [];
let clientes = [];

/* Qué cuentas puede ver cada cliente sale de lo que esté conectado en Windsor:
   la matriz del alta de usuarios se arma con esa respuesta, no con una lista
   escrita a mano. */
async function cargarClientes() {
  try {
    clientes = (await api("/api/cuentas")).clientes || [];
  } catch (e) {
    clientes = [];
  }
  if (window.PanelEmisarios && window.PanelEmisarios.clientesListos)
    window.PanelEmisarios.clientesListos(clientes);
}

function pintarUsuarios() {
  $("#users-count").textContent = `${usuarios.length} usuario${usuarios.length === 1 ? "" : "s"}`;
  $("#users-body").innerHTML = usuarios.map((u) => `
    <tr>
      <td><strong>${u.usuario}</strong>${u.yo ? '<span class="you-badge">vos</span>' : ""}<small>${u.nombre || ""}</small></td>
      <td>${u.rol}</td>
      <td>${u.alcance || "—"}</td>
      <td>${u.acceso || "—"}</td>
      <td><span class="tag ${u.activo !== false ? "tag-on" : "tag-off"}">${u.activo !== false ? "Activo" : "Inactivo"}</span></td>
      <td>
        <button class="row-action" data-editar="${u.id}">Editar</button>
        <button class="row-action" data-clave="${u.id}">Nueva contraseña</button>
        <button class="row-action" data-estado="${u.id}">${u.activo !== false ? "Desactivar" : "Activar"}</button>
        <button class="row-action danger" data-borrar="${u.id}">Borrar</button>
      </td>
    </tr>`).join("");

  $$("[data-editar]").forEach((b) => (b.onclick = () => abrirFormulario(b.dataset.editar)));
  $$("[data-clave]").forEach((b) => (b.onclick = () => abrirCambioClave(b.dataset.clave)));
  $$("[data-estado]").forEach((b) => (b.onclick = () => cambiarEstado(b.dataset.estado)));
  $$("[data-borrar]").forEach((b) => (b.onclick = () => abrirBorrado(b.dataset.borrar)));
}

function marcarme(lista) {
  usuarios = (lista || []).map((u) => ({ ...u, yo: !!sesion && u.id === sesion.id }));
  pintarUsuarios();
}

async function cargarUsuarios() {
  try {
    marcarme((await api("/api/usuarios")).usuarios);
  } catch (e) {
    aviso(e.message);
  }
}

async function cambiarEstado(id) {
  const u = usuarios.find((x) => x.id === id);
  try {
    marcarme((await api("/api/usuarios", { method: "PUT", body: { id, activo: u.activo === false } })).usuarios);
    aviso(`${u.usuario} quedó ${u.activo === false ? "activo" : "inactivo"}.`);
  } catch (e) {
    aviso(e.message);
  }
}

/* Borrado con confirmación */
const dialogoBorrado = $("#delete-dialog");
let idABorrar = null;
function abrirBorrado(id) {
  const u = usuarios.find((x) => x.id === id);
  idABorrar = id;
  $("#delete-target").textContent = u.usuario;
  dialogoBorrado.showModal();
}
$("#delete-cancel").onclick = () => dialogoBorrado.close();
$("#delete-confirm").onclick = async () => {
  dialogoBorrado.close();
  try {
    marcarme((await api(`/api/usuarios?id=${encodeURIComponent(idABorrar)}`, { method: "DELETE" })).usuarios);
    aviso("Usuario eliminado.");
  } catch (e) {
    aviso(e.message);
  }
};

/* Cambio de contraseña desde la administración */
const dialogoClave = $("#password-dialog");
let idClave = null;
function abrirCambioClave(id) {
  idClave = id;
  $("#password-target").textContent = (usuarios.find((u) => u.id === id).nombre || "").toUpperCase();
  $("#np-1").value = ""; $("#np-2").value = "";
  $("#password-error").hidden = true;
  dialogoClave.showModal();
}
$("#password-cancel").onclick = () => dialogoClave.close();
$("#password-confirm").onclick = async () => {
  const a = $("#np-1").value, b = $("#np-2").value, err = $("#password-error");
  if (a.length < 12) { err.textContent = "Mínimo 12 caracteres."; err.hidden = false; return; }
  if (a !== b) { err.textContent = "Las dos contraseñas no coinciden."; err.hidden = false; return; }
  try {
    await api("/api/usuarios", { method: "PUT", body: { id: idClave, clave: a } });
    dialogoClave.close();
    aviso(`Contraseña actualizada para ${usuarios.find((u) => u.id === idClave).usuario}.`);
  } catch (e) {
    err.textContent = e.message; err.hidden = false;
  }
};

/* Alta y edición */
let idEditando = null;
function pintarMatriz(seleccion) {
  /* La matriz lista todos los clientes y todas las cuentas conectadas en
     Windsor. Cuando un cliente tiene dos perfiles de la misma red, cada uno es
     una casilla aparte con el nombre del perfil: son accesos distintos. */
  const esAdmin = $("#f-role").value === "Administrador" || $("#f-role").value === "PM";
  const columnas = Math.max(1, ...clientes.map((c) => c.cuentas.length));
  const matriz = $("#accounts-matrix");
  matriz.style.setProperty("--columnas", columnas);
  if (!clientes.length) {
    matriz.innerHTML = '<p class="form-note">No se pudieron leer las cuentas conectadas en Windsor.</p>';
    return;
  }
  matriz.innerHTML =
    (esAdmin ? '<p class="form-note">El administrador y el Project Manager ven todas las cuentas conectadas. Para dar acceso a algunas nada más, elegí Especialista o Cliente.</p>' : "") +
    clientes.map((fila) => `
      <div class="accounts-row">
        <label class="cliente-todo"><input type="checkbox" data-cliente-todo="${fila.id}" ${esAdmin ? "disabled" : ""}> <strong>${fila.nombre}</strong></label>
        ${fila.cuentas.map((cuenta) => {
          const id = `${fila.id}-${cuenta.id}`;
          const marcada = esAdmin || seleccion.includes(id);
          return `<label><input type="checkbox" data-cuenta="${id}" ${marcada ? "checked" : ""} ${esAdmin ? "disabled" : ""}> ${cuenta.titulo}</label>`;
        }).join("")}
      </div>`).join("");
  conectarMatriz();
}

/* El tilde del cliente refleja lo que hay debajo: marcado si están todas sus
   cuentas, a medias si son algunas. Y al tocarlo las enciende o apaga juntas,
   que es la forma rápida de dar un cliente entero. */
function conectarMatriz() {
  const deCliente = (id) => $$(`[data-cuenta^="${id}-"]`);
  const refrescar = (id) => {
    const cajas = deCliente(id);
    const maestro = $(`[data-cliente-todo="${id}"]`);
    if (!maestro || !cajas.length) return;
    const tildadas = cajas.filter((c) => c.checked).length;
    maestro.checked = tildadas === cajas.length;
    maestro.indeterminate = tildadas > 0 && tildadas < cajas.length;
  };
  $$("[data-cliente-todo]").forEach((maestro) => {
    const id = maestro.dataset.clienteTodo;
    refrescar(id);
    maestro.onchange = () => {
      deCliente(id).forEach((c) => (c.checked = maestro.checked));
      maestro.indeterminate = false;
    };
  });
  $$("[data-cuenta]").forEach((caja) => (caja.onchange = () => refrescar(caja.dataset.cuenta.split("-")[0])));
}

/* Al cambiar el rol se vuelve a dibujar: administrador implica todas. */
$("#f-role").onchange = () => pintarMatriz(seleccionActual());
function seleccionActual() {
  return $$("[data-cuenta]").filter((i) => i.checked).map((i) => i.dataset.cuenta);
}

function abrirFormulario(id) {
  idEditando = id || null;
  const u = id ? usuarios.find((x) => x.id === id) : null;
  $("#new-user-title").textContent = u ? `Editar usuario · ${u.usuario}` : "Alta de Nuevo Usuario";
  $("#save-user").textContent = u ? "Guardar cambios" : "Crear y generar contraseña";
  $("#f-user").value = u ? u.usuario : "";
  $("#f-name").value = u ? u.nombre || "" : "";
  $("#f-mail").value = u && u.correo ? u.correo : "";
  $("#f-role").value = u ? u.rol : "Cliente";
  $("#form-error").hidden = true;
  pintarMatriz(u && u.cuentas ? u.cuentas : []);
  mostrarVista("new-user");
  pintarRuta(rutaDeVista("new-user"));
}
$("#new-user").onclick = () => abrirFormulario(null);
$("#cancel-user").onclick = () => mostrarVista("users");

/* La contraseña provisional se arma en el navegador y viaja una sola vez: el
   servidor guarda sólo el hash, así que no hay forma de volver a leerla. */
function nuevaClave() {
  const abc = "abcdefghijkmnopqrstuvwxyzACDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from(crypto.getRandomValues(new Uint8Array(14)), (b) => abc[b % abc.length]).join("");
}

$("#user-form").onsubmit = async (e) => {
  e.preventDefault();
  const err = $("#form-error");
  const usuario = $("#f-user").value.trim(), nombre = $("#f-name").value.trim();
  const correo = $("#f-mail").value.trim();
  if (!usuario || !nombre) { err.textContent = "El nombre de usuario y el nombre son obligatorios."; err.hidden = false; return; }
  /* El correo dejó de ser opcional: sin él no hay forma de recuperar el acceso. */
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) { err.textContent = "Hace falta un correo válido: es por donde se recupera la contraseña."; err.hidden = false; return; }

  const rol = $("#f-role").value;
  const veTodo = rol === "Administrador" || rol === "PM";
  const cuentas = veTodo ? [] : seleccionActual();
  const alcance = veTodo
    ? "Todas las cuentas"
    : cuentas.length ? `${cuentas.length} cuenta${cuentas.length === 1 ? "" : "s"}` : "Sin cuentas";

  try {
    if (idEditando) {
      marcarme((await api("/api/usuarios", {
        method: "PUT",
        body: { id: idEditando, usuario, nombre, correo, rol, alcance, cuentas },
      })).usuarios);
      aviso("Usuario actualizado.");
    } else {
      const clave = nuevaClave();
      marcarme((await api("/api/usuarios", {
        method: "POST",
        body: { usuario, nombre, correo, rol, alcance, cuentas, clave },
      })).usuarios);
      window.prompt(`Contraseña provisional de ${usuario}. Copiala ahora: no se vuelve a mostrar.`, clave);
      aviso(`Usuario ${usuario} creado.`);
    }
    mostrarVista("users");
  } catch (error) {
    err.textContent = error.message;
    err.hidden = false;
  }
};

/* ── Mi perfil ───────────────────────────────────────────────────────── */
$("#profile-form").onsubmit = async (e) => {
  e.preventDefault();
  const actual = $("#p-current").value, nueva = $("#p-new").value, repetida = $("#p-repeat").value;
  const err = $("#profile-error");
  if (!actual) { err.textContent = "Escribí tu contraseña actual."; return; }
  if (nueva.length < 12) { err.textContent = "Mínimo 12 caracteres."; return; }
  if (nueva !== repetida) { err.textContent = "Las dos contraseñas no coinciden."; return; }
  try {
    /* La actual se comprueba contra el login: así nadie cambia la contraseña
       de una sesión que otra persona dejó abierta. */
    await api("/api/login", { method: "POST", body: { usuario: sesion.usuario, clave: actual } });
    await api("/api/usuarios", { method: "PUT", body: { id: sesion.id, clave: nueva, soloClave: true } });
    err.textContent = "";
    $("#profile-form").reset();
    aviso("Contraseña cambiada.");
  } catch (error) {
    err.textContent = error.status === 401 ? "La contraseña actual no es correcta." : error.message;
  }
};

/* ── Acceso al panel ─────────────────────────────────────────────────── */
let sesion = null;

function entrar(datos) {
  sesion = datos;
  document.body.classList.remove("sin-sesion");
  $("#login-screen").hidden = true;
  mostrarTarjeta("login-form");
  $("#profile-name").textContent = datos.nombre || datos.usuario;
  const TITULO_ROL = {
    Administrador: "Administrador del panel",
    PM: "Project Manager",
    Especialista: "Especialista de Paid Media",
    Cliente: "Cliente",
  };
  $("#profile-role").textContent = TITULO_ROL[datos.rol] || datos.rol;
  // Sólo un administrador entra a la sección de accesos.
  $('[data-view="users"]').hidden = datos.rol !== "Administrador";
  // Las tareas del equipo son para quien las controla, no para quien las hace.
  $('[data-view="tasks"]').hidden = !["Administrador", "PM"].includes(datos.rol);
  cargarUsuarios();
  // cargarClientes elige el primer cliente y eso dispara la consulta a Windsor.
  cargarClientes();
  mostrarVista("dashboard");
}

async function cerrarSesion() {
  try { await api("/api/logout", { method: "POST" }); } catch (e) { /* ya estaba cerrada */ }
  sesion = null;
  usuarios = [];
  document.body.classList.add("sin-sesion");
  $("#login-screen").hidden = false;
  $("#login-pass").value = "";
  $("#login-error").hidden = true;
}

$("#login-form").onsubmit = async (e) => {
  e.preventDefault();
  const err = $("#login-error");
  const boton = $("#login-form button[type=submit]");
  boton.disabled = true;
  try {
    const datos = await api("/api/login", {
      method: "POST",
      body: { usuario: $("#login-user").value.trim(), clave: $("#login-pass").value },
    });
    err.hidden = true;
    entrar(datos.sesion);
  } catch (error) {
    err.textContent = error.message;
    err.hidden = false;
  } finally {
    boton.disabled = false;
  }
};

/* ── Ver la contraseña mientras se escribe ───────────────────────────── */
$$("[data-ver]").forEach((b) => (b.onclick = () => {
  const campo = $(`#${b.dataset.ver}`);
  const mostrando = campo.type === "text";
  campo.type = mostrando ? "password" : "text";
  b.setAttribute("aria-pressed", String(!mostrando));
  b.setAttribute("aria-label", mostrando ? "Mostrar la contraseña" : "Ocultar la contraseña");
  campo.focus();
}));

/* ── Recuperar la contraseña ─────────────────────────────────────────── */
function mostrarTarjeta(cual) {
  ["login-form", "recuperar-form", "restablecer-form"].forEach((id) => ($(`#${id}`).hidden = id !== cual));
}
$("#ir-recuperar").onclick = () => {
  $("#recuperar-error").hidden = true;
  $("#recuperar-ok").hidden = true;
  mostrarTarjeta("recuperar-form");
};
$("#volver-login").onclick = () => mostrarTarjeta("login-form");

$("#recuperar-form").onsubmit = async (e) => {
  e.preventDefault();
  const err = $("#recuperar-error"), ok = $("#recuperar-ok");
  err.hidden = true; ok.hidden = true;
  try {
    const r = await api("/api/recuperar", { method: "POST", body: { quien: $("#recuperar-quien").value } });
    ok.textContent = r.mensaje;
    ok.hidden = false;
  } catch (error) {
    err.textContent = error.message;
    err.hidden = false;
  }
};

/* El enlace del correo trae el testigo en la dirección. */
const testigoRecuperacion = new URLSearchParams(location.search).get("restablecer");

$("#restablecer-form").onsubmit = async (e) => {
  e.preventDefault();
  const err = $("#restablecer-error");
  const a = $("#nueva-clave").value, b = $("#nueva-clave-2").value;
  err.hidden = true;
  if (a.length < 12) { err.textContent = "Mínimo 12 caracteres."; err.hidden = false; return; }
  if (a !== b) { err.textContent = "Las dos contraseñas no coinciden."; err.hidden = false; return; }
  try {
    const r = await api("/api/restablecer", { method: "POST", body: { testigo: testigoRecuperacion, clave: a } });
    history.replaceState(null, "", location.pathname);
    mostrarTarjeta("login-form");
    entrar(r.sesion);
    aviso("Contraseña cambiada. Ya estás dentro.");
  } catch (error) {
    err.textContent = error.message;
    err.hidden = false;
  }
};

/* Al cargar se pregunta si la cookie sigue valiendo: así recargar la página no
   obliga a escribir la contraseña otra vez. */
(async () => {
  document.body.classList.add("sin-sesion");
  if (testigoRecuperacion) {
    mostrarTarjeta("restablecer-form");
    $("#login-screen").hidden = false;
    return;
  }
  try {
    entrar((await api("/api/sesion")).sesion);
  } catch (e) {
    $("#login-screen").hidden = false;
  }
})();
