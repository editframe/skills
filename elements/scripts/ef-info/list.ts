import * as fs from "node:fs";
import * as path from "node:path";
import { SCRIPT_NAME } from "../ef-utils/paths.js";
import { getSessionStorageDir, loadSessionData, type TestSessionMetadata } from "../ef-utils/session-storage.js";

export async function listSessions(limit?: number, sandboxFilter?: string): Promise<string[]> {
  const sessionDir = getSessionStorageDir();
  if (!fs.existsSync(sessionDir)) {
    console.log("No test sessions found.");
    console.log(`\nRun tests with: ${SCRIPT_NAME} run [sandbox-name]`);
    return [];
  }
  
  const entries = fs.readdirSync(sessionDir).filter(entry => {
    const entryPath = path.join(sessionDir, entry);
    return fs.statSync(entryPath).isDirectory();
  });
  
  if (entries.length === 0) {
    console.log("No test sessions found.");
    console.log(`\nRun tests with: ${SCRIPT_NAME} run [sandbox-name]`);
    return [];
  }
  
  // Load metadata for all sessions and sort by start time (newest first)
  const sessionsWithMetadata: Array<{id: string; metadata: TestSessionMetadata; mtime: number}> = [];
  for (const sessionId of entries) {
    const sessionPath = path.join(sessionDir, sessionId);
    const metadataPath = path.join(sessionPath, "metadata.json");
    if (fs.existsSync(metadataPath)) {
      try {
        const metadata = JSON.parse(fs.readFileSync(metadataPath, "utf-8")) as TestSessionMetadata;
        const stats = fs.statSync(sessionPath);
        if (!sandboxFilter || metadata.sandboxName.toLowerCase().includes(sandboxFilter.toLowerCase())) {
          sessionsWithMetadata.push({
            id: sessionId,
            metadata,
            mtime: stats.mtimeMs,
          });
        }
      } catch {
        // Skip sessions with invalid metadata
      }
    }
  }
  
  // Sort by start time (newest first)
  sessionsWithMetadata.sort((a, b) => b.metadata.startTime - a.metadata.startTime);
  
  const displayLimit = limit || 20;
  const displaySessions = sessionsWithMetadata.slice(0, displayLimit);
  
  console.log(`\nAvailable sessions (${sessionsWithMetadata.length}${sandboxFilter ? ` matching "${sandboxFilter}"` : ""}):\n`);
  for (let i = 0; i < displaySessions.length; i++) {
    const { id, metadata } = displaySessions[i];
    const date = new Date(metadata.startTime).toLocaleString();
    const statusIcon = metadata.status === "passed" ? "✓" : "✗";
    const duration = (metadata.duration / 1000).toFixed(1);
    console.log(`  ${i + 1}. ${statusIcon} ${id}`);
    console.log(`     Sandbox: ${metadata.sandboxName} | ${metadata.passedTests}/${metadata.totalTests} passed | ${duration}s | ${date}`);
  }
  if (sessionsWithMetadata.length > displayLimit) {
    console.log(`\n  ... and ${sessionsWithMetadata.length - displayLimit} more`);
  }
  console.log();
  
  return sessionsWithMetadata.map(s => s.id);
}
