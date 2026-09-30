/* Vercel sirve su propio cartel de «not found», en inglés y sin salida. Esta
   función lo reemplaza: `vercel.json` manda acá todo lo que no sea un archivo
   del sitio ni un endpoint de la API, y devuelve la página con el estado 404
   que corresponde. La convención de dejar un 404.html suelto no alcanza:
   `cleanUrls` le saca la extensión y Vercel deja de reconocerlo. */

const PAGINA = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Emisarios · Esta página no existe</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="/styles.css" />
    <style>
      /* Es una página suelta: no la dibuja el panel, así que trae su propio
         armado. Los colores salen igual de las variables de marca. */
      body { margin: 0; min-height: 100dvh; display: grid; place-items: center; padding: 24px;
        background: radial-gradient(circle at 70% 4%, #eadfff 0, transparent 34%), var(--canvas);
        font-family: var(--font-emisarios, "DM Sans", system-ui, sans-serif); color: var(--ink); }
      .caja { display: grid; justify-items: center; gap: 6px; max-width: 460px; text-align: center; }
      .caja svg { width: min(260px, 74vw); height: auto; margin-bottom: 10px; }
      .caja h1 { margin: 0; font-size: 26px; letter-spacing: -.02em; }
      .caja p { margin: 0; color: var(--muted-ink); font-size: 15px; line-height: 1.5; }
      .caja a { margin-top: 18px; display: inline-flex; align-items: center; min-height: 44px;
        padding: 0 22px; border-radius: 999px; background: var(--purple); color: #fff;
        font-size: 13px; font-weight: 700; letter-spacing: .04em; text-decoration: none; }
      .caja a:hover { background: var(--purple-dark); }
    </style>
  </head>
  <body>
    <main class="caja">
      <svg viewBox="0 0 240 190" role="img" aria-label="Un perro triste sosteniendo dos cables cortados">
        <ellipse cx="120" cy="176" rx="74" ry="9" fill="#e1d7ff" opacity=".55"/>
        <path d="M14 150 C 54 150, 66 128, 92 124" stroke="#9966ff" stroke-width="9" fill="none" stroke-linecap="round"/>
        <path d="M226 150 C 186 150, 174 128, 148 124" stroke="#331d75" stroke-width="9" fill="none" stroke-linecap="round"/>
        <path d="M100 120 l10 -4 M101 126 l11 1 M103 132 l10 5" stroke="#9966ff" stroke-width="3" stroke-linecap="round" fill="none"/>
        <path d="M140 120 l-10 -4 M139 126 l-11 1 M137 132 l-10 5" stroke="#331d75" stroke-width="3" stroke-linecap="round" fill="none"/>
        <path d="M120 100 l7 -13 -2.5 9 7.5 -2.5 -9 14 2.5 -8.5 z" fill="#ffb020"/>
        <path d="M56 120 q-16 -34 4 -50 q16 -12 24 10 z" fill="#c9b8a6"/>
        <path d="M184 120 q16 -34 -4 -50 q-16 -12 -24 10 z" fill="#c9b8a6"/>
        <path d="M120 24 c34 0 54 22 54 50 c0 30 -24 48 -54 48 c-30 0 -54 -18 -54 -48 c0 -28 20 -50 54 -50 z" fill="#e5d9cb"/>
        <ellipse cx="120" cy="96" rx="25" ry="19" fill="#f3ece3"/>
        <path d="M120 84 c7 0 11 4 11 8 c0 5 -5 8 -11 8 c-6 0 -11 -3 -11 -8 c0 -4 4 -8 11 -8 z" fill="#3b2f2a"/>
        <path d="M120 100 v8 M120 108 q-7 5 -13 1 M120 108 q7 5 13 1" stroke="#3b2f2a" stroke-width="2.6" fill="none" stroke-linecap="round"/>
        <path d="M92 66 q9 8 18 0" stroke="#3b2f2a" stroke-width="4" fill="none" stroke-linecap="round"/>
        <path d="M130 66 q9 8 18 0" stroke="#3b2f2a" stroke-width="4" fill="none" stroke-linecap="round"/>
        <path d="M88 52 q10 -6 20 -1" stroke="#b9a894" stroke-width="3.4" fill="none" stroke-linecap="round"/>
        <path d="M132 51 q10 -5 20 1" stroke="#b9a894" stroke-width="3.4" fill="none" stroke-linecap="round"/>
        <path d="M101 78 c4 6 6 9 6 12 a6 6 0 0 1 -12 0 c0 -3 2 -6 6 -12 z" fill="#7cc4f2"/>
        <ellipse cx="92" cy="128" rx="15" ry="11" fill="#e5d9cb"/>
        <ellipse cx="148" cy="128" rx="15" ry="11" fill="#e5d9cb"/>
      </svg>
      <h1>Lo siento, algo se rompió</h1>
      <p>Esta página no existe. Puede que el enlace esté mal escrito o que algo se haya movido de lugar.</p>
      <a href="/">Volver al panel</a>
    </main>
  </body>
</html>
`;

export default function handler(req, res) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
  return res.status(404).send(PAGINA);
}
