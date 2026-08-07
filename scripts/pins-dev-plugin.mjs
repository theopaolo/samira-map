// Dev-only bridge: the admin authoring UI POSTs pins here and this middleware
// writes them straight into data/points.json — the same file Vite bundles into
// the production build. So "add a pin locally, then build for Webflow" is just:
//   npm run dev  → add/move/delete pins on the map
//   npm run build → data/points.json is baked into dist/
// It only runs under `vite` (serve); there is no such endpoint in the build.
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const DATA_FILE = fileURLToPath(new URL("../data/points.json", import.meta.url));

// Titles arrive as an { en, mt } pair (a plain string only for pins written by
// hand before the field was translated). Either language is fine for the slug.
const titleText = (title) =>
  typeof title === "string" ? title : title?.en || title?.mt || "";

const slugify = (value = "") =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "map-entry";

async function readPoints() {
  try {
    return JSON.parse(await readFile(DATA_FILE, "utf8"));
  } catch {
    return [];
  }
}

const writePoints = (points) =>
  writeFile(DATA_FILE, JSON.stringify(points, null, 2) + "\n", "utf8");

function uniqueId(base, taken) {
  let id = base;
  for (let n = 2; taken.has(id); n += 1) id = `${base}-${n}`;
  return id;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1e6) req.destroy(); // guard against runaway payloads
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

const send = (res, status, payload) => {
  res.statusCode = status;
  res.end(JSON.stringify(payload));
};

export function pinsDevPlugin() {
  return {
    name: "mal-bajja-pins-writer",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/__pins", async (req, res) => {
        res.setHeader("content-type", "application/json");
        try {
          const points = await readPoints();

          if (req.method === "POST") {
            const entry = await readBody(req);
            const title = titleText(entry.title);
            if (!title) return send(res, 400, { error: "A title is required." });
            const id = uniqueId(entry.id || slugify(title), new Set(points.map((p) => p.id)));
            entry.id = id;
            // No default `url`: a pin links out only once someone writes a real
            // href into data/points.json (see shapeUrl() in js/points.js).
            points.push(entry);
            await writePoints(points);
            return send(res, 200, { point: entry, count: points.length });
          }

          if (req.method === "PUT") {
            const patch = await readBody(req);
            const index = points.findIndex((point) => point.id === patch.id);
            if (index === -1) return send(res, 404, { error: `Unknown pin: ${patch.id}` });
            points[index] = { ...points[index], ...patch };
            await writePoints(points);
            return send(res, 200, { point: points[index], count: points.length });
          }

          if (req.method === "DELETE") {
            const { id } = await readBody(req);
            const next = points.filter((point) => point.id !== id);
            await writePoints(next);
            return send(res, 200, { count: next.length });
          }

          send(res, 405, { error: "Method not allowed." });
        } catch (error) {
          send(res, 500, { error: String(error?.message || error) });
        }
      });
    },
  };
}
