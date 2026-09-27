/**
 * Fuente de verdad de qué clientes y cuentas existen. El proxy sólo consulta
 * estas: aunque el navegador pida otra cosa, no se le pregunta a Windsor por
 * cuentas que no estén declaradas acá. Agregar un cliente se hace en este
 * archivo y no hay que tocar nada más.
 *
 * Meta, Google y TikTok van por el conector `all` con la cuenta prefijada
 * (`facebook__`, `google_ads__`, `tiktok__`): devuelve los mismos totales que
 * los conectores sueltos y admite los campos por campaña.
 *
 * `drive` es el id de la carpeta del cliente en Drive, no su nombre: el
 * nombre se puede cambiar en Drive sin romper nada, el id no cambia nunca.
 *
 * `id` es único dentro del cliente y `tipo` dice con qué juego de indicadores
 * se lee la cuenta. Así un mismo cliente puede tener dos perfiles de la misma
 * red: cada uno es una entrada con su propio `id` y su propio `titulo`.
 */

const META_BASE = [
  'spend', 'impressions', 'reach', 'clicks', 'unique_clicks',
  'actions_link_click', 'actions_landing_page_view',
  'actions_post_engagement', 'actions_video_view',
  'actions_post_reaction', 'actions_comment', 'actions_post',
  'instagram_profile_visits', 'instagram_profile_follow',
].join(',');
/* Cada cuenta de Meta cuenta su resultado con un evento distinto, y pedir el
   que no es devuelve cero. Se comprobó cuenta por cuenta contra Windsor: donde
   la cuenta vende, el resultado es la compra; donde conversa, la conversación
   iniciada; donde capta, el lead. El campo se renombra a `resultado` del lado
   del servidor para que el panel lea siempre lo mismo. */
const RESULTADOS_META = {
  leadsPixel: { campo: 'actions_offsite_conversion_fb_pixel_custom', etiqueta: 'Leads', costo: 'Costo por lead' },
  leads: { campo: 'actions_lead', etiqueta: 'Leads', costo: 'Costo por lead' },
  compras: { campo: 'actions_offsite_conversion_fb_pixel_purchase', etiqueta: 'Compras', costo: 'Costo por compra' },
  conversaciones: { campo: 'actions_onsite_conversion_messaging_first_reply', etiqueta: 'Conversaciones iniciadas', costo: 'Costo por conversación' },
};
const META_ALCANCE = 'reach,impressions';
/* El alcance único por campaña: misma consulta que la de la cuenta pero
   abierta por campaña y sin fecha, para que sea un valor del período. Sumar el
   alcance diario de una campaña la cuenta varias veces. */
const META_ALCANCE_CAMPANIA = 'campaign,reach,impressions';
const META_ALCANCE_CONJUNTO = 'campaign,adset_name,reach,impressions';
/* `conversions` son sólo las acciones marcadas como principales en Google Ads;
   `all_conversions` son todas. Hay cuentas sin ninguna marcada como principal,
   donde la primera da cero y la segunda no: se muestran las dos. */
const GOOGLE_METRICAS = 'spend,clicks,impressions,conversions,all_conversions,video_trueview_views,interactions,conversions_value,all_conversions_value,phone_calls';
/* Los desgloses (palabras clave, términos, ubicaciones) muestran sólo seis
   columnas: pedirles las demás sería arrastrar miles de filas de más. */
const GOOGLE_METRICAS_DESGLOSE = 'spend,clicks,impressions,conversions,all_conversions,video_trueview_views';
const GOOGLE = `date,campaign,advertising_channel_type,campaign_status,${GOOGLE_METRICAS}`;
const GOOGLE_DESGLOSE = `campaign,ad_group_name,ad_group_status,ad_id,ad_group_ad_status,${GOOGLE_METRICAS}`;
const GOOGLE_EXTRAS = [
  /* Una palabra clave habilitada dentro de un grupo pausado no se muestra, así
     que su estado real es el del grupo. Se piden los dos y el panel se queda
     con el peor de ambos, que es lo que se ve en Google Ads. */
  { id: 'keywords', titulo: 'Palabras clave', columna: 'Palabra clave', campo: 'keyword_text', campos: `keyword_text,keyword_status,ad_group_status,${GOOGLE_METRICAS_DESGLOSE}`, estado: 'keyword_status', estadoPadre: 'ad_group_status' },
  { id: 'terminos', titulo: 'Términos de búsqueda', columna: 'Término', campo: 'search_term', campos: `search_term,${GOOGLE_METRICAS_DESGLOSE}` },
  /* `city` y `region` de Google no son una ciudad y su provincia: se pisan
     entre sí. Monserrat llega como «Buenos Aires / Comuna 1» y Palermo como
     «Comuna 14 / Buenos Aires», y en el lugar de la provincia aparecen
     departamentos («Capital Department»). La cadena de ubicación sí es fiable
     —«lugar,contenedor,…,país»— y de ella salen las dos tablas. */
  { id: 'geo', titulo: 'Ubicación', columna: 'Ubicación', campo: 'geo_target_most_specific_location', campos: `geo_target_most_specific_location,${GOOGLE_METRICAS_DESGLOSE}` },
];
/* Sólo campos sumables: las tasas (CTR, CPC, CPM, frecuencia, VTR) se calculan
   sobre los totales del período, nunca promediando las diarias. `reach` se pide
   igual porque en las consultas sin fecha es el alcance único de esa entidad.
   Las de conversión y embudo vienen en cero en una cuenta de video, pero
   existen en el conector y se ofrecen para agregar cuando la cuenta convierta. */
const TIKTOK_METRICAS = [
  'spend', 'impressions', 'clicks', 'reach',
  'total_play', 'play_duration_2s', 'play_duration_6s',
  'play_first_quartile', 'play_midpoint', 'play_third_quartile', 'play_over',
  'likes', 'comments', 'shares', 'follows', 'profile_visits',
  'conversions', 'complete_payment', 'total_complete_payment_rate',
  'total_pageview', 'total_landing_page_view', 'web_event_add_to_cart', 'initiate_checkout',
].join(',');
const TIKTOK = `date,campaign,objective_type,campaign_status,${TIKTOK_METRICAS}`;
/* TikTok no informa el nombre del conjunto (`adgroup_name` vuelve vacío), así
   que el desglose de esta cuenta llega hasta el anuncio. */
const TIKTOK_DESGLOSE = `campaign,ad_name,ad_status,${TIKTOK_METRICAS}`;
const TIKTOK_ALCANCE = 'reach,impressions';
const TIKTOK_ALCANCE_CAMPANIA = 'campaign,reach,impressions';
/* Instagram Insights (conector `instagram`), que reemplazó al perfil público:
   informa alcance, visualizaciones e interacciones día por día. Se pide
   `account_name` en todas las consultas para poder verificar del lado del
   servidor que la fila es del perfil pedido. */
const INSTAGRAM = 'date,account_name,reach,views,total_interactions,likes,comments,shares,saves,replies,reposts';
/* Seguidores y publicaciones no tienen historia: la API devuelve el valor de
   hoy. Se leen como una foto, nunca se suman. */
const INSTAGRAM_FOTO = 'account_name,followers_count,media_count,follows_count';
/* Altas y bajas de seguidores existen sólo para los últimos 30 días y, si se
   piden fuera de ese plazo, Windsor rechaza la consulta entera. Por eso van en
   una consulta aparte que se puede quedar sin datos sin romper el resto.
   `follows_and_unfollows` es la suma de altas y bajas: la baja es su diferencia
   con las altas. */
const INSTAGRAM_SEGUIDORES = 'date,account_name,follower_count,follows_and_unfollows';
/* Lo publicado en el período. Las historias no entran: la API sólo las conserva
   24 horas, así que un histórico de historias no existe. */
const INSTAGRAM_CONTENIDO = 'account_name,media_id,media_product_type,media_type,timestamp,media_permalink,media_reach,media_views,media_engagement,media_like_count,media_comments_count,media_saved,media_shares';

const meta = (id, moneda, resultado = 'leadsPixel') => {
  const r = RESULTADOS_META[resultado];
  const metricas = `${META_BASE},${r.campo}`;
  return {
    id: 'meta', tipo: 'meta', titulo: 'Meta Ads', grupo: 'pagas', cuenta: `facebook__${id}`, moneda,
    campos: `date,campaign,campaign_objective,campaign_status,${metricas}`,
    /* Desglose por conjunto y por anuncio. Va en una consulta aparte y sin
       fecha: al nivel de anuncio las filas se multiplican y la serie diaria no
       las necesita. */
    desglose: `campaign,adset_name,adset_status,ad_name,effective_status,${metricas}`,
    alcance: META_ALCANCE, alcanceCampania: META_ALCANCE_CAMPANIA, alcanceConjunto: META_ALCANCE_CONJUNTO,
    resultado: r.campo, resultadoEtiqueta: r.etiqueta, resultadoCosto: r.costo,
    niveles: ['adset_name', 'ad_name'], nivelesEstado: ['adset_status', 'effective_status'],
  };
};
const google = (id, moneda) => ({ id: 'google', tipo: 'google', titulo: 'Google Ads', grupo: 'pagas', cuenta: `google_ads__${id}`, moneda, campos: GOOGLE, desglose: GOOGLE_DESGLOSE, niveles: ['ad_group_name', 'ad_id'], nivelesEstado: ['ad_group_status', 'ad_group_ad_status'], extras: GOOGLE_EXTRAS });
const tiktok = (id, moneda) => ({ id: 'tiktok', tipo: 'tiktok', titulo: 'TikTok Ads', grupo: 'pagas', cuenta: `tiktok__${id}`, moneda, campos: TIKTOK, alcance: TIKTOK_ALCANCE, alcanceCampania: TIKTOK_ALCANCE_CAMPANIA, desglose: TIKTOK_DESGLOSE, niveles: ['ad_name'], nivelesEstado: ['ad_status'] });
/* Cuando el cliente tiene un solo perfil el título es «Instagram»; con más de
   uno se distingue por el nombre de la cuenta, que es lo que se ve al costado. */
const instagram = (perfil, cuenta, id = 'instagram', titulo = 'Instagram') => ({
  id, tipo: 'instagram', titulo, grupo: 'organicas', conector: 'instagram', cuenta, perfil,
  campos: INSTAGRAM, foto: INSTAGRAM_FOTO, seguidores: INSTAGRAM_SEGUIDORES, contenido: INSTAGRAM_CONTENIDO,
});

export const CLIENTES = [
  {
    id: 'geely',
    nombre: 'Geely Argentina',
    inicial: 'GA',
    drive: '1KiMgFjWoaLMBYkVYBTwonEWNksnSHfNs',
    cuentas: [
      google('610-951-8860', 'USD'),
      meta('988319067489641', 'USD'),
      tiktok('7551070884526784513', 'ARS'),
      instagram('geelyarg', '17841475377757735'),
    ],
  },
  {
    id: 'maitenaika',
    nombre: 'Maitenaika',
    inicial: 'MA',
    drive: '1nBiZjlMR9BPOF79Hf9ThEYNwLVEgo5cM',
    cuentas: [
      google('863-751-8315', 'ARS'),
      meta('883265280922351', 'ARS', 'compras'),
      instagram('maitenaika_blanqueria', '17841401341959870'),
    ],
  },
  {
    id: 'emapi',
    nombre: 'Emapi',
    inicial: 'EM',
    drive: '1jzT1j8xnDdu0ezvLmEXZwbYgDkGM6BqQ',
    cuentas: [
      google('804-008-4709', 'ARS'),
      meta('1038158381412382', 'ARS', 'leads'),
      instagram('emapioficial', '17841441219693222'),
    ],
  },
  {
    id: 'braulio',
    nombre: 'Braulio Inmuebles',
    inicial: 'BI',
    drive: '12sRH7CdIZFpmapGuuYcI0MN6TuzehmjC',
    cuentas: [meta('9840767055978979', 'ARS')],
  },
  {
    id: 'monsa',
    nombre: 'Monsa',
    inicial: 'MO',
    drive: '1GYmatcv_zkabaNxzdoQa6Athq05xiTGN',
    cuentas: [google('275-422-2293', 'ARS'), meta('9877067379036937', 'ARS', 'leads')],
  },
  {
    id: 'cavanelas',
    nombre: 'Lácteos Cavanelas',
    inicial: 'LC',
    drive: '1w4FuyCvCaQ-qiB0VGnb-giA989_UA-dI',
    cuentas: [google('147-242-8435', 'ARS'), meta('1026609426319405', 'ARS', 'conversaciones')],
  },
  {
    id: 'textilvalerio',
    nombre: 'Textil Valerio',
    inicial: 'TV',
    drive: '1uI8F2d3xVYz9xktjOLuaJ3iKJCT31CxL',
    cuentas: [
      google('874-342-6392', 'ARS'),
      meta('1837821276837800', 'ARS', 'conversaciones'),
      // Esta marca tiene dos perfiles públicos: van los dos, cada uno con su nombre.
      instagram('textilvalerio', '17841478922172816', 'instagram', 'Instagram · textilvalerio'),
      instagram('textilvalerioblanqueria', '17841478397763191', 'instagramBlanqueria', 'Instagram · blanquería'),
    ],
  },
  {
    id: 'atletic',
    nombre: 'Atletic Services',
    inicial: 'AS',
    drive: '1N04cGwwLZh4mCTktaZ-kjGgC4szupqCT',
    cuentas: [google('724-843-4509', 'ARS'), meta('803853493716428', 'ARS', 'compras')],
  },
];

export const buscarCliente = (id) => CLIENTES.find((c) => c.id === id) || null;

export const buscarCuenta = (cliente, cuentaId) => {
  const c = buscarCliente(cliente);
  return c ? c.cuentas.find((x) => x.id === cuentaId) || null : null;
};
