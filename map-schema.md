# Point schema

The canonical shape for a map entry. Each item in [`data/points.json`](data/points.json) is normalised into this shape before the UI renders it.

The map is bilingual (English + Maltese), so every text field the visitor reads is an `{ "en": "…", "mt": "…" }` pair. A field may still be a plain string — it is then shown in both languages, which is what you want for a name that does not change. An empty side falls back to the other language, so a missing translation never renders blank.

## `data/points.json`

```json
{
  "id": "unique-slug",
  "title": { "en": "Name of entry", "mt": "Isem tal-entrata" },
  "category": "landmarks",
  "content": [
    { "type": "text", "value": { "en": "Story copy", "mt": "Test tal-istorja" } },
    { "type": "image", "src": "assets/image.svg", "alt": "Description" },
    { "type": "video", "src": "https://example.com/video.mp4", "poster": "assets/poster.svg", "caption": "Optional caption" }
  ],
  "url": { "href": "https://www.mal-bajja.com/unique-slug" },
  "gps-coordinates": {
    "latitude": 35.8249,
    "longitude": 14.5322
  }
}
```

## Fields

- **id** — unique slug. Optional; derived from the title if missing.
- **title** — name of the entry, translated. Required in at least one language.
- **category** — a key from `CATEGORY_LIST` in `js/config.js`: `landmarks` or `archival footage`. Also decides the marker icon. Unknown values fall back to `landmarks`.
- **content** — ordered blocks, each one of:
  - `{ "type": "text", "value": { "en": "…", "mt": "…" } }` — the story body. Blank lines inside a value split it into paragraphs, per language, so the two languages can have different paragraph counts. The builder writes one text block; several are still read and joined.
  - `{ "type": "image", "src": "…", "alt": "…" }`
  - `{ "type": "video", "src": "…", "poster": "…", "caption": "…" }` — `poster` and `caption` are optional.
  - `alt` and `caption` may be translated pairs too.
  - The first image **or** video block becomes the entry's media; the text blocks become its story.
- **url** — `{ "href": "…", "label": … }`, the "Visit page" link in the story footer. Optional and never invented: leave it out (or blank the `href`) and the pin shows no link — that is how a pin whose page does not exist yet stays link-free. `href` is not translated; a bare host gets `https://` prefixed, and anything that is not a `#anchor` opens in a new tab. `label` is optional too and falls back to the shared `visitPage` string.
- **gps-coordinates** — `{ "latitude": <number>, "longitude": <number> }`. Required, and both must be finite numbers — otherwise the entry is skipped.

## UI strings

Text that belongs to the interface rather than to a pin (empty state, loading, media placeholder, …) lives in [`data/strings.json`](data/strings.json), one key per string, same `{ en, mt }` shape:

```json
{ "noMedia": { "en": "No media attached", "mt": "L-ebda midja mehmuża" } }
```

Templates read them through `$store.atlas.t('noMedia')`. Admin-only chrome is deliberately **not** translated — it stays English.

## Category → icon

`category` is the only icon source:

| Category key | Label (en / mt) | Glyph |
|---|---|---|
| `landmarks` | Landmarks / punt ta' riferiment | ■ |
| `archival footage` | Archive / arkivju | ★ |
