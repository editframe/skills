/**
 * Profiler for measuring sync strategy performance.
 * 
 * Tracks timing per phase (read, write, copy) and outputs
 * results as console.table for easy comparison.
 */

import type { SyncPhase, SyncTiming } from "./types.js";

export class Profiler {
  private samples = new Map<SyncPhase | "total", number[]>();

  /** Time a synchronous operation and record the duration */
  time<T>(phase: SyncPhase, fn: () => T): T {
    const start = performance.now();
    const result = fn();
    const duration = performance.now() - start;
    this.record(phase, duration);
    return result;
  }

  /** Time an async operation and record the duration */
  async timeAsync<T>(phase: SyncPhase, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;
    this.record(phase, duration);
    return result;
  }

  /** Record a timing measurement for a phase */
  record(phase: SyncPhase | "total", ms: number): void {
    const arr = this.samples.get(phase) ?? [];
    arr.push(ms);
    this.samples.set(phase, arr);
  }

  /** Record a full SyncTiming result */
  recordTiming(timing: SyncTiming): void {
    this.record("read", timing.readMs);
    this.record("write", timing.writeMs);
    this.record("copy", timing.copyMs);
    this.record("total", timing.totalMs);
  }

  /** Get timing for a specific phase */
  getTiming(): SyncTiming {
    const read = this.samples.get("read") ?? [];
    const write = this.samples.get("write") ?? [];
    const copy = this.samples.get("copy") ?? [];
    
    const lastRead = read[read.length - 1] ?? 0;
    const lastWrite = write[write.length - 1] ?? 0;
    const lastCopy = copy[copy.length - 1] ?? 0;
    
    return {
      readMs: lastRead,
      writeMs: lastWrite,
      copyMs: lastCopy,
      totalMs: lastRead + lastWrite + lastCopy,
      elementCount: 0,
    };
  }

  /** Reset all recorded samples */
  reset(): void {
    this.samples.clear();
  }

  /** Get statistics for a phase */
  private getStats(phase: SyncPhase | "total"): {
    samples: number;
    avgMs: string;
    minMs: string;
    maxMs: string;
    p50Ms: string;
    p95Ms: string;
  } {
    const times = this.samples.get(phase) ?? [];
    if (times.length === 0) {
      return {
        samples: 0,
        avgMs: "0.00",
        minMs: "0.00",
        maxMs: "0.00",
        p50Ms: "0.00",
        p95Ms: "0.00",
      };
    }

    const sorted = [...times].sort((a, b) => a - b);
    const sum = times.reduce((a, b) => a + b, 0);
    const p50Index = Math.floor(sorted.length * 0.5);
    const p95Index = Math.floor(sorted.length * 0.95);

    return {
      samples: times.length,
      avgMs: (sum / times.length).toFixed(2),
      minMs: Math.min(...times).toFixed(2),
      maxMs: Math.max(...times).toFixed(2),
      p50Ms: (sorted[p50Index] ?? 0).toFixed(2),
      p95Ms: (sorted[p95Index] ?? 0).toFixed(2),
    };
  }

  /** Print results as console.table */
  report(): void {
    const phases: (SyncPhase | "total")[] = ["read", "write", "copy", "total"];
    const rows = phases
      .filter(phase => this.samples.has(phase))
      .map(phase => ({
        phase,
        ...this.getStats(phase),
      }));
    console.table(rows);
  }

  /** Get report as structured data */
  getReport(): Array<{
    phase: SyncPhase | "total";
    samples: number;
    avgMs: string;
    minMs: string;
    maxMs: string;
  }> {
    const phases: (SyncPhase | "total")[] = ["read", "write", "copy", "total"];
    return phases
      .filter(phase => this.samples.has(phase))
      .map(phase => ({
        phase,
        ...this.getStats(phase),
      }));
  }
}

/** Create a zero-timing result */
export function zeroTiming(elementCount: number = 0): SyncTiming {
  return {
    readMs: 0,
    writeMs: 0,
    copyMs: 0,
    totalMs: 0,
    elementCount,
  };
}

/** Create a timing result from measurements */
export function createTiming(
  readMs: number,
  writeMs: number,
  copyMs: number,
  elementCount: number,
): SyncTiming {
  return {
    readMs,
    writeMs,
    copyMs,
    totalMs: readMs + writeMs + copyMs,
    elementCount,
  };
}


