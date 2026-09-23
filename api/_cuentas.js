/**
 * Fuente de verdad de qué cuentas existen. El proxy sólo consulta estas: aunque
 * el navegador pida otra cosa, no se le pregunta a Windsor por cuentas que no
 * estén declaradas acá.
 *
 * Meta, Google y TikTok van por el conector `all` con la cuenta prefijada
 * (`facebook__`, `google_ads__`, `tiktok__`): devuelve los mismos totales que
 * los conectores sueltos y admite los campos por campaña.
 */

const META = 'date,campaign,campaign_objective,spend,impressions,reach,clicks,actions_link_click,actions_offsite_conversion_fb_pixel_custom,instagram_profile_visits,instagram_profile_follow';
const META_ALCANCE = 'reach,impressions';
const GOOGLE = 'date,campaign,advertising_channel_type,spend,clicks,impressions,conversions,video_trueview_views';
const TIKTOK = 'date,campaign,spend,impressions,clicks,reach,play_duration_6s,follows,profile_visits,shares';
const TIKTOK_ALCANCE = 'reach,impressions';
/* El perfil de Instagram que está conectado es el público: informa seguidores y
   cantidad de publicaciones, no alcance ni interacciones. No se inventa el
   resto: la vista avisa qué falta conectar. */
const INSTAGRAM_PUBLICO = 'date,account_name,profile_followers_count,profile_media_count';

export const CLIENTES = [
  {
    id: 'geely',
    nombre: 'Geely Argentina',
    inicial: 'GA',
    cuentas: [
      { id: 'google', titulo: 'Google Ads', grupo: 'pagas', cuenta: 'google_ads__610-951-8860', moneda: 'USD', campos: GOOGLE },
      { id: 'meta', titulo: 'Meta Ads', grupo: 'pagas', cuenta: 'facebook__988319067489641', moneda: 'USD', campos: META, alcance: META_ALCANCE },
      { id: 'tiktok', titulo: 'TikTok Ads', grupo: 'pagas', cuenta: 'tiktok__7551070884526784513', moneda: 'ARS', campos: TIKTOK, alcance: TIKTOK_ALCANCE },
      { id: 'instagram', titulo: 'Instagram/Facebook', grupo: 'organicas', conector: 'instagram_public', perfil: 'geelyarg', campos: INSTAGRAM_PUBLICO },
    ],
  },
  {
    id: 'maitenaika',
    nombre: 'Maitenaika',
    inicial: 'MA',
    cuentas: [
      { id: 'google', titulo: 'Google Ads', grupo: 'pagas', cuenta: 'google_ads__863-751-8315', moneda: 'ARS', campos: GOOGLE },
      { id: 'meta', titulo: 'Meta Ads', grupo: 'pagas', cuenta: 'facebook__883265280922351', moneda: 'ARS', campos: META, alcance: META_ALCANCE },
      { id: 'instagram', titulo: 'Instagram/Facebook', grupo: 'organicas', conector: 'instagram_public', perfil: 'maitenaika_blanqueria', campos: INSTAGRAM_PUBLICO },
    ],
  },
];

export const buscarCuenta = (cliente, plataforma) => {
  const c = CLIENTES.find((x) => x.id === cliente);
  if (!c) return null;
  return c.cuentas.find((x) => x.id === plataforma) || null;
};
