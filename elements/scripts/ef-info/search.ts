import * as fs from "node:fs";
import * as path from "node:path";
import { SCRIPT_NAME } from "../ef-utils/paths.js";
import { getSessionStorageDir, loadSessionData, type TestSessionMetadata } from "../ef-utils/session-storage.js";
import { extractLogPrefix } from "../ef-utils/error-processing.js";
import { extractHotspots } from "../ef-utils/profile.js";

export async function infoSearch(sessionId: string, query: string, json: boolean = false, testsOnly: boolean = false, errorsOnly: boolean = false): Promise<void> {
  const data = loadSessionData(sessionId);
  if (!data) {
    console.error(`Session ${sessionId} not found`);
    console.error(`List available sessions: ${SCRIPT_NAME} info list`);
    process.exit(1);
  }
  
  const queryLower = query.toLowerCase();
  const results: any = {
    tests: [],
    errors: [],
  };
  
  if (!errorsOnly) {
    results.tests = data.tests.filter(t => t.name.toLowerCase().includes(queryLower));
  }
  
  if (!testsOnly) {
    results.errors = Array.from(data.errors.values()).filter(e =>
      e.type.toLowerCase().includes(queryLower) || e.message.toLowerCase().includes(queryLower)
    );
  }
  
  if (json) {
    console.log(JSON.stringify({
      query,
      tests: results.tests,
      errors: results.errors.map(e => ({
        ...e,
        testNames: Array.from(e.testNames),
      })),
    }, null, 2));
    return;
  }
  
  if (results.tests.length > 0) {
    console.log(`\nFound in ${results.tests.length} tests:`);
    for (const test of results.tests) {
      const icon = test.status === "passed" ? "✓" : "✗";
      console.log(`  ${icon} ${test.name}`);
    }
  }
  
  if (results.errors.length > 0) {
    console.log(`\nFound in ${results.errors.length} errors:`);
    for (const err of results.errors) {
      console.log(`  ${err.type} (${err.count} occurrences)`);
    }
  }
  
  if (results.tests.length === 0 && results.errors.length === 0) {
    console.log(`No results found for "${query}"`);
  }
}


