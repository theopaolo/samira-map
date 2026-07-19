# Samira map — Claude Code instructions

Interactive map: Vite + Alpine.js + Leaflet, CSS built on the Piloti framework (split into multiple files per concern).

## Dev & build

- `npm run dev` → Vite dev server with HMR.
- `npm run build` → `dist/`. Vendored deps are refreshed by `scripts/vendor.mjs` (runs on postinstall).

## Hard rules

- Served online, embedded in a Webflow page (no Webflow CMS — the rest of the site is built directly in Webflow). Runtime network dependencies are intentional and limited to: the CARTO **basemap tiles**, and **pin media** referenced by URL (Webflow-hosted images, YouTube/Vimeo embeds). Keep everything else bundled/self-hosted (fonts, scripts, icons).
- Deployment target is Coolify using the repo `Dockerfile` (build pack = Dockerfile, not Nixpacks).
