# Category marker icons

One icon per category. These files are the icons shown on the map markers, the
filter bar, and the story panel's category label.

## Replace an icon

1. Drop a new **SVG** (preferred) or **PNG** file in this folder.
2. Point the category at it in `js/config.js` → `CATEGORY_LIST` → the `icon`
   field (path is relative to the site root, e.g. `assets/icons/my-icon.svg`).
   If you keep the same filename as the placeholder, no config edit is needed.
3. Rebuild: `npm run build`.

## How icons are rendered

Icons are drawn as **silhouettes tinted with the marker colour** (via CSS
`mask`), so they inherit every hover/active state the old text glyphs had.

- Use a **single-colour shape on a transparent background** — the fill colour
  in the file is ignored; only the shape (alpha) is used.
- Aim for a square-ish icon (a `0 0 24 24` viewBox works well).
- Set `icon: null` on a category in `config.js` to fall back to its text
  `glyph` instead.

If you want full-colour icons instead of tinted silhouettes, switch the
`.masked-icon` rule in `css/map.css` to a plain `<img>` — but note the marker's
colour-flip on hover won't apply to a fixed-colour image.
