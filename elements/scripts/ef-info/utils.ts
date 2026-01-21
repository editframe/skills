import * as fs from "node:fs";
import * as path from "node:path";
import { getSessionStorageDir, loadSessionData, type TestSessionMetadata } from "../ef-utils/session-storage.js";

export function findSessionId(args: string[]): string | null {
  const sessionIndex = args.indexOf("--session");
  if (sessionIndex >= 0 && args[sessionIndex + 1]) {
    return args[sessionIndex + 1];
  }
  return null;
}

export function hasFlag(args: string[], flag: string): boolean {
  return args.includes(flag);
}

export function resolveSessionId(sessionIdOrAlias: string, sandboxName?: string): string | null {
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
