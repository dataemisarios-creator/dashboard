import { enviarCorreo, leerUsuarios, puedeEnviarCorreo, testigoDeRecuperacion } from './_comun.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido.' });
  const quien = String(req.body?.quien || '').trim().toLowerCase();
  if (!quien) return res.status(400).json({ error: 'Escribí tu usuario o tu correo.' });

  if (!puedeEnviarCorreo())
    return res.status(501).json({
      error: 'El envío de correo todavía no está configurado en el servidor. Pedile a un administrador que te genere una contraseña nueva desde el panel de accesos.',
    });

  const usuarios = await leerUsuarios();
  const usuario = usuarios.find(
    (u) => String(u.usuario).toLowerCase() === quien || String(u.correo || '').toLowerCase() === quien,
  );

  /* Se responde lo mismo exista o no la cuenta: si no, esta pantalla serviría
     para averiguar qué usuarios están dados de alta. */
  const respuesta = { ok: true, mensaje: 'Si esa cuenta existe y tiene correo cargado, te llega un enlace en unos minutos.' };
  if (!usuario || !usuario.correo || usuario.activo === false) return res.status(200).json(respuesta);

  const destino = `https://${req.headers.host}/?restablecer=${encodeURIComponent(testigoDeRecuperacion(usuario))}`;
  try {
    await enviarCorreo({
      para: usuario.correo,
      asunto: 'Recuperar el acceso al dashboard de Emisarios',
      html: `<p>Hola ${usuario.nombre || usuario.usuario},</p>
        <p>Entrá en este enlace para elegir una contraseña nueva. Vence en una hora y sirve una sola vez.</p>
        <p><a href="${destino}">Elegir una contraseña nueva</a></p>
        <p>Si no pediste esto, ignorá el correo: tu contraseña sigue siendo la misma.</p>`,
    });
  } catch (e) {
    return res.status(502).json({ error: 'No se pudo enviar el correo. Probá de nuevo en un rato.' });
  }
  return res.status(200).json(respuesta);
}
