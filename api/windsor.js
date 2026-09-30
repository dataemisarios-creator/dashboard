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
    /* Cuando la cuenta tiene su propio conector se consulta ahí, y además se
       verifica el perfil que vuelve en la fila: el filtro por cuenta es de
       Windsor, la comprobación es nuestra. */
    const delPerfil = (filas) => filas.filter((x) => !cuenta.perfil || x.account_name === cuenta.perfil);
    const propio = (campos) => consultar(cuenta.conector, { date_from: desde, date_to: hasta, select_accounts: cuenta.cuenta, fields: campos });
    const pedirFilas = cuenta.conector
      ? propio(cuenta.campos).then(delPerfil)
      : consultar('all', { ...comunes, select_accounts: cuenta.cuenta });

    /* Seguidores y publicaciones son el valor de hoy, no una serie. */
    const pedirFoto = cuenta.foto ? propio(cuenta.foto).then(delPerfil).catch(() => []) : Promise.resolve([]);
    /* Altas y bajas de seguidores: Windsor rechaza la consulta si el rango pasa
       de los últimos 30 días, así que este pedido puede volver vacío. */
    const pedirSeguidores = cuenta.seguidores ? propio(cuenta.seguidores).then(delPerfil).catch(() => []) : Promise.resolve([]);
    /* Lo publicado en el período, para contar reels y posteos y para la tabla
       de contenido. */
    const pedirContenido = cuenta.contenido ? propio(cuenta.contenido).then(delPerfil).catch(() => []) : Promise.resolve([]);

    /* Desglose por conjunto y por anuncio: consulta aparte y sin fecha, porque
       al nivel de anuncio las filas se multiplican y la serie diaria no las
       necesita. */
    /* TEMPORAL: se guarda el motivo por el que falla el desglose para poder
       diagnosticarlo. Se saca en cuanto esté resuelto. */
    let fallaDesglose = null;
    const pedirDesglose = cuenta.desglose
      ? consultar('all', { date_from: desde, date_to: hasta, select_accounts: cuenta.cuenta, fields: cuenta.desglose })
          .catch((e) => { fallaDesglose = String(e && e.message || e).slice(0, 400); return []; })
      : Promise.resolve([]);

    /* El alcance único no se suma por día: sumarlo lo infla. Va sin desglose
       para que sea un solo valor del período. */
    const pedirAlcance = cuenta.alcance
      ? consultar('all', { date_from: desde, date_to: hasta, select_accounts: cuenta.cuenta, fields: cuenta.alcance })
          .catch(() => [])
      : Promise.resolve([]);

    /* Lo mismo abierto por campaña: es la única forma de que la tabla muestre
       el alcance de cada campaña en vez de la suma de sus días. */
    const pedirAlcanceCampania = cuenta.alcanceCampania
      ? consultar('all', { date_from: desde, date_to: hasta, select_accounts: cuenta.cuenta, fields: cuenta.alcanceCampania })
          .catch(() => [])
      : Promise.resolve([]);

    /* Y por conjunto de anuncios, para que la tabla tenga su alcance propio en
       los tres niveles en lugar de una suma que contaría dos veces a quien vio
       más de un anuncio. */
    const pedirAlcanceConjunto = cuenta.alcanceConjunto
      ? consultar('all', { date_from: desde, date_to: hasta, select_accounts: cuenta.cuenta, fields: cuenta.alcanceConjunto })
          .catch(() => [])
      : Promise.resolve([]);

    /* Desgloses que Google sólo entrega en informes separados: palabras clave,
       términos de búsqueda, ciudades y provincias. Van sin fecha, porque
       cruzarlos con el día multiplica las filas por miles. */
    const pedirExtras = (cuenta.extras || []).map((e) =>
      consultar('all', { date_from: desde, date_to: hasta, select_accounts: cuenta.cuenta, fields: e.campos })
        .then((filas) => ({ id: e.id, titulo: e.titulo, columna: e.columna, campo: e.campo, estado: e.estado || null, estadoPadre: e.estadoPadre || null, filas }))
        .catch(() => null));

    const [filas, desglose, sueltas, porCampania, porConjunto, fotos, seguidores, contenido, ...extras] =
      await Promise.all([pedirFilas, pedirDesglose, pedirAlcance, pedirAlcanceCampania, pedirAlcanceConjunto, pedirFoto, pedirSeguidores, pedirContenido, ...pedirExtras]);
    const alcance = sueltas.reduce((acc, f) => acc + (Number(f.reach) || 0), 0) || null;
    const alcanceCampania = Object.fromEntries(porCampania
      .filter((f) => f.campaign)
      .map((f) => [f.campaign, Number(f.reach) || 0]));
    const alcanceConjunto = Object.fromEntries(porConjunto
      .filter((f) => f.campaign && f.adset_name)
      .map((f) => [`${f.campaign}::${f.adset_name}`, Number(f.reach) || 0]));

    /* Cada cuenta de Meta informa su resultado con un evento propio. Se copia a
       un nombre fijo para que el panel no tenga que saber cuál es. */
    if (cuenta.resultado)
      for (const lista of [filas, desglose])
        for (const fila of lista) fila.resultado = fila[cuenta.resultado] ?? null;

    /* Instagram devuelve una fila por cada día del rango aunque todavía no
       tenga datos: el día en curso llega entero en blanco. Esa fila no se
       manda, porque en la serie diaria aparecería como un día en cero. */
    const utiles = cuenta.tipo === 'instagram'
      ? filas.filter((f) => ['reach', 'views', 'total_interactions', 'likes', 'follower_count']
          .some((c) => f[c] !== null && f[c] !== undefined))
      : filas;

    /* Las altas y bajas llegan en su propia consulta: se pegan al día que les
       corresponde para que el panel siga leyendo una fila por fecha. */
    if (seguidores.length) {
      const porFecha = new Map(seguidores.map((f) => [f.date, f]));
      for (const fila of utiles) {
        const s = porFecha.get(fila.date);
        if (!s) continue;
        fila.follower_count = s.follower_count;
        fila.follows_and_unfollows = s.follows_and_unfollows;
      }
    }

    res.setHeader('Cache-Control', 'private, max-age=0, no-store');
    return res.status(200).json({
      cuenta: {
        id: cuenta.id, tipo: cuenta.tipo, titulo: cuenta.titulo, moneda: cuenta.moneda || null, grupo: cuenta.grupo,
        resultado: cuenta.resultadoEtiqueta || null, resultadoCosto: cuenta.resultadoCosto || null,
      },
      desde,
      hasta,
      alcance,
      alcanceCampania,
      alcanceConjunto,
      niveles: cuenta.niveles || [],
      nivelesEstado: cuenta.nivelesEstado || [],
      desglose,
      fallaDesglose,
      foto: fotos[0] || null,
      contenido,
      extras: extras.filter(Boolean),
      filas: utiles,
      consultadoEn: new Date().toISOString(),
    });
  } catch (e) {
    return res.status(e.status && e.status < 500 ? 502 : 500).json({ error: e.message });
  }
}
