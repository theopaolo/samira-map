# Mal-Bajja · By the Bay

An interactive cultural map of Birżebbuġa, Malta. It is a small **Vite + Alpine.js + Leaflet** app: you author the map's pins locally in a builder UI, then run a build to produce a static bundle that is **served online, embedded in a Webflow page**.

Because it is always online, the map deliberately uses the **CARTO basemap CDN** for tiles — there is no offline requirement, so the bundle stays light rather than shipping local tiles. Everything else (Leaflet, Alpine, fonts, scripts, icons, media) is bundled.

## Stack

- **Leaflet + CARTO/OpenStreetMap** — the interactive base map and markers. Leaflet ships with the app; the basemap tiles are fetched from the CARTO CDN at runtime (intentional — see above).
- **Alpine.js** — declarative UI state (story panel, filters, submit dialog). All rendering reacts to one store, so there is no manual DOM wiring.
- **Vite** — the dev server (with a pin-writer plugin) and the production build into `dist/`.
- **ES modules** under `js/` — small, single-responsibility files:
  - `config.js` — map setup and the category list (labels, colour tones, icons, glyph fallbacks) — one source of truth.
  - `points.js` — loads + normalises points from `data/points.json`.
  - `store.js` — the reactive Alpine store: view state, selection, filtering and pin authoring.
  - `map.js` — Leaflet glue; markers, pin placement and admin drag, driven by store effects.
  - `pins-api.js` — client side of the dev-only pin writer (talks to the Vite middleware).
  - `main.js` — bootstrap (register store, load data, start map).

## Develop & build

```bash
npm install      # first run (also vendors deps via postinstall)
npm run dev      # Vite dev server with HMR — the authoring/builder environment
npm run build    # → dist/ : the static bundle to deploy or embed
```

A dev server is required — the app uses ES-module imports that Vite resolves, so opening the files directly (or via a plain static server) will not work while developing. Deployment uses the repo `Dockerfile` (build pack = Dockerfile) on Coolify; the built `dist/` is plain static files.

**Bundle.** CSS is kept lean: the app owns its styles under `css/`, and `piloti/` is trimmed to just its reset (the framework's utilities/variables/responsive layers were unused). CSS minification is on. The built stylesheet is ~30 kB (~10 kB gzipped).

## Building the map (adding & repositioning pins)

The map is authored locally and baked into [`data/points.json`](data/points.json), which the build bundles into `dist/`.

1. `npm run dev` and open the app with **`?admin`** (e.g. `http://localhost:5173/?admin`).
2. Click **Add a pin**, fill in the story, and choose the location on the map — click to drop the pin, then drag it to fine-tune.
3. Saving writes the pin straight into `data/points.json` via the dev-only writer (`scripts/pins-dev-plugin.mjs`), and it appears on the map immediately.
4. To **reposition** any existing pin, drag its marker in `?admin` mode — the new coordinates are saved automatically.
5. `npm run build`, then deploy or embed the result.

Without `?admin` the map is a clean, read-only view with no authoring UI. Public visitors are directed to request additions by email rather than submitting through the app.

## Category icons

Each category has one icon, shared by all of its pins and shown on the markers, the filter bar and the story panel's category label. Categories (and their icons) are defined in one place: `js/config.js` → `CATEGORY_LIST`.

To use your own icon:

1. Drop an **SVG** (preferred) or **PNG** into [`public/assets/icons/`](public/assets/icons/).
2. Point the category's `icon` at it (path relative to the site root, e.g. `assets/icons/foo.svg`). Keeping a placeholder's filename means no config edit is needed.
3. `npm run build`.

Icons render as **silhouettes tinted with the marker colour** (via CSS `mask`), so a dropped-in icon inherits the same hover/active colour states the text glyphs had. Use a single-colour shape on a transparent background — the file's own colour is ignored, only its shape is used. Set `icon: null` on a category to fall back to its text `glyph`. See [`public/assets/icons/README.md`](public/assets/icons/README.md).

## Static assets

Images, video posters and icons live under `public/assets/` and are copied verbatim into `dist/assets/` by the build. Reference them by site-root-relative path (e.g. `assets/monument.svg`, `assets/icons/foo.svg`) — the same string used in `data/points.json` and `config.js`.

## Dependencies

Leaflet and Alpine.js are pinned in `package.json` and installed into `node_modules`; `scripts/vendor.mjs` (run on `postinstall`) also refreshes local copies in `vendor/`. To update them (requires Node), bump the versions in `package.json`, then:

```bash
npm install        # installs into node_modules and re-vendors automatically
# or, without changing versions:
npm run vendor     # re-copy the current node_modules files into vendor/
```

Run `npm outdated` to check for newer releases.

## Content & media

[`data/points.json`](data/points.json) is the single source of truth for the map's pins. Author the pins in the builder (or edit the file directly), `npm run build`, and deploy the `dist/` folder — no server runtime is required. The rest of the site (about, contact, the grid listing of places) lives directly in Webflow; the map is embedded in it as an iframe.

Pin media comes from URLs:

- **Images** — any hosted image URL (e.g. an asset uploaded to Webflow), or a file placed under `public/assets/` and referenced by site-root-relative path.
- **Videos** — paste a YouTube (or Vimeo) link; the story panel embeds it as a player. Direct video file URLs (`.mp4`, `.webm`, …) play in a native `<video>` element instead.

## Point schema

Each entry in `data/points.json` follows the shape documented in [`map-schema.md`](map-schema.md): an `id`, `title`, `category`, an ordered `content` array (text / image / video blocks), a `url`, and `gps-coordinates`. The marker icon is derived from `category` — see [Category icons](#category-icons) to customise it.
