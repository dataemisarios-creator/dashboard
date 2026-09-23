import { exigirSesion } from './_comun.js';
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
  if (!exigirSesion(req, res)) return;
  if (!process.env.WINDSOR_API_KEY)
    return res.status(500).json({ error: 'Falta configurar WINDSOR_API_KEY en el servidor.' });

  const { cliente = '', plataforma = '', desde = '', hasta = '' } = req.query || {};
  if (!ISO.test(desde) || !ISO.test(hasta))
    return res.status(400).json({ error: 'Las fechas tienen que venir como AAAA-MM-DD.' });

  const cuenta = buscarCuenta(String(cliente), String(plataforma));
  if (!cuenta) return res.status(404).json({ error: 'Esa cuenta no está conectada.' });

  try {
    const comunes = { date_from: desde, date_to: hasta, fields: cuenta.campos };
    const filas = cuenta.conector
      ? (await consultar(cuenta.conector, comunes)).filter(
          (f) => !cuenta.perfil || f.account_name === cuenta.perfil,
        )
      : await consultar('all', { ...comunes, select_accounts: cuenta.cuenta });

    /* El alcance único no se suma por día: sumarlo lo infla. Va en una consulta
       aparte, sin desglose, para que sea un solo valor del período. */
    let alcance = null;
    if (cuenta.alcance) {
      const sueltas = await consultar('all', {
        date_from: desde,
        date_to: hasta,
        select_accounts: cuenta.cuenta,
        fields: cuenta.alcance,
      });
      const suma = sueltas.reduce(
        (acc, f) => ({
          reach: acc.reach + (Number(f.reach) || 0),
          impressions: acc.impressions + (Number(f.impressions) || 0),
        }),
        { reach: 0, impressions: 0 },
      );
      alcance = suma.reach || null;
    }

    res.setHeader('Cache-Control', 'private, max-age=0, no-store');
    return res.status(200).json({
      cuenta: { id: cuenta.id, titulo: cuenta.titulo, moneda: cuenta.moneda || null, grupo: cuenta.grupo },
      desde,
      hasta,
      alcance,
      filas,
      consultadoEn: new Date().toISOString(),
    });
  } catch (e) {
    return res.status(e.status && e.status < 500 ? 502 : 500).json({ error: e.message });
  }
}
