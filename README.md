# Dashboard de Emisarios

Panel de performance de los clientes de Emisarios con las cuentas conectadas a
Windsor.ai. Se despliega en Vercel: la página es estática y las funciones de
`api/` corren del lado del servidor.

## Cómo está armado

| Archivo | Qué hace |
| --- | --- |
| `index.html`, `styles.css` | La pantalla completa del panel. |
| `app-v2.js` | El dashboard de cada cuenta: filtros, indicadores, gráfico y tabla. Pide los datos a `/api/windsor`. |
| `app-shell.js` | El marco: navegación, login, usuarios y accesos, descargas. |
| `api/_cuentas.js` | **Fuente de verdad** de qué clientes y cuentas existen. Agregar una cuenta se hace acá. |
| `api/windsor.js` | Única vía hacia Windsor.ai. Exige sesión y sólo consulta las cuentas declaradas. |
| `api/login.js`, `api/logout.js`, `api/sesion.js` | Acceso al panel. |
| `api/usuarios.js` | Alta, edición y baja de usuarios. Las reglas las impone el servidor. |
| `api/_comun.js` | Firma de la sesión, hash de contraseñas y la lista de usuarios cifrada. |

## Seguridad

- `WINDSOR_API_KEY` vive **sólo en el servidor**. El navegador nunca habla con
  Windsor: pide a `/api/windsor` y esa función es la única que tiene la clave.
- Las contraseñas se guardan hasheadas con PBKDF2-SHA256, 210.000 iteraciones,
  separador `:` (nunca `$`: los cargadores de `.env` expanden `$` y rompen el
  hash). La cookie de sesión va firmada con HMAC-SHA256 usando `AUTH_SECRET`.
- La lista de usuarios se guarda cifrada con AES-GCM en el store de Vercel Blob.
- Nunca se muestran datos de ejemplo como si fueran datos conectados: lo que no
  está conectado en Windsor se dice en pantalla.

## Variables de entorno

| Variable | Para qué |
| --- | --- |
| `WINDSOR_API_KEY` | Consultar Windsor.ai. |
| `AUTH_SECRET` | Firmar la sesión y cifrar la lista de usuarios. |
| `DASHBOARD_USERS` | Semilla: se usa mientras nadie haya guardado cambios desde el panel. |
| `BLOB_READ_WRITE_TOKEN` | La inyecta el store de Blob conectado al proyecto. |
