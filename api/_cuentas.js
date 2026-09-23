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
const META = `date,campaign,campaign_objective,${META_METRICAS}`;
/* Desglose por conjunto y por anuncio. Va en una consulta aparte y sin fecha:
   al nivel de anuncio las filas se multiplican y la serie diaria no las
   necesita. */
const META_DESGLOSE = `campaign,adset_name,ad_name,${META_METRICAS}`;
const META_ALCANCE = 'reach,impressions';
const GOOGLE_METRICAS = 'spend,clicks,impressions,conversions,video_trueview_views';
const GOOGLE = `date,campaign,advertising_channel_type,${GOOGLE_METRICAS}`;
const GOOGLE_DESGLOSE = `campaign,ad_group_name,ad_id,${GOOGLE_METRICAS}`;
const TIKTOK_METRICAS = 'spend,impressions,clicks,reach,play_duration_6s,follows,profile_visits,shares';
const TIKTOK = `date,campaign,${TIKTOK_METRICAS}`;
/* TikTok no informa el nombre del conjunto (`adgroup_name` vuelve vacío), así
   que el desglose de esta cuenta llega hasta el anuncio. */
const TIKTOK_DESGLOSE = `campaign,ad_name,${TIKTOK_METRICAS}`;
const TIKTOK_ALCANCE = 'reach,impressions';
/* El perfil de Instagram que está conectado es el público: informa seguidores y
   cantidad de publicaciones, no alcance ni interacciones. No se inventa el
   resto: la vista dice qué falta conectar. */
const INSTAGRAM_PUBLICO = 'date,account_name,profile_followers_count,profile_media_count';

const meta = (id, moneda) => ({ id: 'meta', tipo: 'meta', titulo: 'Meta Ads', grupo: 'pagas', cuenta: `facebook__${id}`, moneda, campos: META, alcance: META_ALCANCE, desglose: META_DESGLOSE, niveles: ['adset_name', 'ad_name'] });
const google = (id, moneda) => ({ id: 'google', tipo: 'google', titulo: 'Google Ads', grupo: 'pagas', cuenta: `google_ads__${id}`, moneda, campos: GOOGLE, desglose: GOOGLE_DESGLOSE, niveles: ['ad_group_name', 'ad_id'] });
const tiktok = (id, moneda) => ({ id: 'tiktok', tipo: 'tiktok', titulo: 'TikTok Ads', grupo: 'pagas', cuenta: `tiktok__${id}`, moneda, campos: TIKTOK, alcance: TIKTOK_ALCANCE, desglose: TIKTOK_DESGLOSE, niveles: ['ad_name'] });
/* Cuando el cliente tiene un solo perfil el título es «Instagram»; con más de
   uno se distingue por el nombre de la cuenta, que es lo que se ve al costado. */
const instagram = (perfil, id = 'instagram', titulo = 'Instagram') => ({
  id, tipo: 'instagram', titulo, grupo: 'organicas', conector: 'instagram_public', perfil, campos: INSTAGRAM_PUBLICO,
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
      instagram('geelyarg'),
    ],
  },
  {
    id: 'maitenaika',
    nombre: 'Maitenaika',
    inicial: 'MA',
    cuentas: [
      google('863-751-8315', 'ARS'),
      meta('883265280922351', 'ARS'),
      instagram('maitenaika_blanqueria'),
    ],
  },
  {
    id: 'emapi',
    nombre: 'Emapi',
    inicial: 'EM',
    cuentas: [
      google('804-008-4709', 'ARS'),
      meta('1038158381412382', 'ARS'),
      instagram('emapioficial'),
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
      instagram('textilvalerio', 'instagram', 'Instagram · textilvalerio'),
      instagram('textilvalerioblanqueria', 'instagramBlanqueria', 'Instagram · blanquería'),
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
