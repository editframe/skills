import type { BrowserError, BrowserWarning, BrowserLogPrefix, BrowserLogEntry } from "./session-storage.js";

export function extractErrorType(message: string): string {
  // Extract error type from common patterns
  // Examples: "scrubVideoInitSegmentFetchTask error", "No scrub rendition available"
  const match = message.match(/(\w+)\s*(?:error|Error|failed|Failed)/i);
  if (match) {
    return match[1];
  }
  
  // Try to extract from common error messages
  if (message.includes("scrubVideoInitSegmentFetchTask")) {
    return "scrubVideoInitSegmentFetchTask";
  }
  if (message.includes("unifiedVideoSeekTask")) {
    return "unifiedVideoSeekTask";
  }
  if (message.includes("frameTask")) {
    return "frameTask";
  }
  if (message.includes("scrubVideoSegmentFetchTask")) {
    return "scrubVideoSegmentFetchTask";
  }
  
  // Fallback: use message as type, sanitize but preserve full length
  // Replace non-alphanumeric with underscores, but keep full message for LLM context
  return message.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 200); // Increased limit to 200 chars
}

export function extractLogPrefix(text: string): string | null {
  // Extract prefix from logs in [prefix] ... format
  // Examples: "[log] [captureFromClone] build=0ms", "[log] [renderToImage] FO path: 320x180"
  const match = text.match(/\[log\]\s*\[([^\]]+)\]/);
  if (match) {
    return match[1];
  }
  
  // Also check for other log formats like [warning] [prefix] or [error] [prefix]
  const otherMatch = text.match(/\[(?:warning|error|info|debug)\]\s*\[([^\]]+)\]/);
  if (otherMatch) {
    return otherMatch[1];
  }
  
  return null;
}

export function extractWarningType(message: string): string {
  // Extract warning type from common patterns
  // Examples: "Canvas2D: Multiple readback", "JitMediaEngine: No video rendition"
  const match = message.match(/(\w+):\s*(.+?)(?:\s+at\s|$)/i);
  if (match) {
    // Use source and first part of message
    const source = match[1];
    const msgPart = match[2].slice(0, 50).replace(/[^a-zA-Z0-9]/g, "_");
    return `${source}_${msgPart}`;
  }
  
  // Try to extract from common warning patterns
  if (message.includes("Canvas2D")) {
    const canvasMatch = message.match(/Canvas2D[^:]*:\s*(.+?)(?:\s+at\s|$)/i);
    if (canvasMatch) {
      return `Canvas2D_${canvasMatch[1].slice(0, 50).replace(/[^a-zA-Z0-9]/g, "_")}`;
    }
    return "Canvas2D_warning";
  }
  if (message.includes("JitMediaEngine")) {
    return "JitMediaEngine_warning";
  }
  if (message.includes("Time domain analysis")) {
    return "Time_domain_analysis_skipped";
  }
  if (message.includes("Frequency analysis")) {
    return "Frequency_analysis_skipped";
  }
  
  // Fallback: use message as type, sanitize but preserve full length
  return message.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 200);
}

export function isExpectedError(errorType: string, message: string): boolean {
  // Known expected errors in test environment
  const expectedPatterns = [
    /scrubVideoInitSegmentFetchTask/i,
    /unifiedVideoSeekTask/i,
    /frameTask/i,
    /scrubVideoSegmentFetchTask/i,
    /No scrub rendition available/i,
    /Video rendition unavailable/i,
    /Failed to load resource.*401/i,
    /Failed to load resource.*404/i,
    // AbortErrors are expected when elements are disconnected from DOM during tests
    // These occur when tasks are cancelled due to element removal
    /AbortError/i,
    /signal.*aborted/i,
    /signal_is_aborted/i,
    /The user aborted a request/i,
  ];
  
  return expectedPatterns.some(pattern => 
    pattern.test(errorType) || pattern.test(message)
  );
}
