import { exigirSesion, permisosDe, puedeVer, usuarioDeSesion } from './_comun.js';
import { CLIENTES } from './_cuentas.js';

/**
 * Qué clientes y cuentas puede ver quien está pidiendo. Se cruzan dos cosas: lo
 * que está conectado en Windsor y lo que ese usuario tiene habilitado. Un
 * cliente sin ninguna cuenta habilitada no aparece. No sale ninguna credencial.
 */
export default async function handler(req, res) {
  const sesion = exigirSesion(req, res);
  if (!sesion) return;

  const permisos = permisosDe(await usuarioDeSesion(sesion));
  const clientes = CLIENTES.map((c) => ({
    id: c.id,
    nombre: c.nombre,
    inicial: c.inicial,
    cuentas: c.cuentas
      .filter((x) => puedeVer(permisos, c.id, x.id))
      .map((x) => ({ id: x.id, tipo: x.tipo, titulo: x.titulo, grupo: x.grupo })),
  })).filter((c) => c.cuentas.length);

  res.status(200).json({ clientes });
}
