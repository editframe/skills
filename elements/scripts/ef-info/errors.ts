import * as fs from "node:fs";
import * as path from "node:path";
import { SCRIPT_NAME } from "../ef-utils/paths.js";
import { getSessionStorageDir, loadSessionData, type TestSessionMetadata } from "../ef-utils/session-storage.js";
import { extractLogPrefix } from "../ef-utils/error-processing.js";
import { extractHotspots } from "../ef-utils/profile.js";

export async function infoErrors(sessionId: string, errorType?: string, json: boolean = false, unexpectedOnly: boolean = false): Promise<void> {
  const data = loadSessionData(sessionId);
  if (!data) {
    console.error(`Session ${sessionId} not found`);
    console.error(`List available sessions: ${SCRIPT_NAME} info list`);
    process.exit(1);
  }
  
  let errors = Array.from(data.errors.values());
  
  if (unexpectedOnly) {
    errors = errors.filter(e => !e.expected);
  }
  
  if (errorType) {
    errors = errors.filter(e => e.type.toLowerCase().includes(errorType.toLowerCase()));
    if (errors.length === 0) {
      console.error(`Error type "${errorType}" not found`);
      process.exit(1);
    }
    
    const err = errors[0];
    if (json) {
      console.log(JSON.stringify({
        ...err,
        testNames: Array.from(err.testNames),
      }, null, 2));
      return;
    }
    
    console.log(`\nError: ${err.type}`);
    console.log(`Occurrences: ${err.count}`);
    console.log(`Message: "${err.message}"`);
    console.log(`Expected: ${err.expected ? "Yes (test environment limitation)" : "No"}`);
    console.log(`\nContext:`);
    console.log(`  - Occurs in ${err.testNames.size} different test${err.testNames.size !== 1 ? 's' : ''}`);
    console.log(`  - First seen: ${new Date(err.firstSeen).toISOString()}`);
    console.log(`  - Last seen: ${new Date(err.lastSeen).toISOString()}`);
    
    if (err.stackTrace) {
      console.log(`\nStack Trace (first occurrence):`);
      // Show full stack trace, not just first 5 lines
      const lines = err.stackTrace.split("\n");
      for (const line of lines) {
        console.log(`  ${line}`);
      }
    }
    
    // Show logs around the error time to provide context
    const errorTimeWindow = 5000; // 5 seconds before/after error
    const logsNearError = data.logs
      .filter(log => Math.abs(log.timestamp - err.firstSeen) <= errorTimeWindow)
      .sort((a, b) => a.timestamp - b.timestamp); // Sort chronologically
    
    if (logsNearError.length > 0) {
      console.log(`\nLogs around first occurrence (±${errorTimeWindow/1000}s):`);
      // Show up to 30 log entries around the error (15 before, 15 after)
      const errorIndex = logsNearError.findIndex(log => 
        log.type === 'error' && log.text.includes(err.message.slice(0, 50))
      );
      const startIndex = errorIndex >= 0 ? Math.max(0, errorIndex - 15) : 0;
      const endIndex = errorIndex >= 0 ? Math.min(logsNearError.length, errorIndex + 16) : Math.min(logsNearError.length, 30);
      const relevantLogs = logsNearError.slice(startIndex, endIndex);
      
      for (const log of relevantLogs) {
        const timeStr = new Date(log.timestamp).toISOString();
        const relativeTime = Math.abs((log.timestamp - err.firstSeen) / 1000).toFixed(2);
        const sign = log.timestamp >= err.firstSeen ? '+' : '-';
        const typeIcon = log.type === 'error' ? '✗' : log.type === 'warning' ? '⚠' : '•';
        const isErrorLog = log.type === 'error' && log.text.includes(err.message.slice(0, 50));
        const marker = isErrorLog ? '>>> ' : '    ';
        console.log(`${marker}[${timeStr}] ${sign}${relativeTime}s ${typeIcon} [${log.type}] ${log.text.slice(0, 200)}${log.text.length > 200 ? '...' : ''}`);
      }
      if (logsNearError.length > endIndex - startIndex) {
        console.log(`  ... and ${logsNearError.length - (endIndex - startIndex)} more log entries in this window`);
      }
    }
    
    console.log(`\n💡 Next steps:`);
    if (err.testNames.size > 0) {
      const testNamesArray = Array.from(err.testNames);
      const firstTest = testNamesArray[0];
      console.log(`  ${SCRIPT_NAME} info test "${firstTest}" --logs --session ${sessionId}  # View logs for affected test`);
      if (testNamesArray.length > 1) {
        console.log(`  ${SCRIPT_NAME} info test "${testNamesArray[1]}" --logs --session ${sessionId}  # View logs for another affected test`);
      }
    }
    // Show how to get logs around the error time
    const firstSeenDate = new Date(err.firstSeen).toISOString();
    console.log(`  ${SCRIPT_NAME} info logs --session ${sessionId} --grep "${err.type.slice(0, 30)}"  # Search logs for this error`);
    console.log(`  ${SCRIPT_NAME} info errors ${err.type} --session ${sessionId}  # View full error details again`);
    return;
  }
  
  if (json) {
    console.log(JSON.stringify(errors.map(e => ({
      ...e,
      testNames: Array.from(e.testNames),
    })), null, 2));
    return;
  }
  
  const totalErrors = errors.reduce((sum, e) => sum + e.count, 0);
  console.log(`\nBrowser Errors (${totalErrors} total):\n`);
  
  if (errors.length === 0) {
    console.log("  No errors found");
    return;
  }
  
  // Sort by count descending
  errors.sort((a, b) => b.count - a.count);
  
  // Calculate column widths dynamically based on content
  const maxTypeLength = Math.max(40, ...errors.map(e => e.type.length));
  // Don't truncate in table - show full names for LLM context
  const typeWidth = Math.max(maxTypeLength, 40);
  const countWidth = 5;
  const expectedWidth = 8;
  
  // Build table header
  const headerSeparator = "─".repeat(typeWidth);
  const countSeparator = "─".repeat(countWidth);
  const expectedSeparator = "─".repeat(expectedWidth);
  console.log(`┌─${headerSeparator}─┬─${countSeparator}─┬─${expectedSeparator}─┐`);
  console.log(`│ ${"Error Type".padEnd(typeWidth)} │ ${"Count".padStart(countWidth)} │ ${"Expected".padEnd(expectedWidth)} │`);
  console.log(`├─${headerSeparator}─┼─${countSeparator}─┼─${expectedSeparator}─┤`);
  
  for (const err of errors) {
    // Always show full error type - no truncation for LLM context
    const count = err.count.toString().padStart(countWidth);
    const expected = err.expected ? "✓" : "✗";
    const expectedStr = String(expected).padEnd(expectedWidth);
    console.log(`│ ${err.type.padEnd(typeWidth)} │ ${count} │ ${expectedStr} │`);
  }
  
  const footerSeparator = "─".repeat(typeWidth);
  console.log(`└─${footerSeparator}─┴─${countSeparator}─┴─${expectedSeparator}─┘`);
  
  if (!unexpectedOnly) {
    console.log(`\n💡 Drill down:`);
    console.log(`  ${SCRIPT_NAME} info errors <error-type> --session ${sessionId}`);
    console.log(`  ${SCRIPT_NAME} info errors --unexpected --session ${sessionId}`);
  }
}


