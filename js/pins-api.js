// Client side of the dev-only pin writer (see scripts/pins-dev-plugin.mjs).
// Talks to the Vite middleware that persists pins into data/points.json.
import { DEFAULT_CATEGORY } from "./config.js";

const ENDPOINT = "/__pins";

const isVideoSrc = (src) =>
  /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(src) || /youtube|youtu\.be|vimeo/i.test(src);

const mediaBlock = (src) =>
  isVideoSrc(src)
    ? { type: "video", src, poster: "", caption: "" }
    : { type: "image", src, alt: "" };

// Map the authoring form's fields onto the data/points.json schema. The server
// fills in a unique `id` and a default `url`.
export function formToEntry(formData) {
  const get = (name) => (formData.get(name) || "").toString().trim();
  const content = [];
  const media = get("Media-link");
  if (media) content.push(mediaBlock(media));
  get("Story")
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .forEach((value) => content.push({ type: "text", value }));

  return {
    title: get("Story-title"),
    category: get("Category") || DEFAULT_CATEGORY,
    content,
    "gps-coordinates": {
      latitude: Number(formData.get("Latitude")),
      longitude: Number(formData.get("Longitude")),
    },
  };
}

async function request(method, body) {
  const res = await fetch(ENDPOINT, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(detail.error || `Pin ${method} failed (${res.status})`);
  }
  return res.json();
}

export const createPin = (entry) => request("POST", entry);
export const patchPin = (id, patch) => request("PUT", { id, ...patch });
