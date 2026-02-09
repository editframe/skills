/**
 * ScaleConfig - Unified scaling configuration for timeline serialization.
 * 
 * Consolidates the multi-stage scaling architecture into a single,
 * well-defined abstraction with clear contracts.
 * 
 * Previously, scaling was applied in 4 separate stages with implicit contracts:
 * 1. captureTimelineToDataUri: scaled output dimensions
 * 2. captureElementParts: CSS transform wrapper for DOM content
 * 3. serializeCanvas: independent optimalScale calculation per canvas
 * 4. encodeCanvasesInParallel: received pre-scaled snapshots
 * 
 * Now, ScaleConfig centralizes all scaling logic and makes the contracts explicit.
 */

export interface CanvasScaleParams {
  /** Natural canvas pixel dimensions */
  naturalWidth: number;
  naturalHeight: number;
  /** CSS display dimensions (how big it appears) */
  displayWidth: number;
  displayHeight: number;
}

/**
 * Immutable scaling configuration for a serialization operation.
 * 
 * All scaling decisions are computed once at construction and cached.
 * This ensures consistency across all stages of serialization.
 */
export class ScaleConfig {
  /** User-specified export scale (e.g., 0.25 for thumbnails, 1.0 for full resolution) */
  readonly exportScale: number;
  
  /** Input dimensions (before scaling) */
  readonly inputWidth: number;
  readonly inputHeight: number;
  
  /** Output SVG dimensions (after scaling) */
  readonly outputWidth: number;
  readonly outputHeight: number;
  
  /** Whether DOM content needs CSS transform:scale() wrapper */
  readonly needsDOMScaling: boolean;
  
  /** Quality multiplier for canvas encoding (1.5x for sharpness) */
  readonly qualityMultiplier: number = 1.5;
  
  constructor(width: number, height: number, exportScale: number) {
    this.inputWidth = width;
    this.inputHeight = height;
    this.exportScale = exportScale;
    
    // Compute output dimensions (Stage 1)
    this.outputWidth = Math.floor(width * exportScale);
    this.outputHeight = Math.floor(height * exportScale);
    
    // Determine if DOM needs CSS scaling (Stage 2)
    this.needsDOMScaling = exportScale < 1;
    
    // Freeze to ensure immutability
    Object.freeze(this);
  }
  
  /**
   * Compute optimal encoding scale for a canvas element.
   * 
   * This is Stage 3 of the scaling architecture. Canvas pixels are scaled
   * independently from DOM content because they have intrinsic resolution.
   * 
   * Algorithm:
   * 1. Calculate display scale (CSS size vs natural size)
   * 2. Multiply by export scale
   * 3. Multiply by quality multiplier (1.5x for sharpness)
   * 4. Cap at 1.0 (never upscale beyond natural resolution)
   * 
   * @param params - Canvas dimensions (natural and display)
   * @returns Optimal scale for encoding (0.0 to 1.0)
   */
  computeCanvasScale(params: CanvasScaleParams): number {
    const { naturalWidth, naturalHeight, displayWidth, displayHeight } = params;
    
    // Calculate how much smaller the display is vs natural size
    const displayScaleX = displayWidth / naturalWidth;
    const displayScaleY = displayHeight / naturalHeight;
    const displayScale = Math.min(displayScaleX, displayScaleY);
    
    // Combine display scale, export scale, and quality multiplier
    // Cap at 1.0 to never upscale beyond natural resolution
    const optimalScale = Math.min(
      1.0,
      displayScale * this.exportScale * this.qualityMultiplier
    );
    
    return optimalScale;
  }
  
  /**
   * Get the CSS transform value for DOM scaling.
   * Returns null if no scaling is needed.
   */
  getDOMTransform(): string | null {
    return this.needsDOMScaling ? `scale(${this.exportScale})` : null;
  }
  
  /**
   * Get the wrapper dimensions for the CSS transform.
   * When DOM is scaled, the wrapper must be larger to accommodate
   * the scaled-down content.
   */
  getDOMWrapperDimensions(): { width: number; height: number } {
    if (!this.needsDOMScaling) {
      return { width: this.outputWidth, height: this.outputHeight };
    }
    
    return {
      width: Math.floor(this.outputWidth / this.exportScale),
      height: Math.floor(this.outputHeight / this.exportScale),
    };
  }
  
  /**
   * Create a ScaleConfig from legacy options.
   * Maintains backward compatibility with existing callsites.
   */
  static fromOptions(width: number, height: number, canvasScale: number): ScaleConfig {
    return new ScaleConfig(width, height, canvasScale);
  }
}
