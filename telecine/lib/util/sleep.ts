import { executeSpan } from "@/tracing";
import { promiseWithResolvers } from "./promiseWithResolvers";

// eslint-disable-next-line @typescript-eslint/promise-function-async
export const sleep = (ms: number, signal?: AbortSignal) =>
  executeSpan("util.sleep", (span) => {
    span.setAttribute("ms", ms);
    if (signal?.aborted) {
      return Promise.resolve();
    }
    const resolvers = promiseWithResolvers<void>();
    const timeout = setTimeout(() => resolvers.resolve(), ms);
    const onAbort = () => {
      signal?.removeEventListener("abort", onAbort);
      clearTimeout(timeout);
      resolvers.resolve();
    };
    if (signal) {
      signal.addEventListener("abort", onAbort);
    }

    return resolvers.promise.finally(() => {
      if (signal) {
        signal.removeEventListener("abort", onAbort);
      }
    });
  });
