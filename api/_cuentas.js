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
 * `id` es único dentro del cliente y `tipo` dice con qué juego de indicadores
 * se lee la cuenta. Así un mismo cliente puede tener dos perfiles de la misma
 * red: cada uno es una entrada con su propio `id` y su propio `titulo`.
 */

const META_METRICAS = 'spend,impressions,reach,clicks,actions_link_click,actions_offsite_conversion_fb_pixel_custom,instagram_profile_visits,instagram_profile_follow';
const META = `date,campaign,campaign_objective,campaign_status,${META_METRICAS}`;
/* Desglose por conjunto y por anuncio. Va en una consulta aparte y sin fecha:
   al nivel de anuncio las filas se multiplican y la serie diaria no las
   necesita. */
const META_DESGLOSE = `campaign,adset_name,adset_status,ad_name,effective_status,${META_METRICAS}`;
const META_ALCANCE = 'reach,impressions';
const GOOGLE_METRICAS = 'spend,clicks,impressions,conversions,video_trueview_views';
const GOOGLE = `date,campaign,advertising_channel_type,campaign_status,${GOOGLE_METRICAS}`;
const GOOGLE_DESGLOSE = `campaign,ad_group_name,ad_group_status,ad_id,ad_group_ad_status,${GOOGLE_METRICAS}`;
const GOOGLE_EXTRAS = [
  { id: 'keywords', titulo: 'Palabras clave', columna: 'Palabra clave', campo: 'keyword_text', campos: `keyword_text,keyword_status,${GOOGLE_METRICAS}`, estado: 'keyword_status' },
  { id: 'terminos', titulo: 'Términos de búsqueda', columna: 'Término', campo: 'search_term', campos: `search_term,${GOOGLE_METRICAS}` },
  { id: 'ciudades', titulo: 'Ciudades', columna: 'Ciudad', campo: 'city', campos: `city,${GOOGLE_METRICAS}` },
  { id: 'provincias', titulo: 'Provincias', columna: 'Provincia', campo: 'region', campos: `region,${GOOGLE_METRICAS}` },
];
const TIKTOK_METRICAS = 'spend,impressions,clicks,reach,play_duration_6s,follows,profile_visits,shares';
const TIKTOK = `date,campaign,campaign_status,${TIKTOK_METRICAS}`;
/* TikTok no informa el nombre del conjunto (`adgroup_name` vuelve vacío), así
   que el desglose de esta cuenta llega hasta el anuncio. */
const TIKTOK_DESGLOSE = `campaign,ad_name,ad_status,${TIKTOK_METRICAS}`;
const TIKTOK_ALCANCE = 'reach,impressions';
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

const meta = (id, moneda) => ({ id: 'meta', tipo: 'meta', titulo: 'Meta Ads', grupo: 'pagas', cuenta: `facebook__${id}`, moneda, campos: META, alcance: META_ALCANCE, desglose: META_DESGLOSE, niveles: ['adset_name', 'ad_name'], nivelesEstado: ['adset_status', 'effective_status'] });
const google = (id, moneda) => ({ id: 'google', tipo: 'google', titulo: 'Google Ads', grupo: 'pagas', cuenta: `google_ads__${id}`, moneda, campos: GOOGLE, desglose: GOOGLE_DESGLOSE, niveles: ['ad_group_name', 'ad_id'], nivelesEstado: ['ad_group_status', 'ad_group_ad_status'], extras: GOOGLE_EXTRAS });
const tiktok = (id, moneda) => ({ id: 'tiktok', tipo: 'tiktok', titulo: 'TikTok Ads', grupo: 'pagas', cuenta: `tiktok__${id}`, moneda, campos: TIKTOK, alcance: TIKTOK_ALCANCE, desglose: TIKTOK_DESGLOSE, niveles: ['ad_name'], nivelesEstado: ['ad_status'] });
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
    cuentas: [
      google('863-751-8315', 'ARS'),
      meta('883265280922351', 'ARS'),
      instagram('maitenaika_blanqueria', '17841401341959870'),
    ],
  },
  {
    id: 'emapi',
    nombre: 'Emapi',
    inicial: 'EM',
    cuentas: [
      google('804-008-4709', 'ARS'),
      meta('1038158381412382', 'ARS'),
      instagram('emapioficial', '17841441219693222'),
    ],
  },
  {
    id: 'braulio',
    nombre: 'Braulio Inmuebles',
    inicial: 'BI',
    cuentas: [meta('9840767055978979', 'ARS')],
  },
  {
    id: 'monsa',
    nombre: 'Monsa',
    inicial: 'MO',
    cuentas: [google('275-422-2293', 'ARS'), meta('9877067379036937', 'ARS')],
  },
  {
    id: 'cavanelas',
    nombre: 'Lácteos Cavanelas',
    inicial: 'LC',
    cuentas: [google('147-242-8435', 'ARS'), meta('1026609426319405', 'ARS')],
  },
  {
    id: 'textilvalerio',
    nombre: 'Textil Valerio',
    inicial: 'TV',
    cuentas: [
      google('874-342-6392', 'ARS'),
      meta('1837821276837800', 'ARS'),
      // Esta marca tiene dos perfiles públicos: van los dos, cada uno con su nombre.
      instagram('textilvalerio', '17841478922172816', 'instagram', 'Instagram · textilvalerio'),
      instagram('textilvalerioblanqueria', '17841478397763191', 'instagramBlanqueria', 'Instagram · blanquería'),
    ],
  },
  {
    id: 'atletic',
    nombre: 'Atletic Services',
    inicial: 'AS',
    cuentas: [google('724-843-4509', 'ARS'), meta('803853493716428', 'ARS')],
  },
];

export const buscarCliente = (id) => CLIENTES.find((c) => c.id === id) || null;

export const buscarCuenta = (cliente, cuentaId) => {
  const c = buscarCliente(cliente);
  return c ? c.cuentas.find((x) => x.id === cuentaId) || null : null;
};
