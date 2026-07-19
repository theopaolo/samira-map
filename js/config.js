// Single source of truth for map setup, categories and filters.

export const MAP = {
  center: [35.827, 14.529],
  zoom: 14,
  minZoom: 11,
  maxZoom: 19,
  tiles: {
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    subdomains: "abcd",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
};

// One entry per category — the single place to edit a category's label, marker
// colour tone, icon and text-glyph fallback. Drives the markers, filter bar and
// story category label alike.
//
// Custom icons: drop an SVG/PNG into public/assets/icons/ and point `icon` at
// it (path relative to the site root). Icons render as silhouettes tinted with
// the marker colour, so only the shape matters. Set `icon: null` to fall back
// to the text `glyph`. See public/assets/icons/README.md.
export const CATEGORY_LIST = [
  { key: "main stories",     label: "Main stories",     slug: "main-stories",     tone: "stories",  glyph: "▼", icon: "assets/icons/main-stories.svg" },
  { key: "submitted video",  label: "Submitted video",  slug: "submitted-video",  tone: "video",    glyph: "♥", icon: "assets/icons/submitted-video.svg" },
  { key: "main location",    label: "Main locations",   slug: "main-location",    tone: "location", glyph: "■", icon: "assets/icons/main-location.svg" },
  { key: "archival footage", label: "Archival footage", slug: "archival-footage", tone: "archive",  glyph: "★", icon: "assets/icons/archival-footage.svg" },
];

export const DEFAULT_CATEGORY = "main stories";

// Keyed lookup used when shaping points.
export const CATEGORIES = Object.fromEntries(
  CATEGORY_LIST.map((category) => [category.key, category])
);
