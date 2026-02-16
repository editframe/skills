/**
 * Main-thread interface to the SVG assembly worker.
 *
 * Offloads SVG string concatenation and base64 encoding to a dedicated worker,
 * keeping the main thread free during the most expensive synchronous step.
 * Falls back to main-thread assembly when Workers are unavailable.
 */

import { logger } from "../logger.js";
import { getAssemblyWorkerUrl } from "../workers/assemblyWorkerInline.js";

const ASSEMBLY_TASK_TIMEOUT_MS = 30000;

let _assemblyWorker: Worker | null = null;
let _workerWarningLogged = false;

function getAssemblyWorker(): Worker | null {
  if (_assemblyWorker) {
    return _assemblyWorker;
  }

  if (typeof Worker === "undefined") {
    if (!_workerWarningLogged) {
      _workerWarningLogged = true;
      logger.warn(
        "[assemblyEncoder] Workers not available, using main thread fallback",
      );
    }
    return null;
  }

  try {
    const url = getAssemblyWorkerUrl();
    _assemblyWorker = new Worker(url, { type: "module" });
  } catch (error) {
    _assemblyWorker = null;
    if (!_workerWarningLogged) {
      _workerWarningLogged = true;
      const msg = error instanceof Error ? error.message : String(error);
      logger.warn(
        `[assemblyEncoder] Failed to create worker: ${msg} - using main thread fallback`,
      );
    }
  }

  return _assemblyWorker;
}

function assembleSvgDataUriMainThread(
  parts: string[],
  outputWidth: number,
  outputHeight: number,
): string {
  const xhtml = parts.join("");
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${outputWidth}" height="${outputHeight}">` +
    `<foreignObject x="0" y="0" width="${outputWidth}" height="${outputHeight}">${xhtml}</foreignObject>` +
    `</svg>`;
  const bytes = new TextEncoder().encode(svg);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192) {
    binary += String.fromCharCode.apply(
      null,
      bytes.subarray(i, i + 8192) as unknown as number[],
    );
  }
  return `data:image/svg+xml;base64,${btoa(binary)}`;
}

export async function assembleSvgDataUri(
  parts: string[],
  outputWidth: number,
  outputHeight: number,
): Promise<string> {
  const worker = getAssemblyWorker();
  if (!worker) {
    return assembleSvgDataUriMainThread(parts, outputWidth, outputHeight);
  }

  return new Promise<string>((resolve, reject) => {
    const taskId = `asm-${Date.now()}-${Math.random()}-${performance.now()}`;
    let timeoutId: number | null = null;

    const cleanup = () => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      worker.removeEventListener("message", messageHandler);
      worker.removeEventListener("messageerror", errorHandler);
    };

    const messageHandler = (event: MessageEvent) => {
      const data = event.data;
      // Skip startup message
      if (typeof data === "string") return;
      if (data.taskId !== taskId) return;

      cleanup();
      if (data.error) {
        reject(new Error(`Assembly worker failed: ${data.error}`));
      } else {
        resolve(new TextDecoder().decode(data.buffer));
      }
    };

    const errorHandler = () => {
      cleanup();
      reject(new Error("Assembly worker message error"));
    };

    worker.addEventListener("message", messageHandler);
    worker.addEventListener("messageerror", errorHandler);

    timeoutId = window.setTimeout(() => {
      cleanup();
      reject(new Error("Assembly worker task timed out"));
    }, ASSEMBLY_TASK_TIMEOUT_MS);

    worker.postMessage({ taskId, parts, outputWidth, outputHeight });
  });
}

export function resetAssemblyWorker(): void {
  if (_assemblyWorker) {
    _assemblyWorker.terminate();
    _assemblyWorker = null;
  }
  _workerWarningLogged = false;
}
