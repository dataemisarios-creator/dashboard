import { claveValida, leerUsuarios, nuevaSesion, ponerCookie, sinHash } from './_comun.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido.' });
  const { usuario = '', clave = '' } = req.body || {};
  const buscado = String(usuario).trim().toLowerCase();

  const usuarios = await leerUsuarios();
  const encontrado = usuarios.find((u) => String(u.usuario).toLowerCase() === buscado);

  /* Mismo mensaje cuando el usuario no existe y cuando la contraseña no
     coincide: si no, la pantalla de login diría quién está dado de alta. */
  if (!encontrado || !claveValida(String(clave), encontrado.hash))
    return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
  if (encontrado.activo === false)
    return res.status(403).json({ error: 'Este usuario está desactivado.' });

  const sesion = nuevaSesion(encontrado);
  ponerCookie(res, sesion);
  return res.status(200).json({ sesion: { ...sesion, vence: undefined }, usuario: sinHash(encontrado) });
}
