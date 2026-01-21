import { buildSandboxGraph } from "../sandbox-server/discover.js";
import { findElementsRoot } from "./ef-utils/paths.js";

export async function showRelated(sandboxName?: string): Promise<void> {
  const elementsRoot = findElementsRoot();
  const { sandboxes, relationships } = buildSandboxGraph(elementsRoot);
  
  if (!sandboxName) {
    // Show all relationships
    console.log("\n📊 Sandbox Relationships:\n");
    
    for (const sandbox of sandboxes) {
      const rel = relationships[sandbox.elementName];
      if (!rel) continue;
      
      const hasRelations = rel.uses.length > 0 || rel.usedBy.length > 0;
      if (!hasRelations) continue;
      
      console.log(`${sandbox.elementName}`);
      if (rel.elementTag) {
        console.log(`  tag: ${rel.elementTag}`);
      }
      if (rel.uses.length > 0) {
        console.log(`  uses: ${rel.uses.join(", ")}`);
      }
      if (rel.usedBy.length > 0) {
        console.log(`  used by: ${rel.usedBy.join(", ")}`);
      }
      console.log();
    }
    return;
  }
  
  // Show specific sandbox relationships
  const rel = relationships[sandboxName];
  if (!rel) {
    console.error(`\n❌ Sandbox "${sandboxName}" not found\n`);
    console.log("Available sandboxes:");
    for (const sandbox of sandboxes) {
      console.log(`  • ${sandbox.elementName}`);
    }
    process.exit(1);
  }
  
  console.log(`\n${sandboxName}`);
  if (rel.elementTag) {
    console.log(`  tag: ${rel.elementTag}`);
  }
  console.log();
  
  if (rel.uses.length > 0) {
    console.log("Uses:");
    for (const name of rel.uses) {
      console.log(`  • ${name}`);
    }
  } else {
    console.log("Uses: (none)");
  }
  console.log();
  
  if (rel.usedBy.length > 0) {
    console.log("Used by:");
    for (const name of rel.usedBy) {
      console.log(`  • ${name}`);
    }
  } else {
    console.log("Used by: (none)");
  }
  console.log();
}
