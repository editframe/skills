import * as fs from "node:fs";
import * as path from "node:path";
import { SCRIPT_NAME } from "../ef-utils/paths.js";
import { getSessionStorageDir, loadSessionData, type TestSessionMetadata } from "../ef-utils/session-storage.js";
import { extractLogPrefix } from "../ef-utils/error-processing.js";
import { extractHotspots } from "../ef-utils/profile.js";

export async function infoSummary(sessionId: string, json: boolean): Promise<void> {
  const data = loadSessionData(sessionId);
  if (!data) {
    const sessionDir = getSessionStorageDir();
    console.error(`Session ${sessionId} not found`);
    if (fs.existsSync(sessionDir)) {
      const entries = fs.readdirSync(sessionDir).filter(entry => {
        const entryPath = path.join(sessionDir, entry);
        return fs.statSync(entryPath).isDirectory();
      });
      if (entries.length > 0) {
        console.error(`\nAvailable sessions:`);
        for (const entry of entries.slice(0, 5)) {
          console.error(`  ${entry}`);
        }
        if (entries.length > 5) {
          console.error(`  ... and ${entries.length - 5} more`);
        }
        console.error(`\nList all sessions: ${SCRIPT_NAME} info list`);
      }
    } else {
      console.error(`\nNo sessions directory found. Run tests with: ${SCRIPT_NAME} run [sandbox-name]`);
    }
    process.exit(1);
  }
  
  if (json) {
    console.log(JSON.stringify({
      sessionId: data.metadata.sessionId,
      sandboxName: data.metadata.sandboxName,
      status: data.metadata.status,
      duration: data.metadata.duration,
      totalTests: data.metadata.totalTests,
      passedTests: data.metadata.passedTests,
      failedTests: data.metadata.failedTests,
      totalErrors: data.metadata.totalErrors,
      totalWarnings: data.metadata.totalWarnings,
      avgDuration: data.tests.length > 0
        ? data.tests.reduce((sum, t) => sum + t.durationMs, 0) / data.tests.length
        : 0,
      slowestTest: data.tests.length > 0
        ? data.tests.reduce((slowest, t) => t.durationMs > slowest.durationMs ? t : slowest, data.tests[0])
        : null,
      fastestTest: data.tests.length > 0
        ? data.tests.reduce((fastest, t) => t.durationMs < fastest.durationMs ? t : fastest, data.tests[0])
        : null,
    }, null, 2));
    return;
  }
  
  console.log(`\nSession: ${data.metadata.sessionId}`);
  console.log(`Sandbox: ${data.metadata.sandboxName}`);
  console.log(`Status: ${data.metadata.status.toUpperCase()}`);
  console.log(`Duration: ${(data.metadata.duration / 1000).toFixed(2)}s\n`);
  
  console.log(`Tests:`);
  console.log(`  Total: ${data.metadata.totalTests}`);
  console.log(`  Passed: ${data.metadata.passedTests}`);
  console.log(`  Failed: ${data.metadata.failedTests}`);
  
  if (data.tests.length > 0) {
    const avgDuration = data.tests.reduce((sum, t) => sum + t.durationMs, 0) / data.tests.length;
    const slowest = data.tests.reduce((slowest, t) => t.durationMs > slowest.durationMs ? t : slowest, data.tests[0]);
    const fastest = data.tests.reduce((fastest, t) => t.durationMs < fastest.durationMs ? t : fastest, data.tests[0]);
    
    console.log(`  Avg Duration: ${avgDuration.toFixed(0)}ms`);
    console.log(`  Slowest: "${slowest.name}" (${slowest.durationMs}ms)`);
    console.log(`  Fastest: "${fastest.name}" (${fastest.durationMs}ms)`);
  }
  
  console.log(`\nLogs:`);
  console.log(`  Browser errors: ${Array.from(data.errors.values()).reduce((sum, e) => sum + e.count, 0)}`);
  console.log(`  Browser warnings: ${Array.from(data.warnings.values()).reduce((sum, w) => sum + w.count, 0)}`);
    console.log(`  Debug logs: ${data.logs.filter(l => l.type === "debug" || l.type === "log").length}`);
    console.log(`  Log prefixes: ${data.logPrefixes.size}`);
}

