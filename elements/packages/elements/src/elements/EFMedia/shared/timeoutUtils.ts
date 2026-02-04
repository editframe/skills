import opentelemetry, { SpanStatusCode } from "@opentelemetry/api";

export const DEFAULT_MEDIABUNNY_TIMEOUT_MS = 10000; // 10s for decode operations

/**
 * Wraps a promise with a timeout and optional AbortSignal support.
 * Records errors in OpenTelemetry spans for observability.
 * 
 * @param promise - The promise to wrap with timeout protection
 * @param timeoutMs - Timeout duration in milliseconds
 * @param operationName - Name of the operation for error messages and telemetry
 * @param signal - Optional AbortSignal for cancellation support
 * @returns The result of the promise if it completes before timeout
 * @throws Error if timeout is reached or operation is aborted
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operationName: string,
  signal?: AbortSignal,
): Promise<T> {
  if (signal?.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }

  const timeoutPromise = new Promise<never>((_, reject) => {
    const timeoutId = setTimeout(() => {
      const error = new Error(
        `${operationName} timeout after ${timeoutMs}ms. ` +
        `This may indicate a mediabunny decoding issue or missing codec configuration. ` +
        `Check video codec configuration, try different quality, or contact support.`
      );
      reject(error);
    }, timeoutMs);
    
    signal?.addEventListener('abort', () => {
      clearTimeout(timeoutId);
      reject(new DOMException("Aborted", "AbortError"));
    }, { once: true });
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } catch (error) {
    // Record in active span if available
    const span = opentelemetry.trace.getActiveSpan();
    if (span && error instanceof Error) {
      span.recordException(error);
      span.setStatus({ 
        code: SpanStatusCode.ERROR, 
        message: error.message 
      });
    }
    throw error;
  }
}
