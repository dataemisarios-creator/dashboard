import {
  exigirSesion,
  guardarUsuarios,
  hashear,
  leerUsuarios,
  sinHash,
} from './_comun.js';

const esAdmin = (sesion) => sesion.rol === 'Administrador';
const SIN_ACCESO_A_USUARIOS = 'Gestionar accesos es potestad del administrador.';
const activos = (lista) => lista.filter((u) => u.rol === 'Administrador' && u.activo !== false).length;

export default async function handler(req, res) {
  const sesion = exigirSesion(req, res);
  if (!sesion) return;

  const usuarios = await leerUsuarios();

  if (req.method === 'GET') {
    // Quien no administra sólo se ve a sí mismo.
    const visibles = esAdmin(sesion) ? usuarios : usuarios.filter((u) => u.id === sesion.id);
    return res.status(200).json({ usuarios: visibles.map(sinHash) });
  }

  /* Cambiar la propia contraseña es lo único que no exige ser administrador. */
  const cambioPropio =
    req.method === 'PUT' && req.body?.id === sesion.id && req.body?.soloClave;
  if (!esAdmin(sesion) && !cambioPropio)
    return res.status(403).json({ error: SIN_ACCESO_A_USUARIOS });

  if (req.method === 'POST') {
    const { usuario, nombre, correo, rol, alcance, cuentas, clave, activo = true } = req.body || {};
    if (!usuario || !clave) return res.status(400).json({ error: 'Faltan el usuario y la contraseña.' });
    if (usuarios.some((u) => String(u.usuario).toLowerCase() === String(usuario).toLowerCase()))
      return res.status(409).json({ error: 'Ya existe un usuario con ese nombre.' });
    const nuevo = {
      id: `u${Date.now().toString(36)}`,
      usuario: String(usuario).trim(),
      nombre: nombre || usuario,
      rol: rol || 'Lectura',
      alcance: alcance || 'Todas las cuentas',
      correo: correo || '',
      activo: activo !== false,
      cuentas: Array.isArray(cuentas) ? cuentas : [],
      hash: hashear(String(clave)),
    };
    const lista = [...usuarios, nuevo];
    await guardarUsuarios(lista);
    return res.status(201).json({ usuarios: lista.map(sinHash) });
  }

  if (req.method === 'PUT') {
    const { id, usuario, nombre, correo, rol, alcance, cuentas, clave, activo } = req.body || {};
    const indice = usuarios.findIndex((u) => u.id === id);
    if (indice < 0) return res.status(404).json({ error: 'Ese usuario ya no existe.' });

    const anterior = usuarios[indice];
    const actualizado = { ...anterior };
    if (!cambioPropio) {
      if (usuario) actualizado.usuario = String(usuario).trim();
      if (nombre) actualizado.nombre = nombre;
      if (rol) actualizado.rol = rol;
      if (alcance) actualizado.alcance = alcance;
      if (correo !== undefined) actualizado.correo = correo;
      if (Array.isArray(cuentas)) actualizado.cuentas = cuentas;
      if (activo !== undefined) actualizado.activo = activo !== false;
    }
    if (clave) actualizado.hash = hashear(String(clave));

    const lista = usuarios.map((u, i) => (i === indice ? actualizado : u));

    /* Tres reglas que el servidor impone siempre, venga de donde venga el
       pedido: nadie se quita a sí mismo la administración, nadie se desactiva
       solo, y la lista nunca se queda sin ningún administrador activo. */
    if (anterior.id === sesion.id && actualizado.rol !== 'Administrador')
      return res.status(400).json({ error: 'No podés quitarte a vos mismo la administración.' });
    if (anterior.id === sesion.id && actualizado.activo === false)
      return res.status(400).json({ error: 'No podés desactivar tu propio usuario.' });
    if (!activos(lista)) return res.status(400).json({ error: 'Tiene que quedar al menos un administrador activo.' });

    await guardarUsuarios(lista);
    return res.status(200).json({ usuarios: lista.map(sinHash) });
  }

  if (req.method === 'DELETE') {
    const id = req.query?.id || req.body?.id;
    if (id === sesion.id) return res.status(400).json({ error: 'No podés eliminar tu propio usuario.' });
    const lista = usuarios.filter((u) => u.id !== id);
    if (lista.length === usuarios.length) return res.status(404).json({ error: 'Ese usuario ya no existe.' });
    if (!activos(lista)) return res.status(400).json({ error: 'Tiene que quedar al menos un administrador activo.' });
    await guardarUsuarios(lista);
    return res.status(200).json({ usuarios: lista.map(sinHash) });
  }

  return res.status(405).json({ error: 'Método no permitido.' });
}
