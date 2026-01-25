/**
 * Helper functions for frame serialization with worker pool.
 * Extracts canvas data and prepares HTML for worker-based serialization.
 */

interface CanvasData {
  id: string;
  imageData: ImageData;
  width: number;
  height: number;
  preserveAlpha?: boolean;
}

/**
 * Extract canvas pixel data from a container for worker-based encoding.
 * Marks each canvas with a unique ID for replacement during serialization.
 * 
 * @param container - The HTML element containing canvases
 * @returns Array of canvas data with IDs and image data
 */
export function extractCanvasData(container: HTMLElement): CanvasData[] {
  const canvases = container.querySelectorAll('canvas');
  const results: CanvasData[] = [];

  canvases.forEach((canvas, index) => {
    const id = `canvas-${index}`;
    
    // Mark the canvas element with an ID so we can replace it during serialization
    canvas.setAttribute('data-canvas-id', id);

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (ctx && canvas.width > 0 && canvas.height > 0) {
      try {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const preserveAlpha = canvas.dataset.preserveAlpha === 'true';
        
        results.push({
          id,
          imageData,
          width: canvas.width,
          height: canvas.height,
          preserveAlpha
        });
      } catch (error) {
        // Cross-origin canvas or other error - skip this canvas
        // The canvas will remain in the HTML but won't be encoded
      }
    }
  });

  return results;
}

/**
 * Serialize a container to an HTML string for worker processing.
 * Creates a wrapper div with proper namespace and dimensions.
 * 
 * @param container - The HTML element to serialize
 * @param width - Output width
 * @param height - Output height
 * @returns Serialized HTML string ready for worker
 */
export function serializeToHtmlString(
  container: HTMLElement,
  width: number,
  height: number
): string {
  // Create a wrapper with proper XHTML namespace and styling
  const wrapper = document.createElement('div');
  wrapper.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
  wrapper.setAttribute(
    'style',
    `width:${width}px;height:${height}px;overflow:hidden;position:relative;`
  );

  // Clone the container to avoid modifying the original
  // Note: We already extracted canvas data, so canvas pixels don't need to be preserved
  const clone = container.cloneNode(true) as HTMLElement;
  wrapper.appendChild(clone);

  // Serialize to string
  const serializer = new XMLSerializer();
  return serializer.serializeToString(wrapper);
}

/**
 * Restore canvas elements after serialization (cleanup marked IDs).
 * Call this after serialization is complete to clean up temporary attributes.
 * 
 * @param container - The container with marked canvases
 */
export function cleanupCanvasMarkers(container: HTMLElement): void {
  const canvases = container.querySelectorAll('canvas[data-canvas-id]');
  canvases.forEach((canvas) => {
    canvas.removeAttribute('data-canvas-id');
  });
}
