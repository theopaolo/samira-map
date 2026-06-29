# Point schema

The canonical shape for a map entry. Each item in [`data/points.json`](data/points.json) — and each Webflow CMS item (see the attribute table in [`README.md`](README.md#direct-webflow-cms-embed)) — is normalised into this shape before the UI renders it.

## `data/points.json`

```json
{
  "id": "unique-slug",
  "title": "Name of entry",
  "category": "main stories",
  "content": [
    { "type": "text", "value": "Story copy" },
    { "type": "image", "src": "assets/image.svg", "alt": "Description" },
    { "type": "video", "src": "https://example.com/video.mp4", "poster": "assets/poster.svg", "caption": "Optional caption" }
  ],
  "url": {
    "type": "inpage",
    "href": "#unique-slug",
    "label": "Visit page"
  },
  "gps-coordinates": {
    "latitude": 35.8249,
    "longitude": 14.5322
  }
}
```

## Fields

- **id** — unique slug. Optional; derived from the title if missing.
- **title** — name of the entry. Required.
- **category** — one of `main stories`, `submitted video`, `main location`, or `archival footage`. Also decides the marker icon. Unknown values fall back to `main stories`.
- **content** — ordered blocks, each one of:
  - `{ "type": "text", "value": "…" }` — a paragraph (rendered in order).
  - `{ "type": "image", "src": "…", "alt": "…" }`
  - `{ "type": "video", "src": "…", "poster": "…", "caption": "…" }` — `poster` and `caption` are optional.
  - The first image **or** video block becomes the entry's media; all text blocks become its paragraphs.
- **url** — `{ "type": "inpage" | "external", "href": "…", "label": "…" }`. Optional; defaults to an in-page link to `#<id>` labelled "Visit page".
- **gps-coordinates** — `{ "latitude": <number>, "longitude": <number> }`. Required, and both must be finite numbers — otherwise the entry is skipped.

## Category → icon

`category` is the only icon source:

| Category | Glyph |
|---|---|
| `main stories` | ▼ |
| `submitted video` | ♥ |
| `main location` | ■ |
| `archival footage` | ★ |
