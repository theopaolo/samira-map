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

const trimPair = (pair) => ({ en: (pair.en || "").trim(), mt: (pair.mt || "").trim() });

// Map the editor's draft onto the data/points.json schema. Both languages are
// written in one go: the story is a single text block holding an { en, mt }
// pair, and paragraphs are split per language at render time. The server fills
// in a unique `id` and a default `url`.
export function draftToEntry(draft, placement) {
  const content = [];
  const media = (draft.media || "").trim();
  if (media) content.push(mediaBlock(media));
  const story = trimPair(draft.story);
  if (story.en || story.mt) content.push({ type: "text", value: story });

  return {
    title: trimPair(draft.title),
    category: draft.category || DEFAULT_CATEGORY,
    content,
    "gps-coordinates": {
      latitude: Number(placement.lat),
      longitude: Number(placement.lng),
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
