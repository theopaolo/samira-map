// Loads map points from data/points.json and normalises them into the one
// flat shape the UI renders directly.
import { CATEGORIES, DEFAULT_CATEGORY } from "./config.js";
import rawPoints from "../data/points.json";

const slugify = (value = "") =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "map-entry";

const isValid = (point) =>
  Boolean(point.title) && Number.isFinite(point.lat) && Number.isFinite(point.lng);

// YouTube/Vimeo page links can't play inside a <video> tag — derive the
// embeddable player URL instead. Returns null for direct video files.
function embedUrl(src = "") {
  const youtube = src.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{6,})/);
  if (youtube) return `https://www.youtube-nocookie.com/embed/${youtube[1]}`;
  const vimeo = src.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return null;
}

// Shape a data/points.json entry into the runtime point used by the UI. Also
// lets the admin form render a freshly-saved pin without a reload.
export function shapeJsonPoint(point, index = 0) {
  const { id, title, category, content = [], url } = point;
  const coords = point["gps-coordinates"] || {};
  const cat = CATEGORIES[category] ? category : DEFAULT_CATEGORY;
  const safeId = id || `${slugify(title)}-${index + 1}`;
  let media = content.find((block) => block.type === "image" || block.type === "video") || null;
  if (media?.type === "video") media = { ...media, embed: embedUrl(media.src) };
  return {
    id: safeId,
    title,
    category: cat,
    slug: CATEGORIES[cat].slug,
    glyph: CATEGORIES[cat].glyph,
    icon: CATEGORIES[cat].icon ?? null,
    media,
    paragraphs: content.filter((block) => block.type === "text").map((block) => block.value),
    url: url || { type: "inpage", href: `#${safeId}`, label: "Visit page" },
    lat: Number(coords.latitude),
    lng: Number(coords.longitude),
  };
}

export function loadPoints() {
  return rawPoints.map((point, index) => shapeJsonPoint(point, index)).filter(isValid);
}
