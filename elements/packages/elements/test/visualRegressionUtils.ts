/**
 * Visual regression utilities for browser tests.
 * 
 * These utilities enable capturing canvas/element snapshots in browser tests
 * and comparing them against baseline images using odiff for pixel-perfect
 * visual regression testing.
 */

export interface SnapshotComparisonResult {
  match: boolean;
  diffCount?: number;
  diffPercentage?: number;
  baselineCreated?: boolean;
  error?: string;
}

/**
 * Capture a canvas element as a data URL.
 * Uses JPEG format with configurable quality for smaller file sizes.
 */
export function captureCanvasAsDataUrl(
  canvas: HTMLCanvasElement,
  format: "image/png" | "image/jpeg" = "image/jpeg",
  quality: number = 0.85,
): string {
  return canvas.toDataURL(format, quality);
}

/**
 * Capture an element to canvas, then return as data URL.
 * Uses the same technique as renderToImage but returns raw data.
 */
export async function captureElementAsDataUrl(
  element: HTMLElement,
  width: number,
  height: number,
): Promise<string> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to get canvas 2d context");
  }
  
  // Use html2canvas-style rendering through SVG foreignObject
  const clone = element.cloneNode(true) as HTMLElement;
  
  // Create wrapper with XHTML namespace
  const wrapper = document.createElement("div");
  wrapper.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
  wrapper.setAttribute("style", `width:${width}px;height:${height}px;overflow:hidden;position:relative;`);
  wrapper.appendChild(clone);

  // Serialize to XHTML
  const xmlSerializer = new XMLSerializer();
  const serialized = xmlSerializer.serializeToString(wrapper);

  // Wrap in SVG foreignObject
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <foreignObject width="100%" height="100%">
      ${serialized}
    </foreignObject>
  </svg>`;

  // Convert to data URL
  const base64 = btoa(unescape(encodeURIComponent(svg)));
  const svgDataUri = `data:image/svg+xml;base64,${base64}`;
  
  // Draw to canvas
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = svgDataUri;
  });
  
  ctx.drawImage(img, 0, 0);
  return canvas.toDataURL("image/png");
}

/**
 * Write a snapshot image to the file system via the test server.
 * This sends the PNG data to the server which writes it to disk.
 */
export async function writeSnapshot(
  testName: string,
  snapshotName: string,
  dataUrl: string,
  isBaseline: boolean = false,
): Promise<void> {
  const response = await fetch("/@ef-write-snapshot", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      testName,
      snapshotName,
      dataUrl,
      isBaseline,
    }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to write snapshot: ${error}`);
  }
}

/**
 * Compare a snapshot against its baseline using odiff.
 * Returns comparison results including diff percentage.
 */
export async function compareSnapshot(
  testName: string,
  snapshotName: string,
  dataUrl: string,
  options: {
    threshold?: number;
    antialiasing?: boolean;
    acceptableDiffPercentage?: number;
  } = {},
): Promise<SnapshotComparisonResult> {
  const {
    threshold = 0.1,
    antialiasing = true,
    acceptableDiffPercentage = 1.0,
  } = options;
  
  const response = await fetch("/@ef-compare-snapshot", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      testName,
      snapshotName,
      dataUrl,
      threshold,
      antialiasing,
      acceptableDiffPercentage,
    }),
  });
  console.log("response", response);
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to compare snapshot: ${error}`);
  }
  
  return response.json();
}

/**
 * High-level function to capture and compare a canvas snapshot.
 * Creates baseline if it doesn't exist, otherwise compares.
 */
export async function assertCanvasSnapshot(
  canvas: HTMLCanvasElement,
  testName: string,
  snapshotName: string,
  options: {
    threshold?: number;
    acceptableDiffPercentage?: number;
  } = {},
): Promise<SnapshotComparisonResult> {
  // Use PNG format for consistent snapshot comparison (odiff works best with PNG)
  const dataUrl = captureCanvasAsDataUrl(canvas, "image/png");
  return compareSnapshot(testName, snapshotName, dataUrl, options);
}

/**
 * Assert that a snapshot matches its baseline.
 * Throws an assertion error if the diff exceeds the acceptable threshold.
 */
export async function expectCanvasToMatchSnapshot(
  canvas: HTMLCanvasElement,
  testName: string,
  snapshotName: string,
  options: {
    threshold?: number;
    acceptableDiffPercentage?: number;
  } = {},
): Promise<void> {
  const result = await assertCanvasSnapshot(canvas, testName, snapshotName, options);
  
  if (result.baselineCreated) {
    console.log(`✅ Created baseline: ${testName}/${snapshotName}`);
    return;
  }
  
  if (!result.match) {
    const diffInfo = result.diffPercentage !== undefined
      ? `${result.diffPercentage.toFixed(2)}% different`
      : result.error || "comparison failed";
    throw new Error(`Visual regression detected for ${testName}/${snapshotName}: ${diffInfo}`);
  }
}

/**
 * Compare two canvases directly against each other.
 * Returns comparison results including diff percentage.
 */
export async function compareTwoCanvases(
  canvas1: HTMLCanvasElement,
  canvas2: HTMLCanvasElement,
  testName: string,
  comparisonName: string,
  options: {
    threshold?: number;
    acceptableDiffPercentage?: number;
  } = {},
): Promise<SnapshotComparisonResult> {
  const {
    threshold = 0.1,
    acceptableDiffPercentage = 1.0,
  } = options;
  
  // Use PNG format for consistent comparison (odiff works best with PNG)
  const dataUrl1 = captureCanvasAsDataUrl(canvas1, "image/png");
  const dataUrl2 = captureCanvasAsDataUrl(canvas2, "image/png");
  
  const response = await fetch("/@ef-compare-two-images", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      testName,
      comparisonName,
      dataUrl1,
      dataUrl2,
      threshold,
      acceptableDiffPercentage,
    }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to compare canvases: ${error}`);
  }
  
  return response.json();
}

/**
 * Assert that two canvases match within acceptable threshold.
 * Throws an assertion error if the diff exceeds the acceptable threshold.
 */
export async function expectCanvasesToMatch(
  canvas1: HTMLCanvasElement,
  canvas2: HTMLCanvasElement,
  testName: string,
  comparisonName: string,
  options: {
    threshold?: number;
    acceptableDiffPercentage?: number;
  } = {},
): Promise<void> {
  const result = await compareTwoCanvases(canvas1, canvas2, testName, comparisonName, options);
  
  if (!result.match) {
    const diffInfo = result.diffPercentage !== undefined
      ? `${result.diffPercentage.toFixed(2)}% different`
      : result.error || "comparison failed";
    throw new Error(`Canvas comparison failed for ${testName}/${comparisonName}: ${diffInfo}`);
  }
}

