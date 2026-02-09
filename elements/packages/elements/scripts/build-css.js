#!/usr/bin/env node

import { mkdirSync, readFileSync, writeFileSync, cpSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import autoprefixer from "autoprefixer";
import postcss from "postcss";
import tailwindcss from "tailwindcss";

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcDir = join(__dirname, "..", "src");
const distDir = join(__dirname, "..", "dist");
const configPath = join(__dirname, "..", "tailwind.config.ts");

// Ensure dist directory exists
mkdirSync(distDir, { recursive: true });
mkdirSync(join(distDir, "gui"), { recursive: true });

// Read source CSS
const cssPath = join(srcDir, "elements.css");
const css = readFileSync(cssPath, "utf-8");

// Process through PostCSS
console.log("Processing CSS through Tailwind and PostCSS...");

postcss([tailwindcss({ config: configPath }), autoprefixer()])
  .process(css, { from: cssPath, to: join(distDir, "style.css") })
  .then((result) => {
    writeFileSync(join(distDir, "style.css"), result.css);
    if (result.map) {
      writeFileSync(join(distDir, "style.css.map"), result.map.toString());
    }
    console.log("✅ CSS processed and written to dist/style.css");
    
    // Copy theme CSS file
    const themeCssPath = join(srcDir, "gui", "ef-theme.css");
    const themeDistPath = join(distDir, "gui", "ef-theme.css");
    cpSync(themeCssPath, themeDistPath);
    console.log("✅ Theme CSS copied to dist/gui/ef-theme.css");
  })
  .catch((error) => {
    console.error("❌ CSS processing failed:", error);
    process.exit(1);
  });
