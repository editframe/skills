import { executeSpan } from "@/tracing";
import { SpanStatusCode } from "@opentelemetry/api";

export interface CancellablePromise<T> extends Promise<T> {
  cancel: () => void;
}

export class CancelledError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CancelledError";
  }
}

export const raceTimeout = <T>(
  durationMs: number,
  message: string,
  promise: Promise<T>,
): CancellablePromise<T> => {
  let timeoutId: NodeJS.Timeout;
  let reject: (reason?: any) => void;
  let isCancelled = false;
  let spanRef: any;

  const wrappedPromise = executeSpan("raceTimeout", async (span) => {
    spanRef = span;
    const timeoutPromise = new Promise<never>((_, rej) => {
      reject = rej;
      timeoutId = setTimeout(() => {
        if (!isCancelled) {
          const error = new Error(message);
          span.recordException(error);
          reject(error);
        }
      }, durationMs);
    });

    try {
      return await Promise.race([
        promise.finally(() => {
          if (!isCancelled) {
            span.setStatus({ code: SpanStatusCode.OK });
            clearTimeout(timeoutId);
          }
        }),
        timeoutPromise,
      ]);
    } finally {
      // Remove the span.end() call here since it's causing the issue
    }
  }) as CancellablePromise<T>;

  wrappedPromise.cancel = () => {
    isCancelled = true;
    clearTimeout(timeoutId);
    reject(new CancelledError("Promise cancelled"));
    if (spanRef) {
      spanRef.setStatus({ code: SpanStatusCode.ERROR, message: "Cancelled" });
      // Don't call end() here either - the executeSpan function will handle this
    }
  };

  return wrappedPromise;
};
