import { exigirSesion } from './_comun.js';
import { CLIENTES } from './_cuentas.js';

/** Qué clientes y cuentas hay conectados. No sale ninguna credencial. */
export default function handler(req, res) {
  if (!exigirSesion(req, res)) return;
  res.status(200).json({
    clientes: CLIENTES.map((c) => ({
      id: c.id,
      nombre: c.nombre,
      inicial: c.inicial,
      cuentas: c.cuentas.map((x) => ({ id: x.id, titulo: x.titulo, grupo: x.grupo })),
    })),
  });
}
