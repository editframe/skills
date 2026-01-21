import { discoverSandboxes, loadSandbox } from "../sandbox-server/discover.js";
import type { Sandbox } from "../packages/elements/src/sandbox/index.js";
import { findElementsRoot } from "./ef-utils/paths.js";
import { SCRIPT_NAME } from "./ef-utils/paths.js";
import { CATEGORY_DESCRIPTIONS, SUBCATEGORY_DESCRIPTIONS } from "./ef-utils/categories.js";

export async function showCategories(): Promise<void> {
  console.log("\n📂 Categories (Type-First Model):\n");
  
  const categoryOrder = ["elements", "gui", "demos"];
  
  for (const category of categoryOrder) {
    const description = CATEGORY_DESCRIPTIONS[category] || "No description available";
    // Extract just the description part (after the dash)
    const descriptionText = description.includes(" - ") ? description.split(" - ")[1] : description;
    console.log(`  ${category}`);
    console.log(`    ${SCRIPT_NAME} list --category ${category}`);
    console.log(`    ${descriptionText}`);
    
    // Show subcategories
    const subcategories = SUBCATEGORY_DESCRIPTIONS[category];
    if (subcategories) {
      for (const [subcat, subdesc] of Object.entries(subcategories)) {
        console.log(`      ${category}/${subcat} - ${subdesc}`);
      }
    }
    console.log();
  }
  
  console.log(`💡 Use '${SCRIPT_NAME} list --category <category>' to filter by category`);
  console.log(`💡 Use '${SCRIPT_NAME} list --category <category>/<subcategory>' to filter by subcategory`);
  console.log(`💡 Use '${SCRIPT_NAME} list <sandbox-name>' to see scenarios for a specific sandbox\n`);
}

export async function listSandboxes(categoryFilter?: string, sandboxName?: string, json: boolean = false): Promise<void> {
  const elementsRoot = findElementsRoot();
  const sandboxes = discoverSandboxes(elementsRoot);

  // Parse category/subcategory filter (e.g., "gui/timeline" or "elements")
  let filterCategory: string | undefined;
  let filterSubcategory: string | undefined;
  if (categoryFilter) {
    const parts = categoryFilter.split("/");
    filterCategory = parts[0];
    filterSubcategory = parts[1];
  }

  // If specific sandbox requested, show its scenarios
  if (sandboxName) {
    const sandbox = sandboxes.find(s => s.elementName === sandboxName);
    if (!sandbox) {
      console.error(`\n❌ Sandbox "${sandboxName}" not found\n`);
      console.log("Available sandboxes:");
      for (const s of sandboxes) {
        console.log(`  • ${s.elementName}`);
      }
      console.log();
      process.exit(1);
    }

    // Load sandbox config to get scenarios
    try {
      const config = await loadSandbox(sandbox.filePath) as Sandbox;
      const scenarioNames = Object.keys(config.scenarios || {});
      
      if (json) {
        console.log(JSON.stringify({
          sandbox: sandboxName,
          category: sandbox.category,
          subcategory: sandbox.subcategory,
          description: config.description,
          scenarios: scenarioNames,
        }, null, 2));
        return;
      }

      console.log(`\n📦 ${sandboxName}`);
      if (sandbox.category) {
        const categoryPath = sandbox.subcategory 
          ? `${sandbox.category}/${sandbox.subcategory}`
          : sandbox.category;
        console.log(`   Category: ${categoryPath}`);
      }
      if (config.description) {
        console.log(`   ${config.description}`);
      }
      console.log(`\n   Scenarios (${scenarioNames.length}):\n`);
      
      for (const scenarioName of scenarioNames) {
        const scenario = config.scenarios[scenarioName];
        if (typeof scenario === "object" && scenario.description) {
          console.log(`   • ${scenarioName}`);
          console.log(`     ${scenario.description}`);
        } else {
          console.log(`   • ${scenarioName}`);
        }
      }
      console.log();
    } catch (err) {
      console.error(`\n❌ Failed to load sandbox "${sandboxName}":`, err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
    return;
  }

  // Filter sandboxes by category and/or subcategory
  let filteredSandboxes = sandboxes;
  if (filterCategory) {
    filteredSandboxes = sandboxes.filter(s => {
      if (s.category !== filterCategory) return false;
      if (filterSubcategory && s.subcategory !== filterSubcategory) return false;
      return true;
    });
  }

  if (filteredSandboxes.length === 0) {
    if (categoryFilter) {
      console.log(`\n❌ No sandboxes found in category "${categoryFilter}"\n`);
      console.log("Available categories:");
      await showCategories();
    } else {
      console.log("\n  No sandboxes found\n");
    }
    return;
  }

  // Group by category, then by subcategory
  type SandboxByCategorySubcategory = Map<string, Map<string, typeof sandboxes>>;
  const grouped: SandboxByCategorySubcategory = new Map();
  
  for (const sandbox of filteredSandboxes) {
    const category = sandbox.category || "uncategorized";
    const subcategory = sandbox.subcategory || "other";
    
    if (!grouped.has(category)) {
      grouped.set(category, new Map());
    }
    const subcats = grouped.get(category)!;
    if (!subcats.has(subcategory)) {
      subcats.set(subcategory, []);
    }
    subcats.get(subcategory)!.push(sandbox);
  }

  if (json) {
    const output: Record<string, Record<string, Array<{ name: string; elementTag: string | null }>>> = {};
    for (const [category, subcats] of grouped.entries()) {
      output[category] = {};
      for (const [subcategory, subs] of subcats.entries()) {
        output[category][subcategory] = subs.map(s => ({
          name: s.elementName,
          elementTag: s.elementTag,
        }));
      }
    }
    console.log(JSON.stringify(output, null, 2));
    return;
  }

  // Sort categories by priority
  const categoryOrder: Record<string, number> = {
    elements: 1,
    gui: 2,
    demos: 3,
    uncategorized: 999,
  };

  const sortedCategories = Array.from(grouped.entries()).sort((a, b) => {
    const aOrder = categoryOrder[a[0]] || 999;
    const bOrder = categoryOrder[b[0]] || 999;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return a[0].localeCompare(b[0]);
  });

  if (categoryFilter) {
    console.log(`\n📦 Sandboxes in "${categoryFilter}":\n`);
  } else {
    console.log("\n📦 Element Sandboxes by Category:\n");
  }

  for (const [category, subcats] of sortedCategories) {
    const description = CATEGORY_DESCRIPTIONS[category];
    const descriptionText = description 
      ? description.split(" - ")[1] || description
      : "";
    
    console.log(`  ${category}${descriptionText ? ` - ${descriptionText}` : ""}`);
    console.log(`  ${"=".repeat(60)}`);
    
    // Sort subcategories
    const subcatDescs = SUBCATEGORY_DESCRIPTIONS[category] || {};
    const subcatOrder = Object.keys(subcatDescs);
    const sortedSubcats = Array.from(subcats.entries()).sort((a, b) => {
      const aIdx = subcatOrder.indexOf(a[0]);
      const bIdx = subcatOrder.indexOf(b[0]);
      if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
      if (aIdx !== -1) return -1;
      if (bIdx !== -1) return 1;
      return a[0].localeCompare(b[0]);
    });
    
    for (const [subcategory, subs] of sortedSubcats) {
      const subcatDesc = subcatDescs[subcategory] || "";
      console.log(`    ${subcategory} (${subs.length})${subcatDesc ? ` - ${subcatDesc}` : ""}`);
      
      for (const sandbox of subs.sort((a, b) => a.elementName.localeCompare(b.elementName))) {
        console.log(`      • ${sandbox.elementName}`);
        if (sandbox.elementTag) {
          console.log(`        <${sandbox.elementTag}>`);
        }
      }
    }
    console.log();
  }

  if (!categoryFilter) {
    console.log(`💡 Use '${SCRIPT_NAME} list --category <category>' to filter by category`);
    console.log(`💡 Use '${SCRIPT_NAME} list --category <category>/<subcategory>' to filter by subcategory`);
    console.log(`💡 Use '${SCRIPT_NAME} list <sandbox-name>' to see scenarios\n`);
  }
}
