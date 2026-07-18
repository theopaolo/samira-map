// The reactive UI brain: one Alpine store holds all view state and actions.
// The map module reads this store; the templates render from it. No manual DOM.
import { FILTERS } from "./config.js";
import { createPin, formToEntry } from "./pins-api.js";
import { shapeJsonPoint } from "./points.js";
import { rebuildMarkers } from "./map.js";

const round = (value) => Math.round(value * 1e5) / 1e5;

function transport() {
  const endpoint = window.SHORELINE_ATLAS_CONFIG?.submissionEndpoint?.trim();
  if (endpoint) return { type: "endpoint", endpoint };
  if (document.documentElement.hasAttribute("data-wf-site")) return { type: "webflow" };
  return { type: "local" };
}

export function transportNote() {
  const note = {
    endpoint: "Your contribution will be sent for review.",
    webflow: "Submitted securely through Webflow for review.",
    local: "Builder mode: this pin is written to data/points.json — run a build to publish it.",
  };
  return note[transport().type];
}

export function createStore() {
  return {
    points: [],
    filters: FILTERS,
    activeCategory: "all",
    activeId: null,
    focusToken: 0, // bumped only when a selection should pan the map
    focusTarget: null, // [lat, lng] captured at focus time so panning never tracks activeId
    submitOpen: false,
    submitState: "form", // "form" | "done" | "error"
    modeNote: "",
    admin: false,
    placing: false,
    placement: { lat: null, lng: null },
    placementBackup: null,

    get visiblePoints() {
      return this.activeCategory === "all"
        ? this.points
        : this.points.filter((point) => point.category === this.activeCategory);
    },
    get activePoint() {
      return this.points.find((point) => point.id === this.activeId) || null;
    },
    get indexLabel() {
      const list = this.visiblePoints;
      const position = list.findIndex((point) => point.id === this.activeId) + 1;
      const pad = (value) => String(value).padStart(2, "0");
      return list.length ? `${pad(position)} / ${pad(list.length)}` : "—";
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
    // Select and pan (used by the list, arrows and keyboard).
    focus(id) {
      this.select(id);
      const point = this.activePoint;
      if (point) this.focusTarget = [point.lat, point.lng];
      this.focusToken += 1;
    },
    move(step) {
      const list = this.visiblePoints;
      if (!list.length) return;
      const index = list.findIndex((point) => point.id === this.activeId);
      this.focus(list[(index + step + list.length) % list.length].id);
    },
    setCategory(category) {
      this.activeCategory = category;
      if (!this.visiblePoints.some((point) => point.id === this.activeId)) {
        const first = this.visiblePoints[0];
        if (first) this.select(first.id);
      }
    },
    openSubmit() {
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
    // Builder mode (local): persist the pin to data/points.json via the dev
    // writer, then drop it onto the map live. Webflow/endpoint modes let the
    // form POST natively instead.
    async submit(event) {
      if (transport().type !== "local") return;
      event.preventDefault();
      const form = event.target;
      const data = new FormData(form);
      try {
        const { point } = await createPin(formToEntry(data));
        this.points = [...this.points, shapeJsonPoint(point, this.points.length)];
        rebuildMarkers();
        this.focus(point.id);
        form.reset();
        this.placement = { lat: null, lng: null };
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
