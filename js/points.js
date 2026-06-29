// Loads map points from Webflow CMS attributes first, then data/points.json,
// and normalises every source into one flat shape the UI can render directly.
import { CATEGORIES, DEFAULT_CATEGORY } from "./config.js";

const slugify = (value = "") =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "map-entry";

const isValid = (point) =>
  Boolean(point.title) && Number.isFinite(point.lat) && Number.isFinite(point.lng);

// Build the canonical point used everywhere else in the app.
function shape({ id, title, category, content = [], url, latitude, longitude }, index) {
  const cat = CATEGORIES[category] ? category : DEFAULT_CATEGORY;
  const safeId = id || `${slugify(title)}-${index + 1}`;
  return {
    id: safeId,
    title,
    category: cat,
    slug: CATEGORIES[cat].slug,
    glyph: CATEGORIES[cat].glyph,
    media: content.find((block) => block.type === "image" || block.type === "video") || null,
    paragraphs: content.filter((block) => block.type === "text").map((block) => block.value),
    url: url || { type: "inpage", href: `#${safeId}`, label: "Visit page" },
    lat: Number(latitude),
    lng: Number(longitude),
  };
}

function fromJson(point, index) {
  const coords = point["gps-coordinates"] || {};
  return shape({ ...point, latitude: coords.latitude, longitude: coords.longitude }, index);
}

function fromCmsElement(element, index) {
  const data = element.dataset;
  const content = [];
  const image = element.querySelector("[data-map-image]");
  const imageSource = data.image || image?.currentSrc || image?.src;
  const videoSource = data.video || element.querySelector("[data-map-video]")?.getAttribute("href");

  if (imageSource) {
    content.push({ type: "image", src: imageSource, alt: data.imageAlt || image?.alt || "" });
  } else if (videoSource) {
    content.push({
      type: "video",
      src: videoSource,
      poster: data.videoPoster || "",
      caption: data.videoCaption || "",
    });
  }

  (data.content || element.querySelector("[data-map-content]")?.textContent || "")
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .forEach((value) => content.push({ type: "text", value }));

  const href = data.url || `#${data.id || ""}`;
  return shape(
    {
      id: data.id,
      title: data.title?.trim(),
      category: data.category,
      content,
      url: {
        type: data.urlType || (href.startsWith("#") ? "inpage" : "external"),
        href,
        label: data.urlLabel || "Visit page",
      },
      latitude: data.latitude,
      longitude: data.longitude,
    },
    index
  );
}

import fallbackPoints from "../data/points.json";

export async function loadPoints() {
  const cmsPoints = [...document.querySelectorAll("[data-map-entry]")].map(fromCmsElement).filter(isValid);
  if (cmsPoints.length) return cmsPoints;
  return fallbackPoints.map(fromJson).filter(isValid);
}
