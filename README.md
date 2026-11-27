# Aquí Somos Buena Música

Web del festival. Se publica en Cloudflare Pages (somosbuenamusica.com) con cada cambio en la rama main.

- `index.html`: sitio público.
- `admin/index.html`: versión completa con administración y barra de escenarios. Solo entra la cuenta autorizada (Cloudflare Access + `functions/_middleware.js`, variables ACCESS_TEAM, ACCESS_AUD y ADMIN_EMAILS).
- `tools/build_public.py`: genera `index.html` desde `admin/index.html` sin barra ni administración. Ejecutar tras cada cambio.
