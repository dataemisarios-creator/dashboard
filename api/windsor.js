import { exigirSesion, permisosDe, puedeVer, usuarioDeSesion } from './_comun.js';
import { buscarCuenta } from './_cuentas.js';

const BASE = 'https://connectors.windsor.ai';
const ISO = /^\d{4}-\d{2}-\d{2}$/;

async function consultar(conector, params) {
  const url = new URL(`${BASE}/${conector}`);
  url.search = new URLSearchParams({ api_key: process.env.WINDSOR_API_KEY, ...params }).toString();
  const respuesta = await fetch(url, { signal: AbortSignal.timeout(55000) });
  const cuerpo = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) {
    /* El mensaje de Windsor se pasa tal cual porque dice qué falta conectar,
       pero nunca la URL: lleva la clave. */
    const error = new Error(cuerpo?.error || `Windsor respondió ${respuesta.status}.`);
    error.status = respuesta.status;
    throw error;
  }
  return Array.isArray(cuerpo?.data) ? cuerpo.data : [];
}

export default async function handler(req, res) {
  const sesion = exigirSesion(req, res);
  if (!sesion) return;
  if (!process.env.WINDSOR_API_KEY)
    return res.status(500).json({ error: 'Falta configurar WINDSOR_API_KEY en el servidor.' });

  const { cliente = '', plataforma = '', desde = '', hasta = '' } = req.query || {};
  if (!ISO.test(desde) || !ISO.test(hasta))
    return res.status(400).json({ error: 'Las fechas tienen que venir como AAAA-MM-DD.' });

  const cuenta = buscarCuenta(String(cliente), String(plataforma));
  if (!cuenta) return res.status(404).json({ error: 'Esa cuenta no está conectada.' });

  /* El permiso se comprueba acá, no sólo al armar el menú: si no, bastaría con
     escribir la dirección a mano para leer la cuenta de otro anunciante. */
  const permisos = permisosDe(await usuarioDeSesion(sesion));
  if (!puedeVer(permisos, String(cliente), String(plataforma)))
    return res.status(403).json({ error: 'Tu usuario no tiene acceso a esa cuenta.' });

  try {
    const comunes = { date_from: desde, date_to: hasta, fields: cuenta.campos };

    /* Las tres consultas van en paralelo: encadenadas, una vista tardaba más de
       diez segundos. */
    const pedirFilas = cuenta.conector
      ? consultar(cuenta.conector, comunes).then((f) =>
          f.filter((x) => !cuenta.perfil || x.account_name === cuenta.perfil))
      : consultar('all', { ...comunes, select_accounts: cuenta.cuenta });

    /* Desglose por conjunto y por anuncio: consulta aparte y sin fecha, porque
       al nivel de anuncio las filas se multiplican y la serie diaria no las
       necesita. */
    const pedirDesglose = cuenta.desglose
      ? consultar('all', { date_from: desde, date_to: hasta, select_accounts: cuenta.cuenta, fields: cuenta.desglose })
          .catch(() => [])
      : Promise.resolve([]);

    /* El alcance único no se suma por día: sumarlo lo infla. Va sin desglose
       para que sea un solo valor del período. */
    const pedirAlcance = cuenta.alcance
      ? consultar('all', { date_from: desde, date_to: hasta, select_accounts: cuenta.cuenta, fields: cuenta.alcance })
          .catch(() => [])
      : Promise.resolve([]);

    const [filas, desglose, sueltas] = await Promise.all([pedirFilas, pedirDesglose, pedirAlcance]);
    const alcance = sueltas.reduce((acc, f) => acc + (Number(f.reach) || 0), 0) || null;

    res.setHeader('Cache-Control', 'private, max-age=0, no-store');
    return res.status(200).json({
      cuenta: { id: cuenta.id, tipo: cuenta.tipo, titulo: cuenta.titulo, moneda: cuenta.moneda || null, grupo: cuenta.grupo },
      desde,
      hasta,
      alcance,
      niveles: cuenta.niveles || [],
      desglose,
      filas,
      consultadoEn: new Date().toISOString(),
    });
  } catch (e) {
    return res.status(e.status && e.status < 500 ? 502 : 500).json({ error: e.message });
  }
}
