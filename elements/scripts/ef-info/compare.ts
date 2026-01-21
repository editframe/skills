import * as fs from "node:fs";
import * as path from "node:path";
import { SCRIPT_NAME } from "../ef-utils/paths.js";
import { getSessionStorageDir, loadSessionData, type TestSessionMetadata } from "../ef-utils/session-storage.js";
import { extractLogPrefix } from "../ef-utils/error-processing.js";
import { extractHotspots } from "../ef-utils/profile.js";

export async function infoCompare(sessionId1: string, sessionId2: string, json: boolean = false): Promise<void> {
  // Resolve aliases like "last", "previous"
  const resolvedId1 = resolveSessionId(sessionId1);
  const resolvedId2 = resolveSessionId(sessionId2);
  
  if (!resolvedId1) {
    console.error(`Session "${sessionId1}" not found`);
    if (sessionId1 === "last" || sessionId1 === "previous") {
      console.error(`No previous sessions available. Use a specific session ID or run tests first.`);
    }
    process.exit(1);
  }
  
  if (!resolvedId2) {
    console.error(`Session "${sessionId2}" not found`);
    if (sessionId2 === "last" || sessionId2 === "previous") {
      console.error(`No previous sessions available. Use a specific session ID or run tests first.`);
    }
    process.exit(1);
  }
  
  const data1 = loadSessionData(resolvedId1);
  const data2 = loadSessionData(resolvedId2);
  
  if (!data1) {
    console.error(`Session ${resolvedId1} not found`);
    process.exit(1);
  }
  if (!data2) {
    console.error(`Session ${resolvedId2} not found`);
    process.exit(1);
  }
  
  // Show which sessions are being compared (especially if aliases were used)
  if (sessionId1 !== resolvedId1 || sessionId2 !== resolvedId2) {
    console.log(`\nResolved session aliases:`);
    if (sessionId1 !== resolvedId1) {
      console.log(`  "${sessionId1}" → ${resolvedId1}`);
    }
    if (sessionId2 !== resolvedId2) {
      console.log(`  "${sessionId2}" → ${resolvedId2}`);
    }
    console.log();
  }
  
  const changes: string[] = [];
  const improvements: string[] = [];
  const regressions: string[] = [];
  
  // Compare test counts
  if (data1.metadata.totalTests !== data2.metadata.totalTests) {
    const diff = data2.metadata.totalTests - data1.metadata.totalTests;
    changes.push(`${diff > 0 ? "+" : ""}${diff} test(s) ${diff > 0 ? "added" : "removed"}`);
  }
  
  // Compare pass/fail
  if (data1.metadata.failedTests !== data2.metadata.failedTests) {
    const diff = data2.metadata.failedTests - data1.metadata.failedTests;
    if (diff < 0) {
      improvements.push(`${Math.abs(diff)} test(s) now passing`);
    } else {
      regressions.push(`${diff} test(s) now failing`);
    }
  }
  
  // Compare duration
  const durationDiff = data2.metadata.duration - data1.metadata.duration;
  const durationDiffPercent = data1.metadata.duration > 0 
    ? ((durationDiff / data1.metadata.duration) * 100) 
    : 0;
  
  if (Math.abs(durationDiffPercent) > 5) {
    if (durationDiff < 0) {
      improvements.push(`Performance: ${Math.abs(durationDiffPercent).toFixed(1)}% faster (${(Math.abs(durationDiff) / 1000).toFixed(1)}s improvement)`);
    } else {
      regressions.push(`Performance: ${durationDiffPercent.toFixed(1)}% slower (${(durationDiff / 1000).toFixed(1)}s regression)`);
    }
  }
  
  // Compare errors
  const errors1 = new Set(data1.errors.keys());
  const errors2 = new Set(data2.errors.keys());
  const newErrors = Array.from(errors2).filter(e => !errors1.has(e));
  const resolvedErrors = Array.from(errors1).filter(e => !errors2.has(e));
  
  if (newErrors.length > 0) {
    regressions.push(`${newErrors.length} new error type(s): ${newErrors.slice(0, 3).join(", ")}${newErrors.length > 3 ? "..." : ""}`);
  }
  if (resolvedErrors.length > 0) {
    improvements.push(`${resolvedErrors.length} error type(s) resolved`);
  }
  
  // Compare individual test durations
  const testMap1 = new Map(data1.tests.map(t => [t.name, t]));
  const testMap2 = new Map(data2.tests.map(t => [t.name, t]));
  
  const performanceChanges: Array<{test: string; diff: number; diffPercent: number}> = [];
  for (const [name, test2] of testMap2.entries()) {
    const test1 = testMap1.get(name);
    if (test1) {
      const diff = test2.durationMs - test1.durationMs;
      const diffPercent = test1.durationMs > 0 ? (diff / test1.durationMs) * 100 : 0;
      if (Math.abs(diffPercent) > 10) {
        performanceChanges.push({ test: name, diff, diffPercent });
      }
    }
  }
  
  if (performanceChanges.length > 0) {
    const slower = performanceChanges.filter(c => c.diff > 0).sort((a, b) => b.diffPercent - a.diffPercent);
    const faster = performanceChanges.filter(c => c.diff < 0).sort((a, b) => a.diffPercent - b.diffPercent);
    
    if (slower.length > 0) {
      regressions.push(`${slower.length} test(s) >10% slower: ${slower.slice(0, 2).map(s => `"${s.test}" (+${s.diffPercent.toFixed(0)}%)`).join(", ")}${slower.length > 2 ? "..." : ""}`);
    }
    if (faster.length > 0) {
      improvements.push(`${faster.length} test(s) >10% faster`);
    }
  }
  
  if (json) {
    console.log(JSON.stringify({
      session1: resolvedId1,
      session2: resolvedId2,
      changes,
      improvements,
      regressions,
      durationDiff,
      durationDiffPercent,
    }, null, 2));
    return;
  }
  
  console.log(`\nComparing sessions:`);
  console.log(`  Previous: ${resolvedId1} (${data1.metadata.totalTests} tests, ${data1.metadata.failedTests} failed)`);
  console.log(`  Current:  ${resolvedId2} (${data2.metadata.totalTests} tests, ${data2.metadata.failedTests} failed)\n`);
  
  if (changes.length > 0) {
    console.log(`Changes:`);
    for (const change of changes) {
      console.log(`  • ${change}`);
    }
    console.log();
  }
  
  if (improvements.length > 0) {
    console.log(`✓ Improvements:`);
    for (const improvement of improvements) {
      console.log(`  • ${improvement}`);
    }
    console.log();
  }
  
  if (regressions.length > 0) {
    console.log(`✗ Regressions:`);
    for (const regression of regressions) {
      console.log(`  • ${regression}`);
    }
    console.log();
  }
  
  if (improvements.length === 0 && regressions.length === 0 && changes.length === 0) {
    console.log(`No significant changes detected`);
  }
}

