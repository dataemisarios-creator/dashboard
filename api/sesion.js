import { leerSesion } from './_comun.js';

/** El navegador pregunta al cargar si la cookie sigue valiendo. */
export default function handler(req, res) {
  const sesion = leerSesion(req);
  if (!sesion) return res.status(401).json({ error: 'Sin sesión.' });
  return res.status(200).json({ sesion: { ...sesion, vence: undefined } });
}
