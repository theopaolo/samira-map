// Loads map points from data/points.json and normalises them into the one
// flat shape the UI renders directly.
//
// Two steps, because the app is bilingual: shapeJsonPoint() keeps the
// translated fields as { en, mt } pairs, and localizePoint() resolves them to
// plain strings for the active language right before rendering.
import { CATEGORIES, DEFAULT_CATEGORY } from "./config.js";
import { pick, toPair } from "./i18n.js";
import rawPoints from "../data/points.json";

const slugify = (value = "") =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "map-entry";

// pick() falls back to the other language, so this asks "a title in *some*
// language", not "an English title".
const isValid = (point) =>
  Boolean(pick(point.title, "en")) && Number.isFinite(point.lat) && Number.isFinite(point.lng);

// YouTube/Vimeo page links can't play inside a <video> tag — derive the
// embeddable player URL instead. Returns null for direct video files.
function embedUrl(src = "") {
  const youtube = src.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{6,})/);
  if (youtube) return `https://www.youtube-nocookie.com/embed/${youtube[1]}`;
  const vimeo = src.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return null;
}

// The "Visit page" link is opt-in: a pin gets one only when its entry carries a
// real href. Drop `url` (or blank its href) in data/points.json and the footer
// link disappears — that's how a pin whose page doesn't exist yet, an archive
// video for instance, avoids advertising a dead link.
function shapeUrl(url) {
  const href = (url?.href || "").trim();
  if (!href) return null;
  const inpage = href.startsWith("#");
  return {
    type: inpage ? "inpage" : "external",
    // Bare hosts ("www.mal-bajja.com/x") would otherwise resolve against the
    // map's own URL — and inside the Webflow embed that means the iframe.
    href: /^(https?:\/\/|\/|#|mailto:)/i.test(href) ? href : `https://${href}`,
    // Optional: the footer falls back to the shared t("visitPage") string.
    label: url.label || null,
  };
}

// Shape a data/points.json entry into the runtime point used by the UI. Also
// lets the admin form render a freshly-saved pin without a reload.
export function shapeJsonPoint(point, index = 0) {
  const { id, title, category, content = [], url } = point;
  const coords = point["gps-coordinates"] || {};
  const cat = CATEGORIES[category] ? category : DEFAULT_CATEGORY;
  const safeId = id || `${slugify(pick(title, "en"))}-${index + 1}`;
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
    // Translated story blocks, kept unresolved — see storyText() / localizePoint().
    text: content.filter((block) => block.type === "text").map((block) => block.value),
    url: shapeUrl(url),
    lat: Number(coords.latitude),
    lng: Number(coords.longitude),
  };
}

// The whole story in one language, blocks joined back into one text body.
// Falls back to the other language, so a missing translation still reads.
export const storyText = (text = [], lang) =>
  text.map((value) => pick(value, lang)).filter(Boolean).join("\n\n");

// Same, but strictly per language and for both at once — what the editor loads
// into its draft. No fallback here, or saving would copy one language over the
// other and the missing translation would look done.
export const storyPair = (text = []) => {
  const blocks = text.map(toPair);
  return {
    en: blocks.map((block) => block.en).filter(Boolean).join("\n\n"),
    mt: blocks.map((block) => block.mt).filter(Boolean).join("\n\n"),
  };
};

// Resolve every translated field to the active language. Cheap enough to run
// on each render, so switching language needs no reload.
export function localizePoint(point, lang) {
  return {
    ...point,
    title: pick(point.title, lang),
    categoryLabel: pick(CATEGORIES[point.category].label, lang),
    media: point.media && {
      ...point.media,
      alt: pick(point.media.alt, lang),
      caption: pick(point.media.caption, lang),
    },
    paragraphs: storyText(point.text, lang).split(/\n\s*\n/).filter(Boolean),
    url: point.url && { ...point.url, label: pick(point.url.label, lang) },
  };
}

export function loadPoints() {
  return rawPoints.map((point, index) => shapeJsonPoint(point, index)).filter(isValid);
}
