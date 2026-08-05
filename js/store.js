// The reactive UI brain: one Alpine store holds all view state and actions.
// The map module reads this store; the templates render from it. No manual DOM.
//
// Language: `points` keeps the raw { en, mt } fields; every getter the UI reads
// hands back a copy resolved to `lang`. Switching language is therefore just
// `lang = "mt"` — every template re-renders on its own.
import { CATEGORY_LIST } from "./config.js";
import { createPin, patchPin, draftToEntry } from "./pins-api.js";
import { shapeJsonPoint, localizePoint, storyPair } from "./points.js";
import { FALLBACK_LANG, LANGS, pick, t, toPair, emptyPair } from "./i18n.js";
import { rebuildMarkers, flyToPoint } from "./map.js";

const round = (value) => Math.round(value * 1e5) / 1e5;

const emptyDraft = () => ({
  title: emptyPair(),
  category: "",
  story: emptyPair(),
  media: "",
});

export function createStore() {
  return {
    points: [], // raw points: translated fields are still { en, mt } pairs
    lang: FALLBACK_LANG,
    activeCategory: null, // null = no filter, every category is shown
    activeId: null,
    submitOpen: false,
    submitState: "form", // "form" | "done" | "error"
    admin: false,
    placing: false,
    placement: { lat: null, lng: null },
    placementBackup: null,
    editingId: null, // pin id being edited, null = creating a new pin
    draft: emptyDraft(),

    // UI string in the active language: t("skipToMap").
    t(key, vars) {
      return t(key, this.lang, vars);
    },
    // Admin-only: swap the language the map and the editor's fields show.
    // The admin chrome itself stays English.
    setLang(lang) {
      this.lang = lang;
      document.documentElement.lang = lang;
      rebuildMarkers(); // marker tooltips carry the pin titles
      // Mirror the choice into the URL, so a reload (or a shared link) keeps it.
      const url = new URL(location.href);
      LANGS.forEach((code) => url.searchParams.delete(code)); // drop bare ?mt / ?en flags
      url.searchParams.delete("mlt");
      url.searchParams.set("lang", lang);
      // Keep valueless flags bare: "?admin&lang=en", not "?admin=&lang=en".
      history.replaceState(null, "", url.toString().replace(/=(?=&|#|$)/g, ""));
    },

    // The language currently *not* being edited. A title/story is required
    // only while the other language is still empty, so a pin can be saved with
    // one language filled in and translated later.
    get otherLang() {
      return this.lang === "mt" ? "en" : "mt";
    },
    get filters() {
      return CATEGORY_LIST.map((category) => ({
        ...category,
        label: pick(category.label, this.lang),
      }));
    },
    get localizedPoints() {
      return this.points.map((point) => localizePoint(point, this.lang));
    },
    get visiblePoints() {
      return this.activeCategory
        ? this.localizedPoints.filter((point) => point.category === this.activeCategory)
        : this.localizedPoints;
    },
    get activePoint() {
      const point = this.points.find((entry) => entry.id === this.activeId);
      return point ? localizePoint(point, this.lang) : null;
    },
    get hasPlacement() {
      return Number.isFinite(this.placement.lat) && Number.isFinite(this.placement.lng);
    },
    get placementLabel() {
      return this.hasPlacement
        ? `${this.placement.lat.toFixed(5)}° N · ${this.placement.lng.toFixed(5)}° E`
        : "No point chosen yet";
    },

    setPoints(points) {
      this.points = points;
    },
    // Select without panning (used by marker clicks — the point is already in view).
    select(id) {
      if (!this.points.some((point) => point.id === id)) return;
      this.activeId = id;
      history.replaceState(null, "", `#${id}`);
    },
    // Select and pan the map to the point.
    focus(id) {
      this.select(id);
      if (this.activePoint) flyToPoint(this.activePoint);
    },
    // Admin marker drag: move the raw point so the change survives re-renders.
    movePoint(id, lat, lng) {
      const point = this.points.find((entry) => entry.id === id);
      if (!point) return null;
      point.lat = round(lat);
      point.lng = round(lng);
      return point;
    },
    setCategory(category) {
      // Clicking the active filter again clears it, restoring the full set.
      this.activeCategory = this.activeCategory === category ? null : category;
      if (this.activeId && !this.visiblePoints.some((point) => point.id === this.activeId)) {
        const first = this.visiblePoints[0];
        if (first) this.select(first.id);
      }
    },
    openSubmit() {
      this.editingId = null;
      this.draft = emptyDraft();
      this.placement = { lat: null, lng: null };
      this.submitState = "form";
      this.submitOpen = true;
    },
    // Prefill the same form from an existing pin and switch submit to a patch.
    // Both languages are loaded at once — the EN/MT switch only decides which
    // one the inputs are bound to.
    openEdit(id) {
      const point = this.points.find((entry) => entry.id === id);
      if (!point) return;
      this.editingId = id;
      this.draft = {
        title: toPair(point.title),
        category: point.category,
        story: storyPair(point.text),
        media: point.media?.src || "",
      };
      this.placement = { lat: point.lat, lng: point.lng };
      this.submitState = "form";
      this.submitOpen = true;
    },
    syncDialog(dialog) {
      if (this.submitOpen && !dialog.open) {
        dialog.showModal();
        dialog.querySelector("[name='Story-title']")?.focus();
      } else if (!this.submitOpen && dialog.open) {
        dialog.close();
      }
    },
    // Persist the pin to data/points.json via the dev writer, then drop it onto
    // the map live. Handles both new pins (POST) and edits (PUT).
    async submit(event) {
      event.preventDefault();
      const entry = draftToEntry(this.draft, this.placement);
      let savedId;
      try {
        if (this.editingId) {
          // Keep hand-written media extras (alt, caption, poster) when the
          // media link itself didn't change.
          const prevMedia = this.points.find((p) => p.id === this.editingId)?.media;
          const mediaIndex = entry.content.findIndex((block) => block.type !== "text");
          if (prevMedia && entry.content[mediaIndex]?.src === prevMedia.src) {
            const { embed, ...block } = prevMedia;
            entry.content[mediaIndex] = block;
          }
          const { point } = await patchPin(this.editingId, entry);
          const index = this.points.findIndex((p) => p.id === this.editingId);
          this.points.splice(index, 1, shapeJsonPoint(point, index));
          savedId = point.id;
        } else {
          const { point } = await createPin(entry);
          this.points = [...this.points, shapeJsonPoint(point, this.points.length)];
          savedId = point.id;
        }
        rebuildMarkers();
        this.focus(savedId);
        this.submitState = "done";
      } catch (error) {
        console.error(error);
        this.submitState = "error";
      }
    },

    // --- Pin placement: click the map instead of typing coordinates. ---
    startPlacing() {
      this.placementBackup = { ...this.placement };
      this.submitOpen = false;
      this.placing = true;
    },
    setPlacement(lat, lng) {
      this.placement = { lat: round(lat), lng: round(lng) };
    },
    confirmPlacement() {
      this.placing = false;
      this.submitOpen = true;
    },
    cancelPlacing() {
      if (this.placementBackup) this.placement = this.placementBackup;
      this.placing = false;
      this.submitOpen = true;
    },
  };
}
