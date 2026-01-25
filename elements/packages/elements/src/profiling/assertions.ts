/**
 * Profile assertions for performance testing
 */

import type {
  HotspotInfo,
  ProfileAssertion,
  ProfileAssertionResult,
} from "./types.js";
import { findHotspot } from "./analyzer.js";

/**
 * Check profile assertions against hotspots
 */
export function checkProfileAssertions(
  hotspots: HotspotInfo[],
  assertions: ProfileAssertion[]
): ProfileAssertionResult[] {
  const results: ProfileAssertionResult[] = [];

  for (const assertion of assertions) {
    let passed = false;
    let message = "";
    let actual: ProfileAssertionResult["actual"] = {};

    const hotspot = findHotspot(hotspots, assertion.functionName, assertion.fileName);

    switch (assertion.type) {
      case "topHotspot": {
        if (!assertion.functionName && !assertion.fileName) {
          message = "topHotspot assertion requires functionName or fileName";
          break;
        }
        if (!hotspot) {
          passed = false;
          message = `Function ${assertion.functionName || assertion.fileName} not found in profile`;
          break;
        }
        const position = hotspots.indexOf(hotspot);
        actual.position = position;
        if (assertion.position !== undefined) {
          passed = position === assertion.position;
          message = passed
            ? `Function is at position ${position} as expected`
            : `Expected position ${assertion.position}, but found at position ${position}`;
        } else {
          // Default: check if it's in top 5
          passed = position < 5;
          message = passed
            ? `Function is in top 5 (position ${position})`
            : `Function is not in top 5 (position ${position})`;
        }
        break;
      }

      case "notInTopN": {
        if (!assertion.functionName && !assertion.fileName) {
          message = "notInTopN assertion requires functionName or fileName";
          break;
        }
        const maxN = assertion.maxN ?? 5;
        if (!hotspot) {
          passed = true;
          message = `Function ${assertion.functionName || assertion.fileName} not found in profile (pass)`;
          break;
        }
        const position = hotspots.indexOf(hotspot);
        actual.position = position;
        passed = position >= maxN;
        message = passed
          ? `Function is not in top ${maxN} (position ${position})`
          : `Function is in top ${maxN} (position ${position})`;
        break;
      }

      case "maxPercentage": {
        if (!assertion.functionName && !assertion.fileName) {
          message = "maxPercentage assertion requires functionName or fileName";
          break;
        }
        if (!hotspot) {
          passed = true;
          message = `Function ${assertion.functionName || assertion.fileName} not found in profile (pass)`;
          break;
        }
        actual.percentage = hotspot.selfTimePct;
        if (assertion.maxPercentage === undefined) {
          message = "maxPercentage assertion requires maxPercentage value";
          break;
        }
        passed = hotspot.selfTimePct <= assertion.maxPercentage;
        message = passed
          ? `Percentage ${hotspot.selfTimePct.toFixed(1)}% is within limit ${assertion.maxPercentage}%`
          : `Percentage ${hotspot.selfTimePct.toFixed(1)}% exceeds limit ${assertion.maxPercentage}%`;
        break;
      }

      case "maxSelfTime": {
        if (!assertion.functionName && !assertion.fileName) {
          message = "maxSelfTime assertion requires functionName or fileName";
          break;
        }
        if (!hotspot) {
          passed = true;
          message = `Function ${assertion.functionName || assertion.fileName} not found in profile (pass)`;
          break;
        }
        actual.selfTimeMs = hotspot.selfTime;
        if (assertion.maxSelfTimeMs === undefined) {
          message = "maxSelfTime assertion requires maxSelfTimeMs value";
          break;
        }
        passed = hotspot.selfTime <= assertion.maxSelfTimeMs;
        message = passed
          ? `Self time ${hotspot.selfTime.toFixed(2)}ms is within limit ${assertion.maxSelfTimeMs}ms`
          : `Self time ${hotspot.selfTime.toFixed(2)}ms exceeds limit ${assertion.maxSelfTimeMs}ms`;
        break;
      }
    }

    results.push({ assertion, passed, message, actual });
  }

  return results;
}

/**
 * Check if all assertions passed
 */
export function allAssertionsPassed(results: ProfileAssertionResult[]): boolean {
  return results.every((r) => r.passed);
}

/**
 * Format assertion results for console output
 */
export function formatAssertionResults(results: ProfileAssertionResult[]): string {
  const lines: string[] = [];
  const passed = results.filter((r) => r.passed).length;
  const failed = results.length - passed;

  lines.push(`\nAssertion Results: ${passed} passed, ${failed} failed`);
  lines.push("─".repeat(60));

  for (const result of results) {
    const status = result.passed ? "✓" : "✗";
    const color = result.passed ? "green" : "red";
    lines.push(`${status} ${result.message}`);
    
    if (!result.passed && result.actual) {
      const actualStr = Object.entries(result.actual)
        .map(([key, value]) => `${key}: ${value}`)
        .join(", ");
      lines.push(`  Actual: ${actualStr}`);
    }
  }

  return lines.join("\n");
}
