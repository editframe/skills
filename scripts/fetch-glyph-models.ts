/**
 * fetch-glyph-models — Search and download low-poly 3D models from Poly Pizza for changelog glyphs
 *
 * Usage: scripts/fetch-glyph-models [--count N] [--out-dir DIR]
 *
 * Options:
 *   --count N       Number of models to fetch (default: 50)
 *   --out-dir DIR   Output directory for .glb files (default: telecine/services/web/public/models/glyphs)
 *
 * Requires POLY_PIZZA_KEY environment variable (API key from https://poly.pizza/settings/api)
 *
 * This script searches for geometric low-poly models, selects the best candidates
 * (low triangle count, CC0/CC-BY license), downloads them, and writes a manifest
 * to glyph-models.json in the output directory.
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import https from "https";
import { pipeline } from "stream";
import { promisify } from "util";
import { createWriteStream, existsSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, "..");

// ─── Config ────────────────────────────────────────────────────────────────────

interface GlyphModel {
  id: string;
  filename: string;
  title: string;
  author: string;
  authorUrl: string;
  license: string;
  triangleCount: number;
  attribution: string;
  polyPizzaUrl: string;
}

// Category mapping based on search query semantic domain
const QUERY_CATEGORIES: Record<string, string> = {
  // Geometric
  "cube": "geometric", "sphere": "geometric", "cone": "geometric", "torus": "geometric", "cylinder": "geometric", "tetrahedron": "geometric", "icosphere": "geometric", "dodecahedron": "geometric", "octahedron": "geometric", "ring": "geometric", "torus knot": "geometric", "prism": "geometric", "icosahedron": "geometric", "polyhedron": "geometric", "low poly abstract": "geometric", "geometric": "geometric", "mathematical": "geometric", "wireframe": "geometric", "lattice": "geometric", "grid": "geometric", "truncated": "geometric", "gear": "geometric", "crystal": "geometric", "pyramid": "geometric",

  // Animals
  "bird": "animal", "sparrow": "animal", "eagle": "animal", "owl": "animal", "falcon": "animal", "hawk": "animal", "horse": "animal", "dog": "animal", "cat": "animal", "lion": "animal", "tiger": "animal", "bear": "animal", "wolf": "animal", "fox": "animal", "rabbit": "animal", "deer": "animal", "elephant": "animal", "monkey": "animal", "cow": "animal", "pig": "animal", "goat": "animal", "snake": "animal", "dragon": "animal", "dinosaur": "animal", "fish": "animal", "shark": "animal", "whale": "animal", "dolphin": "animal", "octopus": "animal", "turtle": "animal", "frog": "animal", "butterfly": "animal", "bee": "animal", "ant": "animal", "spider": "animal",

  // Vehicles
  "car": "vehicle", "truck": "vehicle", "plane": "vehicle", "airplane": "vehicle", "helicopter": "vehicle", "boat": "vehicle", "ship": "vehicle", "rocket": "vehicle", "spaceship": "vehicle", "train": "vehicle", "bicycle": "vehicle", "motorcycle": "vehicle", "submarine": "vehicle", "tank": "vehicle", "jeep": "vehicle", "scooter": "vehicle",

  // Tools & industrial
  "hammer": "tool", "wrench": "tool", "screwdriver": "tool", "piston": "tool", "engine": "tool", "motor": "tool", "generator": "tool", "relay": "tool", "switch": "tool", "circuit": "tool", "cog": "tool", "axle": "tool", "bearing": "tool", "bolt": "tool", "nut": "tool", "screw": "tool", "chain": "tool", "belt": "tool", "pump": "tool", "valve": "tool", "pipe": "tool", "turbine": "tool", "propeller": "tool", "fan": "tool",

  // Architecture & structures
  "tower": "structure", "bridge": "structure", "arch": "structure", "column": "structure", "lighthouse": "structure", "castle": "structure", "house": "structure", "monument": "structure", "building": "structure", "skyscraper": "structure", "temple": "structure", "shrine": "structure", "statue": "structure", "obelisk": "structure", "gate": "structure", "fence": "structure", "wall": "structure", "roof": "structure", "chimney": "structure",

  // Nature & plants
  "tree": "nature", "oak": "nature", "pine": "nature", "maple": "nature", "palm": "nature", "cactus": "nature", "flower": "nature", "rose": "nature", "sunflower": "nature", "leaf": "nature", "fern": "nature", "moss": "nature", "rock": "nature", "stone": "nature", "mountain": "nature", "hill": "nature", "cave": "nature", "waterfall": "nature", "river": "nature", "ocean": "nature", "ice": "nature", "snow": "nature", "cloud": "nature", "rainbow": "nature",

  // Tech & electronics
  "node": "tech", "network": "tech", "grid": "tech", "chip": "tech", "processor": "tech", "server": "tech", "antenna": "tech", "satellite": "tech", "orbit": "tech", "atom": "tech", "molecule": "tech", "pendulum": "tech", "wave": "tech", "light": "tech", "laser": "tech", "mirror": "tech", "lens": "tech", "camera": "tech", "phone": "tech", "computer": "tech", "monitor": "tech", "keyboard": "tech", "mouse": "tech", "router": "tech", "modem": "tech", "cable": "tech", "plug": "tech", "socket": "tech", "battery": "tech", "solar panel": "tech",

  // Household & objects
  "key": "object", "lock": "object", "crown": "object", "ring": "object", "shield": "object", "sword": "object", "book": "object", "lamp": "object", "clock": "object", "watch": "object", "compass": "object", "globe": "object", "map": "object", "chair": "object", "table": "object", "bed": "object", "door": "object", "window": "object", "pot": "object", "pan": "object", "cup": "object", "bottle": "object", "box": "object", "ball": "object", "toy": "object", "game": "object", "card": "object", "gift": "object", "bow": "object", "arrow": "object", "feather": "object", "scroll": "object", "candle": "object", "torch": "object",

  // Food & drink
  "apple": "food", "banana": "food", "orange": "food", "grape": "food", "strawberry": "food", "cherry": "food", "lemon": "food", "melon": "food", "watermelon": "food", "corn": "food", "bread": "food", "cheese": "food", "pizza": "food", "burger": "food", "fries": "food", "hotdog": "food", "ice cream": "food", "cake": "food", "cookie": "food", "chocolate": "food", "coffee": "food", "tea": "food", "wine": "food", "beer": "food", "milk": "food",
};

const TARGET_COUNT = 50; // How many unique models we want in our glyph set
const MAX_TRIS = 2000;   // Prefer models with fewer triangles
const MIN_TRIS = 20;     // Too low might be degenerate

// ─── Helpers ──────────────────────────────────────────────────────────────────

const pipelineAsync = promisify(pipeline);

function httpsGet(url: string, headers: Record<string, string>): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      headers: {
        ...headers,
        host: urlObj.host,
      },
    };
    https.get(url, options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve({ status: res.statusCode || 0, body: data }));
      res.on("error", reject);
    }).on("error", reject);
  });
}

async function downloadFile(url: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      pipelineAsync(res, createWriteStream(destPath))
        .then(() => resolve())
        .catch(reject);
    }).on("error", reject);
  });
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

// ─── Main Logic ───────────────────────────────────────────────────────────────

async function fetchGlyphModels() {
  const apiKey = process.env.POLY_PIZZA_KEY;
  if (!apiKey) {
    console.error("Error: POLY_PIZZA_KEY environment variable not set.");
    console.error("Get an API key from https://poly.pizza/settings/api");
    process.exit(1);
  }

  const outDir = join(ROOT_DIR, "telecine", "services", "web", "public", "models", "glyphs");
  mkdirSync(outDir, { recursive: true });

  const headers = { "X-Auth-Token": apiKey };
  const collected: GlyphModel[] = [];
  const seenIds = new Set<string>();
  const usedTitles = new Set<string>();

  console.error(`Fetching up to ${TARGET_COUNT} glyph models from Poly Pizza...`);

  // Iterate queries, get top results, filter by tri count and license
  for (const query of SEARCH_QUERIES) {
    if (collected.length >= TARGET_COUNT) break;

    console.error(`  Searching: "${query}"`);
    try {
      const { status, body } = await httpsGet(`https://api.poly.pizza/v1/search/${encodeURIComponent(query)}?limit=12&format=glb`, headers);
      if (status !== 200) {
        console.error(`    Search failed: HTTP ${status}`);
        continue;
      }

      const json = JSON.parse(body);
      for (const model of json.results || []) {
        if (collected.length >= TARGET_COUNT) break;
        if (seenIds.has(model.ID)) continue;

        const tris = model.TriangleCount;
        if (tris < MIN_TRIS || tris > MAX_TRIS) continue;

        // Accept CC0 or CC-BY
        const license = model.Licence || "";
        if (!license.includes("CC0") && !license.includes("CC-BY")) continue;

        // Download GLB
        const safeName = slugify(model.Title);
        if (usedTitles.has(safeName)) continue; // avoid duplicates by name
        const filename = `${safeName}.glb`;
        const destPath = join(outDir, filename);

        console.error(`    Downloading: ${model.Title} (${tris} tris, ${license})`);
        try {
          await downloadFile(model.Download, destPath);

          // Build attribution
          let attribution = "";
          if (license.includes("CC-BY")) {
            attribution = `"${model.Title}" by ${model.Creator.Username} (https://poly.pizza/u/${model.Creator.Username}) ${license}`;
          } else {
            attribution = `"${model.Title}" by ${model.Creator.Username} (CC0) via Poly Pizza`;
          }

          const glyph: GlyphModel = {
            id: model.ID,
            filename,
            title: model.Title,
            author: model.Creator.Username,
            authorUrl: `https://poly.pizza/u/${model.Creator.Username}`,
            license,
            triangleCount: tris,
            attribution,
            polyPizzaUrl: `https://poly.pizza/m/${model.ID}`,
          };

          collected.push(glyph);
          seenIds.add(model.ID);
          usedTitles.add(safeName);
          console.error(`      ✓ saved ${filename}`);
        } catch (dlErr) {
          console.error(`      ✗ download failed: ${dlErr}`);
        }
      }

      // Respect rate limits - small delay between queries
      await new Promise((resolve) => setTimeout(resolve, 200));
    } catch (err) {
      console.error(`    Search error: ${err}`);
    }
  }

  if (collected.length < TARGET_COUNT) {
    console.warn(`Only collected ${collected.length} models, ${TARGET_COUNT} requested. Consider more queries or higher tri count.`);
  }

  // Write manifest
  const manifestPath = join(outDir, "glyph-models.json");
  const manifest = {
    generated: new Date().toISOString(),
    total: collected.length,
    models: collected,
  };
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.error(`\n✓ Manifest written: ${manifestPath}`);
  console.error(`✓ Total models: ${collected.length}`);
  collected.forEach((m, i) => console.error(`  ${i + 1}. ${m.filename} — ${m.attribution}`));
}

// ─── Entry ────────────────────────────────────────────────────────────────────

fetchGlyphModels().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
