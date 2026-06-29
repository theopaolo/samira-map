# Mal-Bajja · By the Bay

A static, data-driven cultural map. No PHP, Node, Go, database, or build step is needed to deploy — just static files.

## Stack

- **Leaflet + CARTO/OpenStreetMap** — the interactive base map and markers. Leaflet is vendored locally (see [Dependencies](#dependencies)); only the map tiles are fetched online.
- **Alpine.js** — declarative UI state (story panel, filters, index, dialog). All rendering reacts to one store, so there is no manual DOM wiring. Also vendored locally.
- **ES modules** under `js/` — small, single-responsibility files:
  - `config.js` — map setup, categories and the legend/filter list (one source of truth).
  - `points.js` — loads + normalises points from Webflow CMS attributes or `data/points.json`.
  - `store.js` — the reactive Alpine store: all view state, selection, filtering and submissions.
  - `map.js` — Leaflet glue; markers, pin placement and admin drag, driven by store effects.
  - `main.js` — bootstrap (register store, load data, start map).

## Run locally

```bash
python3 -m http.server 8000
```

Open `http://127.0.0.1:8000`. A server is required because the app uses ES modules and `fetch`.

The only network dependency at runtime is the CARTO/OpenStreetMap map tiles; Leaflet and Alpine ship in `vendor/`. Local preview submissions are saved only in the current browser's `localStorage`; they are deliberately not added to the public map without review.

## Dependencies

Leaflet and Alpine.js are **vendored** into `vendor/` (committed to the repo), so deploying still needs nothing but the static files — no CDN and no build step. The exact versions are pinned in `package.json` and recorded in `vendor/manifest.json`.

To update them (requires Node), bump the versions in `package.json`, then:

```bash
npm install        # installs into node_modules and re-vendors automatically
# or, without changing versions:
npm run vendor     # re-copy the current node_modules files into vendor/
```

`npm run vendor` copies `leaflet.js`/`leaflet.css` (+ marker images) and Alpine's `module.esm.js` from `node_modules` into `vendor/`. `node_modules` is git-ignored; only `vendor/` is shipped. Run `npm outdated` to check for newer releases.

## Adding & repositioning pins

- **Contributors** never type coordinates. In the Submit dialog, *Pin location → Choose on map* drops them onto the map: click to place the pin, then drag it to fine-tune. The chosen latitude/longitude are submitted automatically.
- **Editors** can reposition existing markers by opening the map with `?admin=1` (e.g. `http://127.0.0.1:8000/?admin=1`). Markers become draggable; dropping one shows a toast with the new coordinates to paste back into `data/points.json` (or the CMS item). This keeps the published map read-only while making corrections quick.

## Content sources

The app checks for published Webflow CMS entries first. If none are present, it loads [`data/points.json`](data/points.json).

### Standalone or iframe build

Edit `data/points.json` and deploy the complete folder to any static host. No server runtime is required.

### Direct Webflow CMS embed

Create a `Map Entries` CMS Collection and render it in a hidden Collection List on the map page. Give each Collection Item the `data-map-entry` custom attribute, then bind these attributes to its CMS fields:

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

The marker icon is derived from `data-category`, so there is no separate icon field to keep in sync.

The JavaScript reads these elements with `document.querySelectorAll('[data-map-entry]')`; no CMS token is exposed in the browser.

## Story submissions in Webflow

The included dialog defines the form fields and local preview behavior. For production on a Webflow-hosted page:

1. Add a native Webflow **Form block** named `Story Submission`.
2. Recreate the fields from `#story-submission-form`, keeping their `name` values.
3. Keep Webflow as the form destination and enable the desired notification recipients.
4. Review submissions in **Site settings → Forms** before creating a published Map Entry CMS item.

This moderation step prevents unreviewed text, locations, and media from appearing publicly. Webflow Forms collects the submissions; the static map remains read-only.

For automatic draft creation, connect the form to Zapier or Make and create a Webflow CMS draft. Webflow Logic should not be used because it was discontinued in June 2025.

If the app is hosted as an iframe instead of embedded directly in the Webflow page, configure a third-party form endpoint before `js/main.js` loads:

```html
<script>
  window.SHORELINE_ATLAS_CONFIG = {
    submissionEndpoint: "https://your-form-endpoint.example"
  };
</script>
```

The endpoint must accept a standard browser `POST` form submission.

## Point schema

Each entry in `data/points.json` follows the shape documented in [`map-schema.md`](map-schema.md): an `id`, `title`, `category`, an ordered `content` array (text / image / video blocks), a `url`, and `gps-coordinates`. `category` is the only icon source: `main stories` ▼, `submitted video` ♥, `main location` ■, `archival footage` ★.

Official references: [Webflow Forms overview](https://help.webflow.com/hc/en-us/articles/33961347548563-Forms-overview), [form submissions](https://help.webflow.com/hc/en-us/articles/33961344521235-Form-submissions), and [Zapier integration](https://help.webflow.com/hc/en-us/articles/33961235002643-Does-Webflow-integrate-with-Zapier).
