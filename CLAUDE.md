# Samira map — Claude Code instructions

Interactive map: Vite + Alpine.js + Leaflet, CSS built on the Piloti framework (split into multiple files per concern).

## Dev & build

- `npm run dev` → Vite dev server with HMR.
- `npm run build` → `dist/`. Vendored deps are refreshed by `scripts/vendor.mjs` (runs on postinstall).

## Hard rules

- Offline-first: NO external/CDN dependencies (basemaps, fonts, scripts). Everything must work without internet.
- Deployment target is Coolify using the repo `Dockerfile` (build pack = Dockerfile, not Nixpacks).
