/**
 * Inline assembly worker - creates a blob URL from inlined worker code.
 *
 * Receives resolved XHTML parts, wraps in SVG foreignObject, base64-encodes,
 * and returns the data URI as a transferred ArrayBuffer (zero-copy).
 */

const workerCode = `
postMessage("assemblyWorker-loaded");

addEventListener("message", (event) => {
  const { taskId, parts, outputWidth, outputHeight } = event.data;

  try {
    const xhtml = parts.join("");
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="' + outputWidth + '" height="' + outputHeight + '">' +
      '<foreignObject x="0" y="0" width="' + outputWidth + '" height="' + outputHeight + '">' +
      xhtml +
      '</foreignObject></svg>';

    const bytes = new TextEncoder().encode(svg);
    let binary = "";
    for (let i = 0; i < bytes.length; i += 8192) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
    }
    const dataUri = "data:image/svg+xml;base64," + btoa(binary);

    const encoded = new TextEncoder().encode(dataUri);
    postMessage({ taskId, buffer: encoded.buffer }, [encoded.buffer]);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    postMessage({ taskId, buffer: new ArrayBuffer(0), error: errorMessage });
  }
});
`;

let cachedBlobUrl: string | null = null;

export function getAssemblyWorkerUrl(): string {
  if (cachedBlobUrl) {
    return cachedBlobUrl;
  }

  const blob = new Blob([workerCode], { type: "application/javascript" });
  cachedBlobUrl = URL.createObjectURL(blob);
  return cachedBlobUrl;
}

export function revokeAssemblyWorkerUrl(): void {
  if (cachedBlobUrl) {
    URL.revokeObjectURL(cachedBlobUrl);
    cachedBlobUrl = null;
  }
}
