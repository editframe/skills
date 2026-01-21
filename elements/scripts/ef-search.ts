import { discoverSandboxes, loadSandbox } from "../sandbox-server/discover.js";
import type { Sandbox } from "../packages/elements/src/sandbox/index.js";
import { findElementsRoot } from "./ef-utils/paths.js";

export async function searchSandboxes(query: string, json: boolean = false): Promise<void> {
  const elementsRoot = findElementsRoot();
  const sandboxes = discoverSandboxes(elementsRoot);
  
  // Split query into keywords
  const keywords = query.toLowerCase().split(/\s+/).filter(k => k.length > 0);
  
  if (keywords.length === 0) {
    console.error("\n❌ Please provide a search query\n");
    process.exit(1);
  }
  
  // Score each sandbox by keyword matches
  interface SearchResult {
    sandbox: typeof sandboxes[0];
    score: number;
    matches: string[];
  }
  
  const results: SearchResult[] = [];
  
  for (const sandbox of sandboxes) {
    // Build searchable text from sandbox metadata
    const searchFields = [
      sandbox.elementName,
      sandbox.category || "",
      sandbox.subcategory || "",
    ];
    
    // Try to load description from sandbox file
    try {
      const config = await loadSandbox(sandbox.filePath) as Sandbox;
      if (config.description) {
        searchFields.push(config.description);
      }
    } catch {
      // Ignore load errors, just search without description
    }
    
    const searchText = searchFields.join(" ").toLowerCase();
    const matches: string[] = [];
    let score = 0;
    
    for (const keyword of keywords) {
      if (searchText.includes(keyword)) {
        score++;
        // Track which field matched
        if (sandbox.elementName.toLowerCase().includes(keyword)) {
          matches.push(`name: "${keyword}"`);
        } else if (sandbox.category?.toLowerCase().includes(keyword)) {
          matches.push(`category: "${keyword}"`);
        } else if (sandbox.subcategory?.toLowerCase().includes(keyword)) {
          matches.push(`subcategory: "${keyword}"`);
        } else {
          matches.push(`description: "${keyword}"`);
        }
      }
    }
    
    if (score > 0) {
      results.push({ sandbox, score, matches });
    }
  }
  
  // Sort by score (highest first), then by name
  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.sandbox.elementName.localeCompare(b.sandbox.elementName);
  });
  
  if (results.length === 0) {
    console.log(`\n🔍 No sandboxes found matching "${query}"\n`);
    return;
  }
  
  if (json) {
    const output = results.map(r => ({
      name: r.sandbox.elementName,
      category: r.sandbox.category,
      subcategory: r.sandbox.subcategory,
      elementTag: r.sandbox.elementTag,
      score: r.score,
      matches: r.matches,
    }));
    console.log(JSON.stringify(output, null, 2));
    return;
  }
  
  console.log(`\n🔍 Search results for "${query}" (${results.length} found):\n`);
  
  for (const result of results) {
    const { sandbox } = result;
    const categoryPath = sandbox.subcategory 
      ? `${sandbox.category}/${sandbox.subcategory}`
      : sandbox.category || "uncategorized";
    
    console.log(`  ${sandbox.elementName} (${categoryPath})`);
    if (sandbox.elementTag) {
      console.log(`    <${sandbox.elementTag}>`);
    }
    
    // Try to show description
    try {
      const config = await loadSandbox(sandbox.filePath) as Sandbox;
      if (config.description) {
        console.log(`    ${config.description}`);
      }
    } catch {
      // Ignore
    }
    console.log();
  }
}
