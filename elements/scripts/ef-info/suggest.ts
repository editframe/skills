import * as fs from "node:fs";
import * as path from "node:path";
import { SCRIPT_NAME } from "../ef-utils/paths.js";
import { getSessionStorageDir, loadSessionData, type TestSessionMetadata } from "../ef-utils/session-storage.js";
import { extractLogPrefix } from "../ef-utils/error-processing.js";
import { extractHotspots } from "../ef-utils/profile.js";

export async function infoSuggest(sessionId: string, json: boolean = false): Promise<void> {
  const data = loadSessionData(sessionId);
  if (!data) {
    console.error(`Session ${sessionId} not found`);
    console.error(`List available sessions: ${SCRIPT_NAME} info list`);
    process.exit(1);
  }
  
  const suggestions: string[] = [];
  const nextQueries: string[] = [];
  
  // Analyze test results
  if (data.metadata.failedTests > 0) {
    suggestions.push(`${data.metadata.failedTests} test(s) failed - investigate failures`);
    nextQueries.push(`${SCRIPT_NAME} info tests --failed --session ${sessionId}`);
  } else {
    suggestions.push("All tests passed ✓");
  }
  
  // Analyze errors
  const unexpectedErrors = Array.from(data.errors.values()).filter(e => !e.expected);
  if (unexpectedErrors.length > 0) {
    suggestions.push(`${unexpectedErrors.length} unexpected error type(s) detected - review errors`);
    nextQueries.push(`${SCRIPT_NAME} info errors --unexpected --session ${sessionId}`);
  } else {
    const totalErrors = Array.from(data.errors.values()).reduce((sum, e) => sum + e.count, 0);
    if (totalErrors > 0) {
      suggestions.push(`${totalErrors} expected errors logged - investigate root causes: handle missing resources gracefully instead of throwing errors, avoid starting work that can't complete`);
      nextQueries.push(`${SCRIPT_NAME} info errors --session ${sessionId}`);
    }
  }
  
  // Analyze performance
  if (data.tests.length > 0) {
    const avgDuration = data.tests.reduce((sum, t) => sum + t.durationMs, 0) / data.tests.length;
    const slowTests = data.tests.filter(t => t.durationMs > avgDuration * 1.5);
    if (slowTests.length > 0) {
      suggestions.push(`${slowTests.length} test(s) significantly slower than average (>${(avgDuration * 1.5).toFixed(0)}ms) - review performance`);
      nextQueries.push(`${SCRIPT_NAME} info tests --slow --threshold ${Math.round(avgDuration * 1.5)}ms --session ${sessionId}`);
    }
    
    const slowest = data.tests.reduce((slowest, t) => t.durationMs > slowest.durationMs ? t : slowest, data.tests[0]);
    if (slowest.durationMs > 2000) {
      suggestions.push(`Slowest test: "${slowest.name}" (${slowest.durationMs}ms) - consider optimization`);
      nextQueries.push(`${SCRIPT_NAME} info test "${slowest.name}" --profile --session ${sessionId}`);
    }
  }
  
  // Check for patterns
  const errorTypes = Array.from(data.errors.values());
  if (errorTypes.length > 0) {
    const mostCommon = errorTypes.sort((a, b) => b.count - a.count)[0];
    if (mostCommon.count > 10) {
      suggestions.push(`Most common error: ${mostCommon.type} (${mostCommon.count} occurrences) - investigate root cause`);
      nextQueries.push(`${SCRIPT_NAME} info errors ${mostCommon.type} --session ${sessionId}`);
    }
  }
  
  if (suggestions.length === 0) {
    suggestions.push("No issues detected - test run looks healthy");
  }
  
  if (json) {
    console.log(JSON.stringify({
      suggestions,
      nextQueries,
      sessionId: data.metadata.sessionId,
      status: data.metadata.status,
    }, null, 2));
    return;
  }
  
  console.log(`\n💡 Suggestions for session ${sessionId}:\n`);
  for (let i = 0; i < suggestions.length; i++) {
    console.log(`  ${i + 1}. ${suggestions[i]}`);
  }
  
  if (nextQueries.length > 0) {
    console.log(`\n💡 Suggested next queries:\n`);
    for (const query of nextQueries) {
      console.log(`  ${query}`);
    }
  }
}

function resolveSessionId(sessionIdOrAlias: string, sandboxName?: string): string | null {
  // Handle special aliases
  if (sessionIdOrAlias === "last" || sessionIdOrAlias === "latest") {
    // Get sessions synchronously for this helper
    const sessionDir = getSessionStorageDir();
    if (!fs.existsSync(sessionDir)) {
      return null;
    }
    
    const entries = fs.readdirSync(sessionDir).filter(entry => {
      const entryPath = path.join(sessionDir, entry);
      return fs.statSync(entryPath).isDirectory();
    });
    
    const sessionsWithMetadata: Array<{id: string; metadata: TestSessionMetadata}> = [];
    for (const id of entries) {
      const data = loadSessionData(id);
      if (data && (!sandboxName || data.metadata.sandboxName.toLowerCase().includes(sandboxName.toLowerCase()))) {
        sessionsWithMetadata.push({ id, metadata: data.metadata });
      }
    }
    
    sessionsWithMetadata.sort((a, b) => b.metadata.startTime - a.metadata.startTime);
    return sessionsWithMetadata.length > 0 ? sessionsWithMetadata[0].id : null;
  }
  
  if (sessionIdOrAlias === "previous" || sessionIdOrAlias === "prev") {
    // Get sessions synchronously for this helper
    const sessionDir = getSessionStorageDir();
    if (!fs.existsSync(sessionDir)) {
      return null;
    }
    
    const entries = fs.readdirSync(sessionDir).filter(entry => {
      const entryPath = path.join(sessionDir, entry);
      return fs.statSync(entryPath).isDirectory();
    });
    
    const sessionsWithMetadata: Array<{id: string; metadata: TestSessionMetadata}> = [];
    for (const id of entries) {
      const data = loadSessionData(id);
      if (data && (!sandboxName || data.metadata.sandboxName.toLowerCase().includes(sandboxName.toLowerCase()))) {
        sessionsWithMetadata.push({ id, metadata: data.metadata });
      }
    }
    
    sessionsWithMetadata.sort((a, b) => b.metadata.startTime - a.metadata.startTime);
    return sessionsWithMetadata.length > 1 ? sessionsWithMetadata[1].id : null;
  }
  
  // Check if it's a valid session ID
  const data = loadSessionData(sessionIdOrAlias);
  if (data) {
    return sessionIdOrAlias;
  }
  
  return null;
}


