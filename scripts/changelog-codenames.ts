/**
 * Changelog release codenames.
 *
 * A curated list of two-word names (Adjective Noun) with a technical/material feel.
 * Names are deliberately not thematic to the release content — they're just memorable handles.
 *
 * Usage:
 *   import { pickCodename } from "./changelog-codenames";
 *   const codename = await pickCodename(); // picks one not yet used in any .mdx
 *
 * Duplicate prevention: scans all existing changelog MDX files for `codename:` frontmatter
 * and skips any already assigned name.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CHANGELOGS_DIR = join(
  __dirname,
  "..",
  "telecine",
  "services",
  "web",
  "app",
  "content",
  "changelogs",
);

export const CODENAMES: readonly string[] = [
  "Amber Relay",
  "Arctic Cipher",
  "Ashen Prism",
  "Azure Drift",
  "Binary Hawk",
  "Carbon Nexus",
  "Cerise Lattice",
  "Chrome Solstice",
  "Cinnabar Signal",
  "Cobalt Meridian",
  "Copper Cascade",
  "Crimson Epoch",
  "Cyan Scaffold",
  "Dark Filament",
  "Delta Forge",
  "Dusk Protocol",
  "Echo Chamber",
  "Ember Transit",
  "Ferrous Drift",
  "Flint Horizon",
  "Frost Kernel",
  "Gilt Lattice",
  "Graphite Surge",
  "Helix Node",
  "Indigo Meridian",
  "Iron Sparrow",
  "Jade Circuit",
  "Lapis Fracture",
  "Malachite Core",
  "Midnight Alloy",
  "Mocha Relay",
  "Nebula Shift",
  "Nickel Vortex",
  "Noir Catalyst",
  "Obsidian Pulse",
  "Ochre Vector",
  "Onyx Cascade",
  "Opal Lattice",
  "Oxide Surge",
  "Pearl Matrix",
  "Pewter Signal",
  "Phase Cobalt",
  "Prism Vector",
  "Quartz Solstice",
  "Radiant Alloy",
  "Ruby Scaffold",
  "Rust Horizon",
  "Sable Filament",
  "Sage Nexus",
  "Sapphire Transit",
  "Scarlet Epoch",
  "Sepia Kernel",
  "Shadow Relay",
  "Sienna Protocol",
  "Silver Meridian",
  "Slate Fracture",
  "Smoke Circuit",
  "Solar Drift",
  "Steel Cipher",
  "Teal Surge",
  "Titanium Echo",
  "Topaz Node",
  "Ultramarine Core",
  "Umber Vortex",
  "Verdant Alloy",
  "Void Catalyst",
  "Walnut Signal",
  "White Filament",
  "Zinc Solstice",
  "Zircon Pulse",
];

/** Returns all codenames already assigned in existing changelog MDX files. */
function getUsedCodenames(): Set<string> {
  const used = new Set<string>();
  try {
    const files = readdirSync(CHANGELOGS_DIR).filter((f) => f.endsWith(".mdx"));
    for (const file of files) {
      const content = readFileSync(join(CHANGELOGS_DIR, file), "utf-8");
      const match = content.match(/^codename:\s*["']?(.+?)["']?\s*$/m);
      if (match?.[1]) {
        used.add(match[1].trim());
      }
    }
  } catch {
    // directory may not exist yet
  }
  return used;
}

/**
 * Picks a random unused codename.
 * Throws if the pool is exhausted (add more names to CODENAMES above).
 */
export function pickCodename(): string {
  const used = getUsedCodenames();
  const available = CODENAMES.filter((n) => !used.has(n));
  if (available.length === 0) {
    throw new Error(
      `All ${CODENAMES.length} codenames have been used. Add more to changelog-codenames.ts.`,
    );
  }
  return available[Math.floor(Math.random() * available.length)];
}

/**
 * Lists all available (unused) codenames.
 */
export function availableCodenames(): string[] {
  const used = getUsedCodenames();
  return CODENAMES.filter((n) => !used.has(n));
}
