// Two languages: English (en) and Maltese (mt).
//
// There are two kinds of translated text, both using the same { en, mt } shape:
//   - UI chrome        → data/strings.json, one entry per string key.
//   - Pin content      → data/points.json, translated inline (title, story, …).
// pick() resolves either one for the active language, falling back to the other
// language when a translation is still missing, so nothing ever renders blank.
import STRINGS from "../data/strings.json";

export const LANGS = ["en", "mt"];
export const FALLBACK_LANG = "en";

const OTHER = { en: "mt", mt: "en" };

// Accepts "mt", "mlt", "mt-MT", "en-GB"… → "mt" | "en" | null.
function normalise(value) {
  const code = String(value || "").toLowerCase();
  if (code.startsWith("mt") || code.startsWith("mlt")) return "mt";
  if (code.startsWith("en")) return "en";
  return null;
}

// ?lang=mt is the canonical form; a bare ?mt / ?mlt / ?en flag also works, so
// "?admin&mt" does what an editor would expect. Without a query the browser
// language decides, and English is the last resort.
export function resolveLang(search = location.search, nav = navigator) {
  const params = new URLSearchParams(search);
  const fromQuery =
    normalise(params.get("lang")) || [...params.keys()].map(normalise).find(Boolean);
  if (fromQuery) return fromQuery;

  const preferred = nav.languages?.length ? nav.languages : [nav.language];
  return preferred.map(normalise).find(Boolean) || FALLBACK_LANG;
}

// Read a translated field. Plain strings pass through untouched, so a
// hand-written (not yet translated) value in points.json still renders.
export function pick(value, lang) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  return value[lang] || value[OTHER[lang]] || "";
}

// Split a translated field into its two languages, without cross-fallback —
// used by the editor, so saving never copies one language over the other.
export function toPair(value) {
  if (typeof value === "string") return { en: value, mt: value };
  return { en: value?.en || "", mt: value?.mt || "" };
}

export const emptyPair = () => ({ en: "", mt: "" });

// UI string by key. `vars` fills {placeholders}: t("mapLabelCount", lang, { count: 11 }).
export function t(key, lang, vars) {
  const text = pick(STRINGS[key], lang) || key;
  return vars
    ? text.replace(/\{(\w+)\}/g, (match, name) => (name in vars ? vars[name] : match))
    : text;
}
