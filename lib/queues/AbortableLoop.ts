import { logger } from "@/logging";
import { executeSpan } from "@/tracing";
import { sleep } from "@/util/sleep";
import { inspect } from "node:util";

export interface AbortableLoop {
  abort: () => Promise<void>;
}

export const RequestSleep = Symbol.for("RequestSleep");
export const abortableLoopWithBackoff = ({
  fn,
  spanName,
  backoffMs,
  alwaysSleep = false,
  maxBackoffMs = 30000,
}: {
  fn: () => Promise<undefined | typeof RequestSleep> | Promise<void>;
  spanName: string;
  backoffMs: number;
  alwaysSleep?: boolean;
  maxBackoffMs?: number;
}) => {
  let consecutiveErrors = 0;
  const abortController = new AbortController();
  const loop = (async () => {
    while (true) {
      if (abortController.signal.aborted) {
        logger.debug("Stopping loop due to abort");
        break;
      }
      await executeSpan(spanName, async (_span) => {
        try {
          const maybeSleepRequest = await fn();
          if (maybeSleepRequest === RequestSleep) {
            await sleep(backoffMs, abortController.signal);
          }
          consecutiveErrors = 0;
          if (alwaysSleep) {
            await sleep(backoffMs, abortController.signal);
          }
        } catch (error) {
          consecutiveErrors++;
          const sleepTime = Math.min(
            backoffMs * 2 ** consecutiveErrors,
            maxBackoffMs,
          );
          logger.debug({ error: inspect(error), sleepTime }, "Error in loop");
          await sleep(sleepTime, abortController.signal);
        }
      });
    }
  })();

  return {
    abort: async () => {
      logger.debug("Aborting loop");
      abortController.abort();
      try {
        logger.debug("Waiting for loop to finish");
        await loop;
        logger.debug("Loop finished");
      } catch (error) {
        logger.debug(
          { error: inspect(error) },
          "Loop failed to resolve on abort",
        );
      }
    },
  };
};
