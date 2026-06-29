import {
  cpSync,
  mkdirSync,
  rmSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const fromNodeModules = (p) => resolve(root, "node_modules", p);
const toVendor = (p) => resolve(root, "vendor", p);

const version = (pkg) =>
  JSON.parse(readFileSync(fromNodeModules(`${pkg}/package.json`), "utf8"))
    .version;

// [source in node_modules, destination in vendor]
const copies = [
  ["leaflet/dist/leaflet.js", "leaflet/leaflet.js"],
  ["leaflet/dist/leaflet.css", "leaflet/leaflet.css"],
  ["leaflet/dist/images", "leaflet/images"], // referenced by leaflet.css
  ["alpinejs/dist/module.esm.js", "alpinejs/module.esm.js"],
];

rmSync(toVendor("."), { recursive: true, force: true });

for (const [source, destination] of copies) {
  const target = toVendor(destination);
  mkdirSync(dirname(target), { recursive: true });
  cpSync(fromNodeModules(source), target, { recursive: true });
}

const manifest = { leaflet: version("leaflet"), alpinejs: version("alpinejs") };
writeFileSync(
  toVendor("manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
);

const summary = Object.entries(manifest)
  .map(([name, v]) => `${name}@${v}`)
  .join(", ");
console.log(`Vendored ${summary} into vendor/`);
