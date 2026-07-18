# Mal-Bajja · By the Bay

An interactive cultural map of Birżebbuġa, Malta. It is a small **Vite + Alpine.js + Leaflet** app: you author the map's pins locally in a builder UI, then run a build to produce a static bundle you can host directly or embed (e.g. in a Webflow page).

## Stack

- **Leaflet + CARTO/OpenStreetMap** — the interactive base map and markers. Leaflet ships with the app; only the map tiles are fetched online.
- **Alpine.js** — declarative UI state (story panel, filters, submit dialog). All rendering reacts to one store, so there is no manual DOM wiring.
- **Vite** — the dev server (with a pin-writer plugin) and the production build into `dist/`.
- **ES modules** under `js/` — small, single-responsibility files:
  - `config.js` — map setup and the category list (labels, colour tones, icons, glyph fallbacks) — one source of truth.
  - `points.js` — loads + normalises points from `data/points.json` (or Webflow CMS attributes).
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

## Content sources

The app checks for published Webflow CMS entries in the page first; if none are present, it loads [`data/points.json`](data/points.json). For the builder workflow above, `data/points.json` is the source of truth.

### Standalone or iframe build

Author the pins (or edit `data/points.json` directly), `npm run build`, and deploy the `dist/` folder to any static host. No server runtime is required.

### Direct Webflow CMS embed (optional)

Instead of `data/points.json`, points can come from the page's DOM. Create a `Map Entries` CMS Collection and render it in a hidden Collection List on the map page. Give each Collection Item the `data-map-entry` custom attribute, then bind these attributes to its CMS fields:

| Attribute | CMS value |
|---|---|
| `data-id` | Slug |
| `data-title` | Name |
| `data-category` | `main stories`, `submitted video`, `main location`, or `archival footage` |
| `data-latitude` | Latitude number |
| `data-longitude` | Longitude number |
| `data-content` | Story text |
| `data-image` | Image URL |
| `data-image-alt` | Image description |
| `data-video` | Video URL |
| `data-video-poster` | Poster URL |
| `data-video-caption` | Video caption (optional) |
| `data-url` | Entry or external URL |
| `data-url-type` | `inpage` or `external` (optional; inferred from the URL if omitted) |
| `data-url-label` | Link text |

To bind media to real Webflow elements instead of text attributes, the loader also reads child elements inside each `[data-map-entry]`: an `<img data-map-image>` (its `src` and `alt`), an `<a data-map-video href="…">` link, and a `<div data-map-content>` whose text becomes the paragraphs. The `data-*` attributes above take priority; these child elements are the fallback.

The marker icon is derived from `data-category`, so there is no separate icon field to keep in sync in the CMS.

The JavaScript reads these elements with `document.querySelectorAll('[data-map-entry]')`; no CMS token is exposed in the browser.

## Point schema

Each entry in `data/points.json` follows the shape documented in [`map-schema.md`](map-schema.md): an `id`, `title`, `category`, an ordered `content` array (text / image / video blocks), a `url`, and `gps-coordinates`. The marker icon is derived from `category` — see [Category icons](#category-icons) to customise it.
