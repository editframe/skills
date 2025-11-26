/**
 * TypeScript interface for the PNG Exporter component
 * Uses explicit resource management for automatic cleanup
 */

export interface PngExportOptions {
  framePtr: number;
  targetWidth?: number;
  targetHeight?: number;
}

/**
 * PngExporter - A disposable resource for exporting video frames to PNG format
 * Automatically manages PNG encoding resources and frame conversion
 */
export interface PngExporter {
  /**
   * Export a frame to PNG format
   * @param framePtr Frame pointer for accessing actual frame data
   * @param targetWidth Optional target width (0 = keep original)
   * @param targetHeight Optional target height (0 = keep original)
   * @returns Promise that resolves to PNG data as Buffer
   */
  exportFrameToPng(
    framePtr: number,
    targetWidth?: number,
    targetHeight?: number,
  ): Promise<Buffer>;

  /**
   * Export a frame to PNG format using options object
   * @param options Export options including framePtr and optional dimensions
   * @returns Promise that resolves to PNG data as Buffer
   */
  exportFrameToPng(options: PngExportOptions): Promise<Buffer>;

  /**
   * Explicit resource cleanup - called automatically when using 'using' declaration
   */
  [Symbol.dispose](): void;
}

/**
 * Factory function to create a PngExporter instance
 * The returned PngExporter can be used with 'using' declaration for automatic cleanup
 *
 * @example
 * ```typescript
 * using pngExporter = await createPngExporter();
 *
 * // Export frame with original dimensions
 * const pngData = await pngExporter.exportFrameToPng(framePtr);
 *
 * // Export frame with custom dimensions
 * const scaledPngData = await pngExporter.exportFrameToPng(framePtr, 640, 480);
 *
 * // Save to file
 * await fs.writeFile('frame.png', pngData);
 * ```
 */
export async function createPngExporter(): Promise<PngExporter> {
  const { createPngExporterNative } = await import("../playback.js");

  const nativePngExporter = createPngExporterNative();

  return {
    async exportFrameToPng(
      framePtrOrOptions: number | PngExportOptions,
      targetWidth?: number,
      targetHeight?: number,
    ): Promise<Buffer> {
      let framePtr: number;
      let width: number | undefined;
      let height: number | undefined;

      if (typeof framePtrOrOptions === "object") {
        framePtr = framePtrOrOptions.framePtr;
        width = framePtrOrOptions.targetWidth;
        height = framePtrOrOptions.targetHeight;
      } else {
        framePtr = framePtrOrOptions;
        width = targetWidth;
        height = targetHeight;
      }

      return new Promise<Buffer>((resolve, reject) => {
        try {
          const result = nativePngExporter.exportFrameToPng(
            framePtr,
            width || 0,
            height || 0,
          );
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
    },

    [Symbol.dispose](): void {
      nativePngExporter.dispose();
    },
  };
}
