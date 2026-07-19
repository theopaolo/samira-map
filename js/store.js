// The reactive UI brain: one Alpine store holds all view state and actions.
// The map module reads this store; the templates render from it. No manual DOM.
import { CATEGORY_LIST } from "./config.js";
import { createPin, patchPin, formToEntry } from "./pins-api.js";
import { shapeJsonPoint } from "./points.js";
import { rebuildMarkers, flyToPoint } from "./map.js";

const round = (value) => Math.round(value * 1e5) / 1e5;

export function createStore() {
  return {
    points: [],
    filters: CATEGORY_LIST,
    activeCategory: null, // null = no filter, every category is shown
    activeId: null,
    submitOpen: false,
    submitState: "form", // "form" | "done" | "error"
    admin: false,
    placing: false,
    placement: { lat: null, lng: null },
    placementBackup: null,
    editingId: null, // pin id being edited, null = creating a new pin
    draft: { title: "", category: "", story: "", media: "" },

    get visiblePoints() {
      return this.activeCategory
        ? this.points.filter((point) => point.category === this.activeCategory)
        : this.points;
    },
    get activePoint() {
      return this.points.find((point) => point.id === this.activeId) || null;
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
      if (!this.activeId && points.length) this.activeId = points[0].id;
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
    setCategory(category) {
      // Clicking the active filter again clears it, restoring the full set.
      this.activeCategory = this.activeCategory === category ? null : category;
      if (!this.visiblePoints.some((point) => point.id === this.activeId)) {
        const first = this.visiblePoints[0];
        if (first) this.select(first.id);
      }
    },
    openSubmit() {
      this.editingId = null;
      this.draft = { title: "", category: "", story: "", media: "" };
      this.placement = { lat: null, lng: null };
      this.submitState = "form";
      this.submitOpen = true;
    },
    // Prefill the same form from an existing pin and switch submit to a patch.
    openEdit(id) {
      const point = this.points.find((entry) => entry.id === id);
      if (!point) return;
      this.editingId = id;
      this.draft = {
        title: point.title,
        category: point.category,
        story: point.paragraphs.join("\n\n"),
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
      const entry = formToEntry(new FormData(event.target));
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
