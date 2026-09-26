import { exigirSesion, leerVistas, guardarVistas } from './_comun.js';

/* Vistas guardadas de cada usuario: la organización de su panel para un
   cliente y una plataforma. No se comparten entre usuarios y no se pueden
   pedir las de otro: siempre se opera sobre el id de la sesión. */

const MAX_VISTAS = 40;
const LIMITE = 60000;
const texto = (v, largo) => String(v ?? '').trim().slice(0, largo);

const nueva = (id) => ({ id, creada: new Date().toISOString() });

export default async function handler(req, res) {
  const sesion = exigirSesion(req, res);
  if (!sesion) return;

  try {
    const datos = await leerVistas(sesion.id);

    if (req.method === 'GET') {
      res.setHeader('Cache-Control', 'private, max-age=0, no-store');
      return res.status(200).json(datos);
    }

    if (req.method === 'POST') {
      const { id, nombre, cliente, plataforma, estado, ultima } = req.body || {};

      /* Recordar cuál fue la última vista abierta es lo único que se guarda
         solo: alcanza para que al volver a entrar esté como la dejó. */
      if (ultima && cliente && plataforma) {
        datos.ultima[`${cliente}:${plataforma}`] = texto(ultima, 40) || null;
        await guardarVistas(sesion.id, datos);
        return res.status(200).json(datos);
      }

      if (!cliente || !plataforma || !estado)
        return res.status(400).json({ error: 'Faltan datos de la vista.' });
      if (JSON.stringify(estado).length > LIMITE)
        return res.status(413).json({ error: 'La vista es demasiado grande.' });

      const titulo = texto(nombre, 60) || 'Vista sin nombre';
      const existente = id ? datos.vistas.find((v) => v.id === id) : null;
      if (existente) Object.assign(existente, { nombre: titulo, estado, actualizada: new Date().toISOString() });
      else {
        if (datos.vistas.length >= MAX_VISTAS)
          return res.status(409).json({ error: `No se pueden guardar más de ${MAX_VISTAS} vistas.` });
        datos.vistas.push({ ...nueva(`v${Date.now()}`), nombre: titulo, cliente: texto(cliente, 40), plataforma: texto(plataforma, 40), estado });
      }
      const guardada = existente || datos.vistas[datos.vistas.length - 1];
      datos.ultima[`${guardada.cliente || cliente}:${guardada.plataforma || plataforma}`] = guardada.id;
      await guardarVistas(sesion.id, datos);
      return res.status(200).json({ ...datos, guardada: guardada.id });
    }

    if (req.method === 'DELETE') {
      const id = texto(req.query?.id, 40);
      const antes = datos.vistas.length;
      datos.vistas = datos.vistas.filter((v) => v.id !== id);
      if (datos.vistas.length === antes) return res.status(404).json({ error: 'Esa vista ya no existe.' });
      // La referencia a la vista borrada no puede quedar colgada.
      for (const clave of Object.keys(datos.ultima))
        if (datos.ultima[clave] === id) delete datos.ultima[clave];
      await guardarVistas(sesion.id, datos);
      return res.status(200).json(datos);
    }

    return res.status(405).json({ error: 'Método no permitido.' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
