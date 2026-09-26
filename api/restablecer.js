import {
  guardarUsuarios,
  hashear,
  leerUsuarios,
  nuevaSesion,
  ponerCookie,
  usuarioDelTestigo,
} from './_comun.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido.' });
  const { testigo, clave } = req.body || {};
  if (String(clave || '').length < 12)
    return res.status(400).json({ error: 'La contraseña tiene que tener al menos 12 caracteres.' });

  const usuario = await usuarioDelTestigo(testigo);
  if (!usuario)
    return res.status(401).json({ error: 'El enlace venció o ya se usó. Pedí uno nuevo.' });

  const lista = (await leerUsuarios()).map((u) =>
    u.id === usuario.id ? { ...u, hash: hashear(String(clave)) } : u,
  );
  await guardarUsuarios(lista);

  // Entra directo: acaba de demostrar que tiene el correo de la cuenta.
  const sesion = nuevaSesion(usuario);
  ponerCookie(res, sesion);
  return res.status(200).json({ sesion: { ...sesion, vence: undefined } });
}
