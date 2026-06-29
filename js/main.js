// Bootstrap. We import Alpine as a module and start it ourselves so the store
// is guaranteed to be registered before any template renders (no startup race).
import Alpine from "alpinejs";
import { loadPoints } from "./points.js";
import { createStore, transportNote } from "./store.js";
import { initMap, resetView } from "./map.js";

window.Alpine = Alpine;
Alpine.store("atlas", createStore());

// IMPORTANT: Alpine.store() wraps the object in a reactive proxy. We must read
// that proxy back and mutate *it* — mutating the original object would bypass
// reactivity and the templates would never update.
const store = Alpine.store("atlas");
store.admin = new URLSearchParams(location.search).has("admin");
store.modeNote = transportNote();

Alpine.start();

(async () => {
  try {
    const points = await loadPoints();
    if (!points.length) throw new Error("No points were found in the data file.");

    store.setPoints(points);
    const hashId = decodeURIComponent(location.hash.slice(1));
    if (points.some((point) => point.id === hashId)) store.activeId = hashId;

    document.querySelector("#map").setAttribute(
      "aria-label",
      `Map of Birżebbuġa with ${points.length} story points`
    );

    initMap(store);
    document.querySelector("#reset-view").addEventListener("click", resetView);
  } catch (error) {
    console.error(error);
    document.querySelector("#map-progress")?.classList.add("is-hidden");
    const message = document.createElement("p");
    message.className = "load-error";
    message.textContent =
      "The atlas could not load. Start a local web server and check your connection, then refresh the page.";
    document.querySelector("#map").replaceChildren(message);
  }
})();
