import * as fs from "node:fs";
import * as path from "node:path";
import { SCRIPT_NAME } from "../ef-utils/paths.js";
import { getSessionStorageDir, loadSessionData, type TestSessionMetadata } from "../ef-utils/session-storage.js";
import { extractLogPrefix } from "../ef-utils/error-processing.js";
import { extractHotspots } from "../ef-utils/profile.js";

export async function infoTest(sessionId: string, testName: string, json: boolean = false, logs: boolean = false, profile: boolean = false, grep?: string, level?: string): Promise<void> {
  const data = loadSessionData(sessionId);
  if (!data) {
    console.error(`Session ${sessionId} not found`);
    console.error(`List available sessions: ${SCRIPT_NAME} info list`);
    process.exit(1);
  }
  
  // Parse test name - support formats:
  // - "scenario name" (just scenario)
  // - "SandboxName scenario name" (sandbox + scenario)
  // - "SandboxName:scenario name" (sandbox:scenario)
  let sandboxFilter: string | undefined;
  let scenarioName = testName;
  
  // Check for "SandboxName:" format
  const colonIndex = testName.indexOf(":");
  if (colonIndex > 0) {
    sandboxFilter = testName.substring(0, colonIndex).trim();
    scenarioName = testName.substring(colonIndex + 1).trim();
  } else {
    // Check for "SandboxName scenario name" format (sandbox name is typically CamelCase, scenario is lowercase/words)
    // Try to detect if first word looks like a sandbox name (CamelCase) followed by scenario
    const words = testName.split(/\s+/);
    if (words.length > 1) {
      const firstWord = words[0];
      // If first word is CamelCase (starts with capital, has another capital), it might be a sandbox name
      if (firstWord.length > 0 && firstWord[0] === firstWord[0].toUpperCase() && 
          firstWord.length > 1 && /[A-Z]/.test(firstWord.substring(1))) {
        // Check if this matches any known sandbox names from the session
        // For now, we'll try both interpretations and see which matches
        // The user can be more specific if needed
      }
    }
  }
  
  // If session is for a single sandbox, use that as filter
  if (!sandboxFilter && data.metadata.sandboxName !== "all") {
    sandboxFilter = data.metadata.sandboxName;
  }
  
  // Find matching tests
  let matchingTests = data.tests.filter(t => {
    const nameMatch = t.name === scenarioName || t.name.toLowerCase().includes(scenarioName.toLowerCase());
    // If we have a sandbox filter, we can't filter by sandbox since ScenarioResult doesn't include it
    // So we'll just match by scenario name and let the user know if there are multiple matches
    return nameMatch;
  });
  
  // If no exact match, try matching the full testName as-is (for backward compatibility)
  if (matchingTests.length === 0) {
    matchingTests = data.tests.filter(t => 
      t.name === testName || t.name.toLowerCase().includes(testName.toLowerCase())
    );
  }
  
  if (matchingTests.length === 0) {
    console.error(`Test "${testName}" not found`);
    console.error(`\nTest name formats:`);
    console.error(`  - Scenario name only: "${scenarioName}"`);
    console.error(`  - With sandbox prefix: "SandboxName:${scenarioName}"`);
    console.error(`\nAvailable tests (showing first 20):`);
    const testNames = data.tests.map(t => t.name).slice(0, 20);
    for (const name of testNames) {
      console.error(`  - ${name}`);
    }
    if (data.tests.length > 20) {
      console.error(`  ... and ${data.tests.length - 20} more`);
    }
    console.error(`\n💡 Tips:`);
    console.error(`  - Use just the scenario name (e.g., "${testNames[0] || "scenario name"}")`);
    console.error(`  - Or use sandbox prefix format: "SandboxName:${scenarioName}"`);
    console.error(`  - Search for tests: ${SCRIPT_NAME} info search "<query>" --session ${sessionId}`);
    process.exit(1);
  }
  
  if (matchingTests.length > 1) {
    console.error(`Multiple tests found matching "${testName}":`);
    for (const test of matchingTests) {
      console.error(`  - ${test.name} (${test.status})`);
    }
    console.error(`\n💡 Tips:`);
    console.error(`  - Be more specific with the scenario name`);
    console.error(`  - Use sandbox prefix format: "SandboxName:${scenarioName}" (if you know the sandbox)`);
    console.error(`  - Search for tests: ${SCRIPT_NAME} info search "<query>" --session ${sessionId}`);
    process.exit(1);
  }
  
  const test = matchingTests[0];
  
  if (json) {
    const testData: any = { ...test };
    if (profile && data.profiles.has(test.name)) {
      testData.profile = data.profiles.get(test.name);
    }
    if (logs) {
      let testLogs = data.logs.filter(l => l.testName === test.name);
      if (level) {
        testLogs = testLogs.filter(l => l.type === level);
      }
      if (grep) {
        const grepLower = grep.toLowerCase();
        testLogs = testLogs.filter(l => l.text.toLowerCase().includes(grepLower));
      }
      testData.logs = testLogs;
    }
    console.log(JSON.stringify(testData, null, 2));
    return;
  }
  
  console.log(`\nTest: "${test.name}"`);
  console.log(`Status: ${test.status.toUpperCase()}`);
  console.log(`Duration: ${test.durationMs}ms\n`);
  
  if (logs) {
    let testLogs = data.logs.filter(l => l.testName === test.name);
    
    // Apply filters
    if (level) {
      testLogs = testLogs.filter(l => l.type === level);
    }
    if (grep) {
      const grepLower = grep.toLowerCase();
      testLogs = testLogs.filter(l => l.text.toLowerCase().includes(grepLower));
    }
    
    if (testLogs.length === 0) {
      console.log(`No logs found${level ? ` (filtered by level: ${level})` : ""}${grep ? ` (filtered by grep: "${grep}")` : ""}`);
    } else {
      console.log(`Logs (${testLogs.length} entries${level ? `, level: ${level}` : ""}${grep ? `, grep: "${grep}"` : ""}):`);
      for (const log of testLogs) {
        const timestamp = new Date(log.timestamp).toISOString().split("T")[1].slice(0, -1);
        const levelIcon = log.type === "error" ? "✗" : log.type === "warning" ? "⚠" : log.type === "info" ? "ℹ" : "•";
        console.log(`  [${timestamp}] ${levelIcon} [${log.type}] ${log.text}`);
      }
    }
  }
  
  if (profile && data.profiles.has(test.name)) {
    const profileData = data.profiles.get(test.name)!;
    const hotspots = extractHotspots(profileData, 5);
    if (hotspots.length > 0) {
      console.log(`\nPerformance Profile:`);
      console.log(`  Top 5 hotspots:`);
      for (let i = 0; i < hotspots.length; i++) {
        const h = hotspots[i];
        const fileName = h.url.split("/").pop() || h.url;
        console.log(`  ${i + 1}. ${h.selfTime.toFixed(2)}ms - ${h.functionName} @ ${fileName}:${h.line + 1}`);
      }
    }
  }
  
  if (test.error) {
    console.log(`\nError: ${test.error.message}`);
    if (test.error.stack) {
      const lines = test.error.stack.split("\n").slice(0, 5);
      for (const line of lines) {
        console.log(`  ${line}`);
      }
    }
  }
  
  if (!logs && !profile) {
    console.log(`\n💡 View logs:`);
    console.log(`  ${SCRIPT_NAME} info test "${test.name}" --logs --session ${sessionId}`);
    console.log(`  ${SCRIPT_NAME} info test "${test.name}" --logs --grep "pattern" --session ${sessionId}`);
    console.log(`  ${SCRIPT_NAME} info test "${test.name}" --logs --level error --session ${sessionId}`);
    if (data.profiles.has(test.name)) {
      console.log(`  ${SCRIPT_NAME} info test "${test.name}" --profile --session ${sessionId}`);
    }
  }
}


