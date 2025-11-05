import { sleep } from "@/util/sleep";

export async function waitFor<T>(selector: () => Promise<T>, timeoutMs = 1_000) {
  const time = performance.now();
  let lastError: unknown = null;
  while (performance.now() - time < timeoutMs) {
    try {
      return await selector();
    } catch (e) {
      lastError = e;
      await sleep(20);
    }
  }
  throw lastError;
}

export async function waitUntil(condition: () => Promise<boolean> | boolean, timeoutMs = 1_000) {
  let startTime = performance.now();
  while (!(await condition())) {
    if (performance.now() - startTime > timeoutMs) {
      throw new Error("Timed out waiting for condition");
    }
    await sleep(20);
  }
}
