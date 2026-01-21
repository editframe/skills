import * as fs from "node:fs";
import * as path from "node:path";
import { SCRIPT_NAME } from "../ef-utils/paths.js";
import { getSessionStorageDir, loadSessionData, type TestSessionMetadata } from "../ef-utils/session-storage.js";
import { extractLogPrefix } from "../ef-utils/error-processing.js";
import { extractHotspots } from "../ef-utils/profile.js";
import type { BrowserLogEntry } from "../ef-utils/types.js";

export async function infoLogPrefixes(sessionId: string, prefix?: string, json: boolean = false): Promise<void> {
  const data = loadSessionData(sessionId);
  if (!data) {
    console.error(`Session ${sessionId} not found`);
    console.error(`List available sessions: ${SCRIPT_NAME} info list`);
    process.exit(1);
  }
  
  let prefixes = Array.from(data.logPrefixes.values());
  
  if (prefix) {
    prefixes = prefixes.filter(p => p.prefix.toLowerCase().includes(prefix.toLowerCase()));
    if (prefixes.length === 0) {
      console.error(`Log prefix "${prefix}" not found`);
      process.exit(1);
    }
    
    const prefixData = prefixes[0];
    if (json) {
      console.log(JSON.stringify({
        ...prefixData,
        testNames: Array.from(prefixData.testNames),
      }, null, 2));
      return;
    }
    
    console.log(`\nLog Prefix: ${prefixData.prefix}`);
    console.log(`Occurrences: ${prefixData.count}`);
    console.log(`Sample Message: "${prefixData.sampleMessage}"`);
    console.log(`\nContext:`);
    console.log(`  - Occurs in ${prefixData.testNames.size} different test${prefixData.testNames.size !== 1 ? 's' : ''}`);
    console.log(`  - First seen: ${new Date(prefixData.firstSeen).toISOString()}`);
    console.log(`  - Last seen: ${new Date(prefixData.lastSeen).toISOString()}`);
    
    // Show logs with this prefix
    const logsWithPrefix = data.logs
      .filter(log => {
        const logPrefix = extractLogPrefix(log.text);
        return logPrefix === prefixData.prefix;
      })
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(0, 10); // Show first 10 examples
    
    if (logsWithPrefix.length > 0) {
      console.log(`\nExample Logs (showing first ${Math.min(10, logsWithPrefix.length)}):`);
      for (const log of logsWithPrefix) {
        const timestamp = new Date(log.timestamp).toISOString().split("T")[1].slice(0, -1);
        const levelIcon = log.type === "error" ? "✗" : log.type === "warning" ? "⚠" : log.type === "info" ? "ℹ" : "•";
        console.log(`  [${timestamp}] ${levelIcon} [${log.type}] ${log.text}`);
      }
      if (prefixData.count > logsWithPrefix.length) {
        console.log(`  ... and ${prefixData.count - logsWithPrefix.length} more`);
      }
    }
    
    const testNamesArray = Array.from(prefixData.testNames);
    const firstTest = testNamesArray[0];
    console.log(`\n💡 Next steps:`);
    if (firstTest) {
      console.log(`  ${SCRIPT_NAME} info test "${firstTest}" --logs --session ${sessionId}  # View logs for affected test`);
      if (testNamesArray.length > 1) {
        console.log(`  ${SCRIPT_NAME} info test "${testNamesArray[1]}" --logs --session ${sessionId}  # View logs for another affected test`);
      }
    }
    console.log(`  ${SCRIPT_NAME} info logs --session ${sessionId} --grep "[${prefixData.prefix}]"  # Search logs for this prefix`);
    console.log(`  ${SCRIPT_NAME} info logs ${prefixData.prefix} --session ${sessionId}  # View full prefix details again`);
    return;
  }
  
  if (json) {
    console.log(JSON.stringify(prefixes.map(p => ({
      ...p,
      testNames: Array.from(p.testNames),
    })), null, 2));
    return;
  }
  
  const totalPrefixes = prefixes.reduce((sum, p) => sum + p.count, 0);
  console.log(`\nLog Prefixes (${totalPrefixes} total):\n`);
  
  if (prefixes.length === 0) {
    console.log("  No log prefixes found");
    return;
  }
  
  // Sort by count descending
  prefixes.sort((a, b) => b.count - a.count);
  
  // Calculate column widths dynamically based on content
  const maxPrefixLength = Math.max(30, ...prefixes.map(p => p.prefix.length));
  const prefixWidth = Math.max(maxPrefixLength, 30);
  const countWidth = 5;
  
  // Build table header
  const headerSeparator = "─".repeat(prefixWidth);
  const countSeparator = "─".repeat(countWidth);
  console.log(`┌─${headerSeparator}─┬─${countSeparator}─┐`);
  console.log(`│ ${"Log Prefix".padEnd(prefixWidth)} │ ${"Count".padStart(countWidth)} │`);
  console.log(`├─${headerSeparator}─┼─${countSeparator}─┤`);
  
  for (const prefixData of prefixes) {
    const count = prefixData.count.toString().padStart(countWidth);
    console.log(`│ ${prefixData.prefix.padEnd(prefixWidth)} │ ${count} │`);
  }
  
  const footerSeparator = "─".repeat(prefixWidth);
  console.log(`└─${footerSeparator}─┴─${countSeparator}─┘`);
  
  console.log(`\n💡 Drill down:`);
  console.log(`  ${SCRIPT_NAME} info logs <prefix> --session ${sessionId}`);
}

export async function infoLogs(sessionId: string, testName?: string, grep?: string, level?: string, json: boolean = false): Promise<void> {
  const data = loadSessionData(sessionId);
  if (!data) {
    console.error(`Session ${sessionId} not found`);
    console.error(`List available sessions: ${SCRIPT_NAME} info list`);
    process.exit(1);
  }
  
  let logs = data.logs;
  
  // Filter by test name if provided
  if (testName) {
    const matchingTests = data.tests.filter(t => 
      t.name.toLowerCase().includes(testName.toLowerCase())
    );
    if (matchingTests.length === 0) {
      console.error(`No tests found matching "${testName}"`);
      process.exit(1);
    }
    const testNames = new Set(matchingTests.map(t => t.name));
    logs = logs.filter(l => l.testName && testNames.has(l.testName));
  }
  
  // Filter by level
  if (level) {
    logs = logs.filter(l => l.type === level);
  }
  
  // Filter by grep pattern
  if (grep) {
    const grepLower = grep.toLowerCase();
    logs = logs.filter(l => l.text.toLowerCase().includes(grepLower));
  }
  
  if (json) {
    console.log(JSON.stringify(logs, null, 2));
    return;
  }
  
  if (logs.length === 0) {
    console.log(`No logs found${testName ? ` for test "${testName}"` : ""}${level ? ` (level: ${level})` : ""}${grep ? ` (grep: "${grep}")` : ""}`);
    return;
  }
  
  console.log(`\nLogs (${logs.length} entries${testName ? ` for test: ${testName}` : ""}${level ? `, level: ${level}` : ""}${grep ? `, grep: "${grep}"` : ""}):\n`);
  
  // Group by test for better readability
  const logsByTest = new Map<string, BrowserLogEntry[]>();
  for (const log of logs) {
    const key = log.testName || "(global)";
    if (!logsByTest.has(key)) {
      logsByTest.set(key, []);
    }
    logsByTest.get(key)!.push(log);
  }
  
  for (const [test, testLogs] of logsByTest.entries()) {
    console.log(`Test: ${test}`);
    for (const log of testLogs) {
      const timestamp = new Date(log.timestamp).toISOString().split("T")[1].slice(0, -1);
      const levelIcon = log.type === "error" ? "✗" : log.type === "warning" ? "⚠" : log.type === "info" ? "ℹ" : "•";
      console.log(`  [${timestamp}] ${levelIcon} [${log.type}] ${log.text}`);
    }
    console.log();
  }
}
