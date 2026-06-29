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

// A category drives both its marker glyph and its CSS slug (marker-* / tone-*).
export const CATEGORIES = {
  "main stories": { glyph: "▼", slug: "main-stories" },
  "submitted video": { glyph: "♥", slug: "submitted-video" },
  "main location": { glyph: "■", slug: "main-location" },
  "archival footage": { glyph: "★", slug: "archival-footage" },
};

export const DEFAULT_CATEGORY = "main stories";

// Ordered list rendered as the map legend / filter bar.
export const FILTERS = [
  { key: "all", label: "All places", glyph: "••", tone: "all" },
  { key: "main stories", label: "Main stories", glyph: "▼", tone: "stories" },
  { key: "submitted video", label: "Submitted video", glyph: "♥", tone: "video" },
  { key: "main location", label: "Main locations", glyph: "■", tone: "location" },
  { key: "archival footage", label: "Archival footage", glyph: "★", tone: "archive" },
];
