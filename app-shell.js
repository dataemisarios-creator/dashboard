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
const VISTAS = ["dashboard", "reports", "users", "new-user", "profile"];
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
  window.scrollTo({ top: 0 });
}

$$("[data-view]").forEach((b) => (b.onclick = () => mostrarVista(b.dataset.view)));
$$("[data-platform]").forEach((b) => b.addEventListener("click", () => mostrarVista("dashboard")));

/* ── Lateral: contraído y desplegado al pasar el mouse ───────────────── */
$("#sidebar-toggle").onclick = () => {
  const contraido = $("#app-shell").classList.toggle("collapsed");
  $("#sidebar-toggle").setAttribute("aria-pressed", String(contraido));
  aviso(contraido ? "Panel contraído. Pasá el mouse por encima para desplegarlo." : "Panel desplegado.");
};

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
function cerrarLateral() { lateral.classList.remove("expanded"); }
function esEscritorio() { return window.innerWidth > 700; }

lateral.addEventListener("mouseover", desplegarLateral);
lateral.addEventListener("mouseleave", cerrarLateral);
lateral.addEventListener("focusin", desplegarLateral);
lateral.addEventListener("focusout", (e) => { if (!lateral.contains(e.relatedTarget)) cerrarLateral(); });
/* Al elegir una sección el panel se cierra solo: si no, el clic repinta la vista
   y el puntero queda sobre el contenido sin que llegue a dispararse mouseleave. */
lateral.addEventListener("click", (e) => {
  if (!e.target.closest(".nav-item, .logout, .client-switcher")) return;
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
  $("#connection-text").textContent = conexionViva ? "Datos Sincronizados" : "DATOS NO CONECTADOS";
  c.title = conexionViva ? "Datos al día. Clic para volver a consultar." : (detalleConexion || "No se pudo consultar Windsor. Clic para reintentar.");
}
$("#connection").onclick = () => {
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
  rutaDelPanel: () => { if (vistaActiva === "dashboard") pintarRuta(rutaDeVista("dashboard")); },
  conexion: (viva, detalle) => { conexionViva = viva; detalleConexion = detalle || ""; pintarConexion(); },
  recargarDatos: () => { if (window.DatosEmisarios) window.DatosEmisarios.cargar(); },
  clientesListos: (lista) => pintarClientes(lista),
};

/* El selector de cliente se arma con lo que devuelve /api/cuentas. */
let clienteActual = null;
function pintarClientes(lista) {
  if (!lista.length) return;
  if (!clienteActual) elegirCliente(lista[0]);
  $("#client-switcher").onclick = () => {
    const actual = lista.findIndex((c) => c.id === clienteActual.id);
    elegirCliente(lista[(actual + 1) % lista.length]);
  };
  $("#client-switcher").title = lista.length > 1 ? "Clic para cambiar de cliente" : clienteActual.nombre;
}
function elegirCliente(cliente) {
  clienteActual = cliente;
  $(".client-avatar").textContent = cliente.inicial;
  $(".client-name").textContent = cliente.nombre;
  if (window.DatosEmisarios) window.DatosEmisarios.elegirCliente(cliente.id, cliente.nombre);
  rutaDelPanelSiCorresponde();
}
function rutaDelPanelSiCorresponde() {
  if (vistaActiva === "dashboard") pintarRuta(rutaDeVista("dashboard"));
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

$("#export-view").onclick = () => {
  cabeceraImpresion(currentPlatform().title, resumenFiltros());
  aviso("Preparando el PDF de la vista actual…");
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
  const fin = new Date(`${state.end}T12:00:00`), inicio = new Date(fin);
  const modo = b.dataset.downloadPeriod;
  if (modo === "yesterday") { inicio.setDate(inicio.getDate() - 1); fin.setDate(fin.getDate() - 1); }
  else if (modo === "last7") inicio.setDate(inicio.getDate() - 6);
  else if (modo === "last14") inicio.setDate(inicio.getDate() - 13);
  else if (modo === "thisMonth") inicio.setDate(1);
  else if (modo === "lastMonth") { fin.setDate(0); inicio.setTime(fin.getTime()); inicio.setDate(1); }
  else if (modo === "custom") return;
  $("#download-start").value = toISO(inicio);
  $("#download-end").value = toISO(fin);
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

/* ── Reportes ────────────────────────────────────────────────────────── */
function pintarReportes() {
  $("#report-grid").innerHTML = Object.entries(platforms).map(([id, p]) =>
    `<button class="report-card" type="button" data-report="${id}"><strong>${p.title}</strong><small>PDF de la vista con los filtros aplicados</small></button>`).join("") +
    `<button class="report-card" type="button" data-report="__todo"><strong>Todas las cuentas</strong><small>Un PDF con las cinco vistas</small></button>`;
  $$("[data-report]").forEach((b) => (b.onclick = () => {
    if (b.dataset.report === "__todo") { $("#export-all").click(); return; }
    setPlatform(b.dataset.report);
    mostrarVista("dashboard");
    filtrosAplicados();
    setTimeout(() => $("#export-view").click(), 150);
  }));
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
  const columnas = Math.max(1, ...clientes.map((c) => c.cuentas.length));
  $("#accounts-matrix").style.setProperty("--columnas", columnas);
  $("#accounts-matrix").innerHTML = clientes.length
    ? clientes.map((fila) => `
      <div class="accounts-row">
        <strong>${fila.nombre}</strong>
        ${fila.cuentas.map((cuenta) => {
          const id = `${fila.id}-${cuenta.id}`;
          return `<label><input type="checkbox" data-cuenta="${id}" ${seleccion.includes(id) ? "checked" : ""}> ${cuenta.titulo}</label>`;
        }).join("")}
      </div>`).join("")
    : '<p class="form-note">No se pudieron leer las cuentas conectadas en Windsor.</p>';
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
  if (!usuario || !nombre) { err.textContent = "El nombre de usuario y el nombre son obligatorios."; err.hidden = false; return; }

  const cuentas = $$("[data-cuenta]").filter((i) => i.checked).map((i) => i.dataset.cuenta);
  const rol = $("#f-role").value;
  const alcance = rol === "Cliente" ? (cuentas.length ? `${cuentas.length} cuentas asignadas` : "Sin cuentas") : "Todas las cuentas";
  const correo = $("#f-mail").value.trim();

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
  $("#profile-name").textContent = datos.nombre || datos.usuario;
  $("#profile-role").textContent = datos.rol === "Administrador" ? "Administrador del panel"
    : datos.rol === "Especialista" ? "Especialista de Paid Media" : "Cliente";
  // Sólo un administrador entra a la sección de accesos.
  $('[data-view="users"]').hidden = datos.rol !== "Administrador";
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

/* Al cargar se pregunta si la cookie sigue valiendo: así recargar la página no
   obliga a escribir la contraseña otra vez. */
(async () => {
  document.body.classList.add("sin-sesion");
  try {
    entrar((await api("/api/sesion")).sesion);
  } catch (e) {
    $("#login-screen").hidden = false;
  }
})();
