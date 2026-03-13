/**
 * generate-changelog-illustration — Generate an abstract SVG illustration for a release codename
 *
 * Usage:
 *   scripts/generate-changelog-illustration <codename> [output.svg]
 *
 * Outputs raw SVG to stdout (or to file if specified).
 * The SVG is 480×480, dark-background-safe, abstract/geometric.
 *
 * Designed to be embedded in ChangelogIntroCard as the `illustration` prop.
 */

import { writeFileSync } from "node:fs";
import Anthropic from "@anthropic-ai/sdk";

const codename = process.argv[2];
const outputFile = process.argv[3] ?? null;

if (!codename) {
  process.stderr.write("Usage: scripts/generate-changelog-illustration <codename> [output.svg]\n");
  process.exit(1);
}

if (!process.env.ANTHROPIC_API_KEY) {
  process.stderr.write("Error: ANTHROPIC_API_KEY is not set.\n");
  process.exit(1);
}

const anthropic = new Anthropic();

const SYSTEM = `You are a graphic designer creating abstract SVG illustrations for software release notes.

STRICT CONSTRAINTS:
- Output ONLY the raw SVG element. No preamble, no explanation, no markdown fences.
- viewBox="0 0 480 480" — always exactly this
- NO background rect — the host component provides a dark background
- Color palette: ONLY use these exact colors:
    #ffffff (white, for primary shapes — use sparingly)
    #1565c0 (Editframe blue — main accent)
    #0d47a1 (darker blue)
    #4488ff (lighter blue glow)
    rgba(255,255,255,0.08) (very faint white fills)
    rgba(21,101,192,0.2) (faint blue fills)
- Style: Bauhaus / Swiss / geometric abstraction. NOT literal/pictographic.
  The shape language should EVOKE the mood of the codename, not illustrate it.
  Examples of valid abstract evocations:
    "Iron Sparrow" → angular intersecting lines + diagonal geometry
    "Cobalt Meridian" → concentric arcs + vertical axis
    "Frost Kernel" → hexagonal/crystalline fractal grid
    "Echo Chamber" → overlapping concentric rings, varying opacity
- Complexity: 8–20 SVG elements (paths, circles, lines, polygons, rects)
- NO text elements
- NO filters, defs, gradients (pure geometry only)
- Stroke widths: 1–3px, no fills unless rgba with low opacity (< 0.3)
- All shapes should be centered around 240,240
- The composition should breathe — not cluttered`;

async function generateSVG(codename: string): Promise<string> {
  const response = await anthropic.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 2048,
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: `Generate a 480×480 abstract SVG illustration for the release codename: "${codename}"`,
      },
    ],
  });

  const text = response.content[0].type === "text" ? response.content[0].text.trim() : "";

  // Strip any accidental markdown fences
  const cleaned = text
    .replace(/^```(?:svg|xml)?\n?/i, "")
    .replace(/\n?```$/i, "")
    .trim();

  if (!cleaned.startsWith("<svg")) {
    throw new Error(`LLM returned unexpected output:\n${cleaned.slice(0, 200)}`);
  }

  return cleaned;
}

async function main() {
  const svg = await generateSVG(codename);

  if (outputFile) {
    writeFileSync(outputFile, svg);
    process.stderr.write(`SVG written to ${outputFile}\n`);
  } else {
    process.stdout.write(svg + "\n");
  }
}

main().catch((err) => {
  process.stderr.write(`Error: ${err.message}\n`);
  process.exit(1);
});
