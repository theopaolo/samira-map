// Leaflet glue. The map stays imperative, but it is *driven* by the store
// through a handful of Alpine effects, so there is one source of truth.
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MAP } from "./config.js";
import { patchPin } from "./pins-api.js";

let map;
let store;
const markers = new Map();
let placeMarker = null;

const reduceMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const round = (value) => Math.round(value * 1e5) / 1e5;

function markerIcon(point, active) {
  const inner = point.icon
    ? `<i class="category-icon" style="--icon:url('${point.icon}')"></i>`
    : point.glyph;
  return L.divIcon({
    className: `atlas-marker marker-${point.slug}${active ? " is-active" : ""}`,
    html: `<span aria-hidden="true">${inner}</span>`,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    tooltipAnchor: [0, -22],
  });
}

function placementIcon() {
  return L.divIcon({
    className: "place-marker",
    html: '<span aria-hidden="true">+</span>',
    iconSize: [44, 52],
    iconAnchor: [22, 50],
  });
}

function buildMarkers() {
  markers.forEach((marker) => marker.remove());
  markers.clear();

  store.points.forEach((point) => {
    const marker = L.marker([point.lat, point.lng], {
      icon: markerIcon(point, point.id === store.activeId),
      title: point.title,
      riseOnHover: true,
      keyboard: true,
      draggable: store.admin,
    });
    marker.bindTooltip(point.title, { className: "atlas-tooltip", direction: "top", offset: [0, -8] });
    marker.on("click", () => store.select(point.id));
    if (store.admin) marker.on("dragend", () => onAdminDrag(point, marker));
    marker.addTo(map);
    markers.set(point.id, marker);
  });
}

function fitVisible() {
  const coords = store.visiblePoints.map((point) => [point.lat, point.lng]);
  if (coords.length) map.fitBounds(coords, { padding: [72, 72], maxZoom: 15 });
}

function setPlacement(latlng) {
  store.setPlacement(latlng.lat, latlng.lng);
  if (!placeMarker) {
    placeMarker = L.marker(latlng, { icon: placementIcon(), draggable: true, zIndexOffset: 1000 });
    placeMarker.on("dragend", () => setPlacement(placeMarker.getLatLng()));
    placeMarker.addTo(map);
  } else {
    placeMarker.setLatLng(latlng);
  }
}

function togglePlacing(on) {
  map.getContainer().classList.toggle("is-placing", on);
  if (on && store.hasPlacement && !placeMarker) {
    setPlacement(L.latLng(store.placement.lat, store.placement.lng));
  } else if (!on && placeMarker) {
    placeMarker.remove();
    placeMarker = null;
  }
}

async function onAdminDrag(point, marker) {
  const { lat, lng } = marker.getLatLng();
  point.lat = round(lat);
  point.lng = round(lng);
  try {
    await patchPin(point.id, { "gps-coordinates": { latitude: point.lat, longitude: point.lng } });
    showToast(`Saved ${point.title} → ${point.lat}, ${point.lng}`);
  } catch (error) {
    showToast(`Could not save: ${error.message}`);
  }
}

function showToast(message) {
  let toast = document.querySelector("#atlas-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "atlas-toast";
    toast.className = "atlas-toast";
    document.body.append(toast);
  }
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("is-visible"), 4000);
}

// Re-derive the whole map from the store whenever the relevant state changes.
function registerEffects() {
  const { effect } = window.Alpine;

  effect(() => {
    const visibleIds = new Set(store.visiblePoints.map((point) => point.id));
    markers.forEach((marker, id) => (visibleIds.has(id) ? marker.addTo(map) : marker.remove()));
    fitVisible();
  });

  effect(() => {
    const activeId = store.activeId;
    store.points.forEach((point) => {
      markers.get(point.id)?.setIcon(markerIcon(point, point.id === activeId));
    });
  });

  effect(() => togglePlacing(store.placing));
}

export function initMap(storeRef) {
  store = storeRef;
  map = L.map("map", {
    center: MAP.center,
    zoom: MAP.zoom,
    minZoom: MAP.minZoom,
    maxZoom: MAP.maxZoom,
    zoomControl: false,
  });
  L.tileLayer(MAP.tiles.url, {
    maxZoom: MAP.maxZoom,
    subdomains: MAP.tiles.subdomains,
    attribution: MAP.tiles.attribution,
  }).addTo(map);
  L.control.zoom({ position: "bottomright" }).addTo(map);
  map.on("click", (event) => store.placing && setPlacement(event.latlng));

  buildMarkers();
  registerEffects();
  map.whenReady(() => document.querySelector("#map-progress")?.classList.add("is-hidden"));
  window.addEventListener("resize", () => map.invalidateSize());
}

export function flyToPoint(point) {
  map.flyTo([point.lat, point.lng], Math.max(map.getZoom(), 15), {
    duration: reduceMotion() ? 0 : 0.7,
  });
}

// Rebuild all markers after the point set changes (e.g. a pin was just saved).
export function rebuildMarkers() {
  buildMarkers();
}
