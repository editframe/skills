import * as fs from "node:fs";
import * as path from "node:path";
import { SCRIPT_NAME } from "../ef-utils/paths.js";
import { getSessionStorageDir, loadSessionData, type TestSessionMetadata } from "../ef-utils/session-storage.js";
import { extractLogPrefix } from "../ef-utils/error-processing.js";
import { extractHotspots } from "../ef-utils/profile.js";

export async function infoWarnings(sessionId: string, warningType?: string, json: boolean = false): Promise<void> {
  const data = loadSessionData(sessionId);
  if (!data) {
    console.error(`Session ${sessionId} not found`);
    console.error(`List available sessions: ${SCRIPT_NAME} info list`);
    process.exit(1);
  }
  
  let warnings = Array.from(data.warnings.values());
  
  if (warningType) {
    warnings = warnings.filter(w => w.type.toLowerCase().includes(warningType.toLowerCase()));
    if (warnings.length === 0) {
      console.error(`Warning type "${warningType}" not found`);
      process.exit(1);
    }
    
    const warn = warnings[0];
    if (json) {
      console.log(JSON.stringify({
        ...warn,
        testNames: Array.from(warn.testNames),
      }, null, 2));
      return;
    }
    
    console.log(`\nWarning: ${warn.type}`);
    console.log(`Occurrences: ${warn.count}`);
    console.log(`Message: "${warn.message}"`);
    console.log(`\nContext:`);
    console.log(`  - Occurs in ${warn.testNames.size} different test${warn.testNames.size !== 1 ? 's' : ''}`);
    console.log(`  - First seen: ${new Date(warn.firstSeen).toISOString()}`);
    console.log(`  - Last seen: ${new Date(warn.lastSeen).toISOString()}`);
    
    if (warn.stackTrace) {
      console.log(`\nStack Trace (first occurrence):`);
      const lines = warn.stackTrace.split("\n");
      for (const line of lines) {
        console.log(`  ${line}`);
      }
    }
    
    // Show logs around the warning time to provide context
    const warningTimeWindow = 5000; // 5 seconds before/after warning
    const logsNearWarning = data.logs
      .filter(log => Math.abs(log.timestamp - warn.firstSeen) <= warningTimeWindow)
      .sort((a, b) => a.timestamp - b.timestamp);
    
    if (logsNearWarning.length > 0) {
      console.log(`\nLogs around first occurrence (±${warningTimeWindow/1000}s):`);
      const warningIndex = logsNearWarning.findIndex(log => 
        log.type === 'warning' && log.text.includes(warn.message.slice(0, 50))
      );
      const startIndex = warningIndex >= 0 ? Math.max(0, warningIndex - 15) : 0;
      const endIndex = warningIndex >= 0 ? Math.min(logsNearWarning.length, warningIndex + 16) : Math.min(logsNearWarning.length, 30);
      const relevantLogs = logsNearWarning.slice(startIndex, endIndex);
      
      for (const log of relevantLogs) {
        const timeStr = new Date(log.timestamp).toISOString();
        const relativeTime = Math.abs((log.timestamp - warn.firstSeen) / 1000).toFixed(2);
        const sign = log.timestamp >= warn.firstSeen ? '+' : '-';
        const typeIcon = log.type === 'error' ? '✗' : log.type === 'warning' ? '⚠' : '•';
        const isWarningLog = log.type === 'warning' && log.text.includes(warn.message.slice(0, 50));
        const marker = isWarningLog ? '>>> ' : '    ';
        console.log(`${marker}[${timeStr}] ${sign}${relativeTime}s ${typeIcon} [${log.type}] ${log.text.slice(0, 200)}${log.text.length > 200 ? '...' : ''}`);
      }
      if (logsNearWarning.length > endIndex - startIndex) {
        console.log(`  ... and ${logsNearWarning.length - (endIndex - startIndex)} more log entries in this window`);
      }
    }
    
    console.log(`\n💡 Next steps:`);
    if (warn.testNames.size > 0) {
      const testNamesArray = Array.from(warn.testNames);
      const firstTest = testNamesArray[0];
      console.log(`  ${SCRIPT_NAME} info test "${firstTest}" --logs --session ${sessionId}  # View logs for affected test`);
      if (testNamesArray.length > 1) {
        console.log(`  ${SCRIPT_NAME} info test "${testNamesArray[1]}" --logs --session ${sessionId}  # View logs for another affected test`);
      }
    }
    const firstSeenDate = new Date(warn.firstSeen).toISOString();
    console.log(`  ${SCRIPT_NAME} info logs --session ${sessionId} --grep "${warn.type.slice(0, 30)}"  # Search logs for this warning`);
    console.log(`  ${SCRIPT_NAME} info warnings ${warn.type} --session ${sessionId}  # View full warning details again`);
    return;
  }
  
  if (json) {
    console.log(JSON.stringify(warnings.map(w => ({
      ...w,
      testNames: Array.from(w.testNames),
    })), null, 2));
    return;
  }
  
  const totalWarnings = warnings.reduce((sum, w) => sum + w.count, 0);
  console.log(`\nBrowser Warnings (${totalWarnings} total):\n`);
  
  if (warnings.length === 0) {
    console.log("  No warnings found");
    return;
  }
  
  // Sort by count descending
  warnings.sort((a, b) => b.count - a.count);
  
  // Calculate column widths dynamically based on content
  const maxTypeLength = Math.max(40, ...warnings.map(w => w.type.length));
  const typeWidth = Math.max(maxTypeLength, 40);
  const countWidth = 5;
  
  // Build table header
  const headerSeparator = "─".repeat(typeWidth);
  const countSeparator = "─".repeat(countWidth);
  console.log(`┌─${headerSeparator}─┬─${countSeparator}─┐`);
  console.log(`│ ${"Warning Type".padEnd(typeWidth)} │ ${"Count".padStart(countWidth)} │`);
  console.log(`├─${headerSeparator}─┼─${countSeparator}─┤`);
  
  for (const warn of warnings) {
    const count = warn.count.toString().padStart(countWidth);
    console.log(`│ ${warn.type.padEnd(typeWidth)} │ ${count} │`);
  }
  
  const footerSeparator = "─".repeat(typeWidth);
  console.log(`└─${footerSeparator}─┴─${countSeparator}─┘`);
  
  console.log(`\n💡 Drill down:`);
  console.log(`  ${SCRIPT_NAME} info warnings <warning-type> --session ${sessionId}`);
}


