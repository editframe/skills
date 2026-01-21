import * as fs from "node:fs";
import * as path from "node:path";
import { SCRIPT_NAME } from "../ef-utils/paths.js";
import { getSessionStorageDir, loadSessionData, type TestSessionMetadata } from "../ef-utils/session-storage.js";
import { extractLogPrefix } from "../ef-utils/error-processing.js";
import { extractHotspots } from "../ef-utils/profile.js";

export async function infoHistory(sessionId?: string, limit: number = 10, json: boolean = false): Promise<void> {
  // Get sessions synchronously for history
  const sessionDir = getSessionStorageDir();
  if (!fs.existsSync(sessionDir)) {
    if (json) {
      console.log("[]");
    } else {
      console.log("No test sessions found.");
      console.log(`\nRun tests with: ${SCRIPT_NAME} run [sandbox-name]`);
    }
    return;
  }
  
  const entries = fs.readdirSync(sessionDir).filter(entry => {
    const entryPath = path.join(sessionDir, entry);
    return fs.statSync(entryPath).isDirectory();
  });
  
  if (entries.length === 0) {
    if (json) {
      console.log("[]");
    } else {
      console.log("No test sessions found.");
      console.log(`\nRun tests with: ${SCRIPT_NAME} run [sandbox-name]`);
    }
    return;
  }
  
  // Load metadata for all sessions and sort by start time (newest first)
  const sessionsWithMetadata: Array<{id: string; metadata: TestSessionMetadata}> = [];
  let isSessionIdProvided = false;
  
  // Check if sessionId is actually a valid session ID
  if (sessionId) {
    const testData = loadSessionData(sessionId);
    if (testData) {
      isSessionIdProvided = true;
    }
  }
  
  for (const id of entries) {
    const data = loadSessionData(id);
    if (data) {
      if (!sessionId) {
        // No filter - include all sessions
        sessionsWithMetadata.push({ id, metadata: data.metadata });
      } else if (isSessionIdProvided) {
        // sessionId is a valid session ID - include all sessions (we'll filter by sandbox later)
        sessionsWithMetadata.push({ id, metadata: data.metadata });
      } else {
        // sessionId is a sandbox filter
        if (data.metadata.sandboxName.toLowerCase().includes(sessionId.toLowerCase())) {
          sessionsWithMetadata.push({ id, metadata: data.metadata });
        }
      }
    }
  }
  
  sessionsWithMetadata.sort((a, b) => b.metadata.startTime - a.metadata.startTime);
  const displaySessions = sessionsWithMetadata.slice(0, limit);
  
  if (json) {
    const sessionData = displaySessions.map(({ id, metadata }) => ({
      sessionId: id,
      sandboxName: metadata.sandboxName,
      status: metadata.status,
      duration: metadata.duration,
      totalTests: metadata.totalTests,
      passedTests: metadata.passedTests,
      failedTests: metadata.failedTests,
      startTime: metadata.startTime,
      date: new Date(metadata.startTime).toISOString(),
    }));
    
    console.log(JSON.stringify(sessionData, null, 2));
    return;
  }
  
  // If a specific session ID was provided, show history relative to that
  if (sessionId) {
    const currentData = loadSessionData(sessionId);
    if (!currentData) {
      console.error(`Session ${sessionId} not found`);
      process.exit(1);
    }
    
    // Filter to same sandbox
    const sameSandboxSessions = sessionsWithMetadata.filter(s => 
      s.metadata.sandboxName === currentData.metadata.sandboxName
    );
    
    const currentIndex = sameSandboxSessions.findIndex(s => s.id === sessionId);
    
    if (currentIndex < 0) {
      console.error(`Session ${sessionId} not found in history`);
      process.exit(1);
    }
    
    console.log(`\nTest run history for ${currentData.metadata.sandboxName}:`);
    console.log(`Current session: ${sessionId} (position ${currentIndex + 1} of ${sameSandboxSessions.length})\n`);
    
    const startIdx = Math.max(0, currentIndex - Math.floor(limit / 2));
    const endIdx = Math.min(sameSandboxSessions.length, startIdx + limit);
    const displaySessionsForSandbox = sameSandboxSessions.slice(startIdx, endIdx);
    
    for (let i = 0; i < displaySessionsForSandbox.length; i++) {
      const { id, metadata } = displaySessionsForSandbox[i];
      const isCurrent = id === sessionId;
      const date = new Date(metadata.startTime).toLocaleString();
      const statusIcon = metadata.status === "passed" ? "✓" : "✗";
      const duration = (metadata.duration / 1000).toFixed(1);
      const marker = isCurrent ? "← current" : "";
      console.log(`  ${statusIcon} ${id} ${marker}`);
      console.log(`    ${metadata.passedTests}/${metadata.totalTests} passed | ${duration}s | ${date}`);
    }
    
    if (currentIndex > 0) {
      const previousId = sameSandboxSessions[currentIndex - 1].id;
      console.log(`\n💡 Compare with previous run:`);
      console.log(`  ${SCRIPT_NAME} info compare ${previousId} ${sessionId}`);
    }
    return;
  }
  
  // Show general history
  console.log(`\nRecent test runs (${sessionsWithMetadata.length} total):\n`);
  for (let i = 0; i < displaySessions.length; i++) {
    const { id, metadata } = displaySessions[i];
    const date = new Date(metadata.startTime).toLocaleString();
    const statusIcon = metadata.status === "passed" ? "✓" : "✗";
    const duration = (metadata.duration / 1000).toFixed(1);
    console.log(`  ${i + 1}. ${statusIcon} ${id}`);
    console.log(`     Sandbox: ${metadata.sandboxName} | ${metadata.passedTests}/${metadata.totalTests} passed | ${duration}s | ${date}`);
  }
  if (sessionsWithMetadata.length > limit) {
    console.log(`\n  ... and ${sessionsWithMetadata.length - limit} more`);
  }
  console.log();
}

