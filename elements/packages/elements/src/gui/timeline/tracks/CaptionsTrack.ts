import { consume } from "@lit/context";
import { css, html, nothing, type TemplateResult } from "lit";
import { customElement } from "lit/decorators.js";
import { styleMap } from "lit/directives/style-map.js";
import type { ReactiveController } from "lit";
import {
  type Caption,
  EFCaptions,
  type WordSegment,
} from "../../../elements/EFCaptions.js";
import { phosphorIcon, ICONS } from "../../icons.js";
import { currentTimeContext } from "../../currentTimeContext.js";
// TrackItem must be pre-loaded before this module is imported
// See preloadTracks.ts for the initialization sequence
import { TrackItem } from "./TrackItem.js";

// Shared canvas context for text measurement (avoids creating new canvas each time)
let measurementCanvas: HTMLCanvasElement | null = null;
let measurementContext: CanvasRenderingContext2D | null = null;
// Cache for text measurements: key is "text:fontSize:fontWeight"
const textMeasurementCache = new Map<string, number>();
const MAX_CACHE_SIZE = 500;

/**
 * Measure text width accurately using canvas.
 * Matches the actual font used in word elements (font-weight: 500).
 * Results are cached to avoid repeated measurements of the same text.
 */
function measureTextWidth(text: string, fontSize: number, fontWeight: number = 500): number {
  // Check cache first
  const cacheKey = `${text}:${fontSize}:${fontWeight}`;
  const cached = textMeasurementCache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }
  
  // Initialize shared canvas context if needed
  if (!measurementCanvas || !measurementContext) {
    measurementCanvas = document.createElement("canvas");
    measurementContext = measurementCanvas.getContext("2d");
  }
  
  if (!measurementContext) {
    return text.length * fontSize * 0.6; // Fallback estimate
  }
  
  // Match the actual font used in word elements
  const fontFamily = getComputedStyle(document.body).fontFamily || "system-ui, sans-serif";
  measurementContext.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  const width = measurementContext.measureText(text).width;
  
  // Cache the result (with size limit to prevent memory leaks)
  if (textMeasurementCache.size >= MAX_CACHE_SIZE) {
    // Clear oldest entries (simple strategy: clear half the cache)
    const keysToDelete = Array.from(textMeasurementCache.keys()).slice(0, MAX_CACHE_SIZE / 2);
    for (const key of keysToDelete) {
      textMeasurementCache.delete(key);
    }
  }
  textMeasurementCache.set(cacheKey, width);
  
  return width;
}

/**
 * Check if words can fit individually within a segment when positioned by time
 * 
 * Strategy: Allow overlaps as long as all words can be rendered within the container.
 * Only use compact mode when words are so cramped they can't be displayed at all.
 */
function canWordsFitIndividually(
  words: WordSegment[],
  segmentStart: number,
  segmentWidthPx: number,
  pixelsPerMs: number,
): { fits: boolean; reason?: string } {
  if (words.length === 0) {
    return { fits: false, reason: "no words" };
  }
  
  // Measure total text width of all words (as if rendered sequentially)
  let totalTextWidth = 0;
  const wordWidths: Array<{ textWidth: number; timeWidth: number; startPx: number; endPx: number }> = [];
  
  for (const word of words) {
    if (!word) continue;
    
    // Measure actual text width (with padding: 2px left + 2px right = 4px total)
    const textWidth = measureTextWidth(word.text.trim(), 9, 500) + 4;
    
    // Calculate time-based position and width
    const startPx = pixelsPerMs * (word.start - segmentStart) * 1000;
    const endPx = pixelsPerMs * (word.end - segmentStart) * 1000;
    const timeWidth = endPx - startPx;
    
    wordWidths.push({ textWidth, timeWidth, startPx, endPx });
    totalTextWidth += textWidth;
  }
  
  // Key insight: If total text width fits in segment, we can render words individually
  // even if they overlap based on their time positions
  // Use 90% threshold to account for some spacing/overlap
  if (totalTextWidth <= segmentWidthPx * 0.9) {
    // All words can fit - use positioned mode (overlaps are okay)
    return { fits: true };
  }
  
  // If total text doesn't fit, check if individual words are too narrow to be readable
  // If any word's time-based width is less than 30% of its text width, it's unreadable
  for (const { textWidth, timeWidth } of wordWidths) {
    if (timeWidth < textWidth * 0.3) {
      return { fits: false, reason: `word too narrow (${timeWidth.toFixed(1)}px < ${(textWidth * 0.3).toFixed(1)}px)` };
    }
  }
  
  // If words are readable individually but total text is too wide,
  // check if they can still fit with overlaps
  // Find the maximum right edge of all words
  const maxEndPx = Math.max(...wordWidths.map(w => w.endPx));
  
  // If the rightmost word fits within the segment, allow overlaps
  if (maxEndPx <= segmentWidthPx * 1.1) {
    return { fits: true };
  }
  
  // Words don't fit - use compact mode
  return { fits: false, reason: `words exceed segment (total text: ${totalTextWidth.toFixed(1)}px, segment: ${segmentWidthPx.toFixed(1)}px)` };
}

/**
 * Controller to ensure captions track updates reactively during playback.
 * 
 * Performance optimization: Only requests updates when the visual state actually
 * needs to change (active word/segment changed), not on every frame.
 */
class CaptionsTimeController implements ReactiveController {
  private animationFrameId?: number;
  private lastTimeMs = -1;
  private lastActiveWordIndex = -1;
  private lastActiveSegmentIndex = -1;
  // Minimum time change to trigger update when no word change (for segment boundaries)
  private static readonly MIN_TIME_CHANGE_MS = 100;
  
  constructor(private host: EFCaptionsTrack) {
    this.host.addController(this);
  }
  
  hostConnected(): void {
    this.startTimeUpdate();
  }
  
  hostDisconnected(): void {
    this.stopTimeUpdate();
  }
  
  private startTimeUpdate(): void {
    const update = () => {
      // Read current time from root timegroup
      const captions = this.host.element as EFCaptions;
      const rootTimegroup = captions.rootTimegroup;
      const currentTimeMs = rootTimegroup?.currentTimeMs || 0;
      const captionsData = captions?.unifiedCaptionsDataTask?.value;
      
      // Check if we actually need to update
      let shouldUpdate = false;
      
      if (captionsData) {
        const captionsLocalTimeMs = currentTimeMs - captions.startTimeMs;
        const captionsLocalTimeSec = captionsLocalTimeMs / 1000;
        
        // Find current active word and segment indices
        const activeWordIndex = captionsData.word_segments.findIndex(
          (word) => captionsLocalTimeSec >= word.start && captionsLocalTimeSec < word.end
        );
        const activeSegmentIndex = captionsData.segments.findIndex(
          (seg) => captionsLocalTimeSec >= seg.start && captionsLocalTimeSec < seg.end
        );
        
        // Update if active word or segment changed
        if (activeWordIndex !== this.lastActiveWordIndex) {
          this.lastActiveWordIndex = activeWordIndex;
          shouldUpdate = true;
        }
        if (activeSegmentIndex !== this.lastActiveSegmentIndex) {
          this.lastActiveSegmentIndex = activeSegmentIndex;
          shouldUpdate = true;
        }
      }
      
      // Also update if time changed significantly (for visual feedback during seek)
      const timeDelta = Math.abs(currentTimeMs - this.lastTimeMs);
      if (timeDelta >= CaptionsTimeController.MIN_TIME_CHANGE_MS) {
        shouldUpdate = true;
      }
      
      if (shouldUpdate) {
        this.lastTimeMs = currentTimeMs;
        this.host.requestUpdate();
      }
      
      this.animationFrameId = requestAnimationFrame(update);
    };
    update();
  }
  
  private stopTimeUpdate(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = undefined;
    }
  }
}

@customElement("ef-captions-track")
export class EFCaptionsTrack extends TrackItem {
  static styles = [
    ...TrackItem.styles,
    css`
      .segment-block {
        position: absolute;
        border-radius: 3px;
        transition: box-shadow 0.15s ease, z-index 0.15s ease;
        cursor: pointer;
        border: 1px solid;
        overflow: visible;
      }
      
      .segment-block:hover {
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        z-index: 5;
      }
      
      .word-element {
        position: absolute;
        font-size: 9px;
        line-height: 1.2;
        white-space: nowrap;
        font-weight: 500;
        top: 50%;
        transform: translateY(-50%);
        padding: 2px 4px;
        border-radius: 2px;
        transition: all 0.1s ease;
        background: rgb(30, 41, 59);
        color: rgb(226, 232, 240);
        z-index: 1;
      }
      
      .word-element.active {
        background: rgb(255, 255, 255);
        color: rgb(34, 197, 94);
        font-weight: 800;
        font-size: 10px;
        z-index: 10;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
      }
      
      .word-element.future {
        background: rgb(51, 65, 85);
        color: rgb(226, 232, 240);
        z-index: 5;
      }
      
      .segment-block.active .word-element:not(.active):not(.future) {
        color: rgb(203, 213, 225);
        background: rgb(30, 41, 59);
      }
      
      /* Compact text mode - when words are too small to position individually */
      .segment-block.compact-text {
        display: flex;
        align-items: center;
        padding: 0 4px;
        overflow: hidden;
        position: relative;
      }
      
      /* Allow overflow on hover for compact text */
      .segment-block.compact-text:hover {
        overflow: visible;
        z-index: 20;
      }
      
      .segment-text-compact {
        font-size: 9px;
        line-height: 1.2;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        color: rgb(226, 232, 240);
        width: 100%;
        transition: overflow 0.15s ease;
      }
      
      /* On hover, allow text to overflow horizontally */
      .segment-block.compact-text:hover .segment-text-compact {
        overflow: visible;
        text-overflow: clip;
        width: max-content;
        min-width: 100%;
        background: inherit;
        padding-right: 4px;
      }
      
      .segment-block.compact-text.active .segment-text-compact {
        color: rgb(203, 213, 225);
        font-weight: 500;
      }
      
      .segment-duration-indicator {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 2px;
        background: currentColor;
        opacity: 0.3;
        border-radius: 0 0 3px 3px;
      }
      
      .segment-block.active .segment-duration-indicator {
        opacity: 0.6;
        height: 3px;
      }
      
      .word-marker {
        position: absolute;
        bottom: 0;
        width: 1px;
        height: 30%;
        background: rgba(255, 255, 255, 0.3);
        pointer-events: none;
      }
      
      .word-marker.active {
        background: rgba(255, 255, 255, 0.8);
        height: 50%;
        width: 2px;
      }
    `,
  ];

  @consume({ context: currentTimeContext, subscribe: true })
  contextCurrentTimeMs = 0;
  
  // Controller ensures real-time updates during playback
  // The controller manages its own lifecycle via ReactiveController interface
  private _timeController = new CaptionsTimeController(this);
  
  private lastPixelsPerMs = 0;
  
  protected updated(changedProperties: Map<string | number | symbol, unknown>): void {
    super.updated(changedProperties);
    
    // Re-render when pixelsPerMs changes (zoom level changes)
    if (changedProperties.has("pixelsPerMs")) {
      const currentPixelsPerMs = this.pixelsPerMs;
      if (currentPixelsPerMs !== this.lastPixelsPerMs) {
        this.lastPixelsPerMs = currentPixelsPerMs;
        // Force update to recalculate layout mode
        this.requestUpdate();
      }
    }
  }

  render() {
    const captions = this.element as EFCaptions;
    const captionsData = captions.unifiedCaptionsDataTask.value;

    return html`<div style=${styleMap(this.gutterStyles)}>
      <div
        class="relative"
        style="background-color: var(--filmstrip-bg);"
        ?data-focused=${this.isFocused}
        @mouseenter=${() => {
          if (this.focusContext) {
            this.focusContext.focusedElement = this.element;
          }
        }}
        @mouseleave=${() => {
          if (this.focusContext) {
            this.focusContext.focusedElement = null;
          }
        }}
      >
        <div
          ?data-focused=${this.isFocused}
          class="trim-container relative mb-0 block text-nowrap border text-sm overflow-visible"
          style=${styleMap({
            ...this.trimPortionStyles,
            height: "var(--timeline-track-height, 22px)",
            backgroundColor: this.isFocused
              ? "var(--filmstrip-item-focused)"
              : "var(--filmstrip-item-bg)",
            borderColor: "var(--filmstrip-border)",
            borderLeftColor: this.getElementTypeColor(),
            borderLeftWidth: "3px",
            minHeight: "22px",
          })}
        >
          <div class="element-type-indicator" style=${styleMap({
            backgroundColor: this.getElementTypeColor(),
          })}></div>
          <div class="element-icon" style=${styleMap({
            color: this.getElementTypeColor(),
          })}>
            ${this.getElementIcon()}
          </div>
          <div class="duration-label">
            ${this.formatDuration(this.element.durationMs ?? 0)}
          </div>
          <div class="tooltip">
            ${this.getTooltipText()}
          </div>
          ${this.renderCaptionsData(captionsData)}
          ${
            this.enableTrim
              ? html`<ef-trim-handles
                element-id=${(this.element as HTMLElement).id || ""}
                pixels-per-ms=${this.pixelsPerMs}
                trim-start-ms=${this.element.trimStartMs ?? 0}
                trim-end-ms=${this.element.trimEndMs ?? 0}
                intrinsic-duration-ms=${this.element.intrinsicDurationMs ?? this.element.durationMs}
                @trim-change=${this.handleTrimChange}
              ></ef-trim-handles>`
              : nothing
          }
        </div>
      </div>
      ${this.renderChildren()}
    </div>`;
  }
  

  renderCaptionsData(captionsData: Caption | null | undefined) {
    if (!captionsData) {
      return html``;
    }

    const captions = this.element as EFCaptions;
    const rootTimegroup = captions.rootTimegroup;
    // Use context current time for reactivity, fallback to rootTimegroup
    const currentTimeMs = this.contextCurrentTimeMs || rootTimegroup?.currentTimeMs || 0;
    const captionsLocalTimeMs = currentTimeMs - captions.startTimeMs;
    const captionsLocalTimeSec = captionsLocalTimeMs / 1000;

    // Get element type color for captions
    const captionColor = "rgb(34, 197, 94)"; // Green for captions
    
    // Find active word for highlighting
    const activeWord = captionsData.word_segments.find(
      (word) =>
        captionsLocalTimeSec >= word.start &&
        captionsLocalTimeSec < word.end
    );
    
    // Render word markers for visual density indication (subtle)
    const wordMarkers = captionsData.word_segments.map((word) => {
      const wordStartPx = this.pixelsPerMs * word.start * 1000;
      const wordWidth = this.pixelsPerMs * (word.end - word.start) * 1000;
      const isActive = word === activeWord;
      
      // Only show markers if they're wide enough to be visible
      if (wordWidth < 1.5) return nothing;
      
      return html`<div
        class="word-marker ${isActive ? "active" : ""}"
        style=${styleMap({
          left: `${wordStartPx}px`,
        })}
      ></div>`;
    });

    // Render semantic segment blocks with words positioned by their actual timing
    const segmentElements = captionsData.segments.map((segment) => {
      const isActiveSegment =
        captionsLocalTimeSec >= segment.start &&
        captionsLocalTimeSec < segment.end;
      
      const segmentStartPx = this.pixelsPerMs * segment.start * 1000;
      const segmentWidth = this.pixelsPerMs * (segment.end - segment.start) * 1000;
      const segmentDuration = (segment.end - segment.start) * 1000;
      
      // Get words in this segment, sorted by start time
      const wordsInSegment = captionsData.word_segments
        .filter(
          (word) =>
            word.start >= segment.start && word.end <= segment.end
        )
        .sort((a, b) => a.start - b.start);
      
      // Calculate visual density based on word count
      const density = Math.min(wordsInSegment.length / 10, 1);
      
      // Use actual measurement to determine if words can fit individually
      // Allow overlaps - only use compact mode when words can't be rendered at all
      const measurementResult = canWordsFitIndividually(
        wordsInSegment,
        segment.start,
        segmentWidth,
        this.pixelsPerMs,
      );
      
      const useCompactText = !measurementResult.fits;
      let avgSpacing = 0;
      
      // Calculate average spacing for font scaling (only if using positioned mode)
      if (!useCompactText && wordsInSegment.length > 1) {
        let totalSpacing = 0;
        let spacingCount = 0;
        
        for (let i = 0; i < wordsInSegment.length - 1; i++) {
          const word1 = wordsInSegment[i];
          const word2 = wordsInSegment[i + 1];
          if (!word1 || !word2) continue;
          
          const word1EndPx = this.pixelsPerMs * (word1.end - segment.start) * 1000;
          const word2StartPx = this.pixelsPerMs * (word2.start - segment.start) * 1000;
          const spacing = word2StartPx - word1EndPx;
          
          if (spacing > 0) {
            totalSpacing += spacing;
            spacingCount++;
          }
        }
        
        avgSpacing = spacingCount > 0 ? totalSpacing / spacingCount : 0;
      }
      
      // Calculate optimal font size for positioned words (if not using compact mode)
      const MIN_READABLE_FONT_SIZE = 6; // Minimum readable font size in pixels
      const baseFontSize = 9;
      const activeFontSize = 10;
      let scaledFontSize = baseFontSize;
      let scaledActiveFontSize = activeFontSize;
      
      if (!useCompactText && wordsInSegment.length > 1 && avgSpacing < 8) {
        // Scale down font size proportionally, but don't go below minimum
        const scaleFactor = Math.max(MIN_READABLE_FONT_SIZE / baseFontSize, avgSpacing / 8);
        scaledFontSize = Math.max(MIN_READABLE_FONT_SIZE, baseFontSize * scaleFactor);
        scaledActiveFontSize = Math.max(MIN_READABLE_FONT_SIZE, activeFontSize * scaleFactor);
      }
      
      // Render words positioned by their actual timing within the segment
      const renderWords = () => {
        if (useCompactText) {
          // Compact mode: show text that can overflow on hover
          return html`
            <span class="segment-text-compact">${segment.text}</span>
          `;
        }
        
        // Positioned mode: render words at their time positions
        return wordsInSegment.map((word) => {
          // Position relative to segment start
          const wordOffsetFromSegmentStart = (word.start - segment.start) * 1000;
          const wordLeftPx = this.pixelsPerMs * wordOffsetFromSegmentStart;
          const wordWidthPx = this.pixelsPerMs * (word.end - word.start) * 1000;
          const isActive = word === activeWord;
          
          // Determine if word is in the future (after active word)
          const isFuture = activeWord && word.start > activeWord.end;
          
          return html`
            <span
              class="word-element ${isActive ? "active" : ""} ${isFuture ? "future" : ""}"
              style=${styleMap({
                left: `${wordLeftPx}px`,
                minWidth: `${Math.max(wordWidthPx, 8)}px`,
                fontSize: isActive ? `${scaledActiveFontSize}px` : `${scaledFontSize}px`,
                top: "50%",
              })}
              title="Word: '${word.text}' (${word.start.toFixed(2)}s - ${word.end.toFixed(2)}s)"
            >
              ${word.text.trim()}
            </span>
          `;
        });
      };
      
      return html`<div
        class="segment-block ${isActiveSegment ? "active" : ""} ${useCompactText ? "compact-text" : ""}"
        style=${styleMap({
          left: `${segmentStartPx}px`,
          width: `${Math.max(segmentWidth, 4)}px`,
          height: "100%",
          top: "0px",
          backgroundColor: isActiveSegment
            ? `rgba(34, 197, 94, ${0.3 + density * 0.2})`
            : `rgba(34, 197, 94, ${0.1 + density * 0.1})`,
          borderColor: isActiveSegment
            ? captionColor
            : `rgba(34, 197, 94, 0.4)`,
          minWidth: segmentWidth < 20 ? "20px" : "auto",
        })}
        title=${useCompactText 
          ? `Caption: '${segment.text}'\nDuration: ${this.formatDuration(segmentDuration)}\nTime: ${segment.start.toFixed(2)}s - ${segment.end.toFixed(2)}s`
          : `Caption: '${segment.text}'\nDuration: ${this.formatDuration(segmentDuration)}\nTime: ${segment.start.toFixed(2)}s - ${segment.end.toFixed(2)}s\nWords: ${wordsInSegment.length}`}
        @click=${(e: MouseEvent) => {
          e.stopPropagation();
          // Affordance: Click to seek to segment start
          if (rootTimegroup) {
            const absoluteStartTime = captions.startTimeMs + segment.start * 1000;
            rootTimegroup.currentTimeMs = absoluteStartTime;
          }
        }}
      >
        ${renderWords()}
        ${!useCompactText ? html`<div class="segment-duration-indicator"></div>` : nothing}
      </div>`;
    });

    return html`
      ${wordMarkers}
      ${segmentElements}
    `;
  }

  renderChildren(): Array<TemplateResult<1> | typeof nothing> | typeof nothing {
    // Don't render child tracks - captions are consolidated into a single track
    // Child elements (active-word, segment, before-word, after-word) are handled
    // inline within the main captions track visualization
    return nothing;
  }
}

@customElement("ef-captions-active-word-track")
export class EFCaptionsActiveWordTrack extends TrackItem {
  get captionsTrackStyles() {
    const parentCaptions = this.element.closest("ef-captions") as EFCaptions;
    return {
      position: "relative",
      left: `${this.pixelsPerMs * (parentCaptions?.startTimeWithinParentMs || 0)}px`,
      width: `${this.pixelsPerMs * (parentCaptions?.durationMs || 0)}px`,
    };
  }

  render() {
    const parentCaptions = this.element.closest("ef-captions") as EFCaptions;
    const captionsData = parentCaptions?.unifiedCaptionsDataTask.value;

    if (!captionsData) {
      return html`<div style=${styleMap(this.captionsTrackStyles)}>
        <div class="border h-[1.1rem] mb-[1px] text-xs" style="background-color: var(--filmstrip-bg); border-color: var(--filmstrip-border);">
          ${phosphorIcon(ICONS.microphone)} Active Word
        </div>
      </div>`;
    }

    const rootTimegroup = parentCaptions.rootTimegroup;
    const currentTimeMs = rootTimegroup?.currentTimeMs || 0;
    const captionsLocalTimeMs = currentTimeMs - parentCaptions.startTimeMs;
    const captionsLocalTimeSec = captionsLocalTimeMs / 1000;

    return html`<div style=${styleMap(this.captionsTrackStyles)}>
      <div class="relative border h-[1.1rem] mb-[1px] w-full" style="background-color: var(--filmstrip-bg); border-color: var(--filmstrip-border);">
        ${captionsData.word_segments.map((word) => {
          const isCurrentlyActive =
            captionsLocalTimeSec >= word.start &&
            captionsLocalTimeSec < word.end;

          return html`<div
            class="absolute border text-xs overflow-visible flex items-center ${isCurrentlyActive ? "font-bold z-[5]" : ""}"
            style=${styleMap({
              left: `${this.pixelsPerMs * word.start * 1000}px`,
              width: `${this.pixelsPerMs * (word.end - word.start) * 1000}px`,
              height: "100%",
              top: "0px",
              backgroundColor: isCurrentlyActive
                ? "var(--filmstrip-caption-bg)"
                : "var(--filmstrip-item-bg)",
              borderColor: isCurrentlyActive
                ? "var(--filmstrip-caption-border)"
                : "var(--filmstrip-border)",
            })}
            title="Word: '${word.text}' (${word.start}s - ${word.end}s)"
          >
            ${isCurrentlyActive ? html`<span class="px-0.5 text-[8px] font-bold whitespace-nowrap" style="background-color: var(--filmstrip-caption-bg);">${word.text.trim()}</span>` : ""}
          </div>`;
        })}
      </div>
    </div>`;
  }
}

@customElement("ef-captions-segment-track")
export class EFCaptionsSegmentTrack extends TrackItem {
  get captionsTrackStyles() {
    const parentCaptions = this.element.closest("ef-captions") as EFCaptions;
    return {
      position: "relative",
      left: `${this.pixelsPerMs * (parentCaptions?.startTimeWithinParentMs || 0)}px`,
      width: `${this.pixelsPerMs * (parentCaptions?.durationMs || 0)}px`,
    };
  }

  render() {
    const parentCaptions = this.element.closest("ef-captions") as EFCaptions;
    const captionsData = parentCaptions?.unifiedCaptionsDataTask.value;

    if (!captionsData) {
      return html`<div style=${styleMap(this.captionsTrackStyles)}>
        <div class="border h-[1.1rem] mb-[1px] text-xs" style="background-color: var(--filmstrip-bg); border-color: var(--filmstrip-border);">
          ${phosphorIcon(ICONS.textT)} Segment
        </div>
      </div>`;
    }

    const rootTimegroup = parentCaptions.rootTimegroup;
    const currentTimeMs = rootTimegroup?.currentTimeMs || 0;
    const captionsLocalTimeMs = currentTimeMs - parentCaptions.startTimeMs;
    const captionsLocalTimeSec = captionsLocalTimeMs / 1000;

    return html`<div style=${styleMap(this.captionsTrackStyles)}>
      <div class="relative border h-[1.1rem] mb-[1px] w-full" style="background-color: var(--filmstrip-bg); border-color: var(--filmstrip-border);">
        ${captionsData.segments.map((segment) => {
          const isCurrentlyActive =
            captionsLocalTimeSec >= segment.start &&
            captionsLocalTimeSec < segment.end;

          return html`<div
            class="absolute border text-xs overflow-visible flex items-center ${isCurrentlyActive ? "font-bold z-[5]" : ""}"
            style=${styleMap({
              left: `${this.pixelsPerMs * segment.start * 1000}px`,
              width: `${this.pixelsPerMs * (segment.end - segment.start) * 1000}px`,
              height: "100%",
              top: "0px",
              backgroundColor: isCurrentlyActive
                ? "var(--filmstrip-segment-bg)"
                : "var(--filmstrip-item-bg)",
              borderColor: isCurrentlyActive
                ? "var(--filmstrip-segment-border)"
                : "var(--filmstrip-border)",
            })}
            title="Segment: '${segment.text}' (${segment.start}s - ${segment.end}s)"
          >
            ${isCurrentlyActive ? html`<span class="px-0.5 text-[8px] font-bold whitespace-nowrap" style="background-color: var(--filmstrip-segment-bg);">${segment.text}</span>` : ""}
          </div>`;
        })}
      </div>
    </div>`;
  }
}

@customElement("ef-captions-before-word-track")
export class EFCaptionsBeforeWordTrack extends TrackItem {
  get captionsTrackStyles() {
    const parentCaptions = this.element.closest("ef-captions") as EFCaptions;
    return {
      position: "relative",
      left: `${this.pixelsPerMs * (parentCaptions?.startTimeWithinParentMs || 0)}px`,
      width: `${this.pixelsPerMs * (parentCaptions?.durationMs || 0)}px`,
    };
  }

  render() {
    const parentCaptions = this.element.closest("ef-captions") as EFCaptions;
    const captionsData = parentCaptions?.unifiedCaptionsDataTask.value;

    if (!captionsData) {
      return html`<div style=${styleMap(this.captionsTrackStyles)}>
        <div class="border h-[1.1rem] mb-[1px] text-xs" style="background-color: var(--filmstrip-bg); border-color: var(--filmstrip-border);">
          ${phosphorIcon(ICONS.arrowLeft)} Before
        </div>
      </div>`;
    }

    const rootTimegroup = parentCaptions.rootTimegroup;
    const currentTimeMs = rootTimegroup?.currentTimeMs || 0;
    const captionsLocalTimeMs = currentTimeMs - parentCaptions.startTimeMs;
    const captionsLocalTimeSec = captionsLocalTimeMs / 1000;

    return html`<div style=${styleMap(this.captionsTrackStyles)}>
      <div class="relative border h-[1.1rem] mb-[1px] w-full" style="background-color: var(--filmstrip-bg); border-color: var(--filmstrip-border);">
        ${captionsData.word_segments.map((word) => {
          const isCurrentlyActive =
            captionsLocalTimeSec >= word.start &&
            captionsLocalTimeSec < word.end;

          return html`<div
            class="absolute border text-xs overflow-visible flex items-center ${isCurrentlyActive ? "font-bold z-[5]" : ""}"
            style=${styleMap({
              left: `${this.pixelsPerMs * word.start * 1000}px`,
              width: `${this.pixelsPerMs * (word.end - word.start) * 1000}px`,
              height: "100%",
              top: "0px",
              backgroundColor: isCurrentlyActive
                ? "var(--filmstrip-caption-bg)"
                : "var(--filmstrip-waveform-bg)",
              borderColor: isCurrentlyActive
                ? "var(--filmstrip-caption-border)"
                : "var(--filmstrip-waveform-border)",
            })}
            title="Word: '${word.text}' (${word.start}s - ${word.end}s)"
          >
          </div>`;
        })}
      </div>
    </div>`;
  }
}

@customElement("ef-captions-after-word-track")
export class EFCaptionsAfterWordTrack extends TrackItem {
  get captionsTrackStyles() {
    const parentCaptions = this.element.closest("ef-captions") as EFCaptions;
    return {
      position: "relative",
      left: `${this.pixelsPerMs * (parentCaptions?.startTimeWithinParentMs || 0)}px`,
      width: `${this.pixelsPerMs * (parentCaptions?.durationMs || 0)}px`,
    };
  }

  render() {
    const parentCaptions = this.element.closest("ef-captions") as EFCaptions;
    const captionsData = parentCaptions?.unifiedCaptionsDataTask.value;

    if (!captionsData) {
      return html`<div style=${styleMap(this.captionsTrackStyles)}>
        <div class="border h-[1.1rem] mb-[1px] text-xs" style="background-color: var(--filmstrip-bg); border-color: var(--filmstrip-border);">
          ${phosphorIcon(ICONS.arrowRight)} After
        </div>
      </div>`;
    }

    const rootTimegroup = parentCaptions.rootTimegroup;
    const currentTimeMs = rootTimegroup?.currentTimeMs || 0;
    const captionsLocalTimeMs = currentTimeMs - parentCaptions.startTimeMs;
    const captionsLocalTimeSec = captionsLocalTimeMs / 1000;

    return html`<div style=${styleMap(this.captionsTrackStyles)}>
      <div class="relative border h-[1.1rem] mb-[1px] w-full" style="background-color: var(--filmstrip-bg); border-color: var(--filmstrip-border);">
        ${captionsData.word_segments.map((word) => {
          const isCurrentlyActive =
            captionsLocalTimeSec >= word.start &&
            captionsLocalTimeSec < word.end;

          return html`<div
            class="absolute border text-xs overflow-visible flex items-center ${isCurrentlyActive ? "font-bold z-[5]" : ""}"
            style=${styleMap({
              left: `${this.pixelsPerMs * word.start * 1000}px`,
              width: `${this.pixelsPerMs * (word.end - word.start) * 1000}px`,
              height: "100%",
              top: "0px",
              backgroundColor: isCurrentlyActive
                ? "var(--filmstrip-caption-bg)"
                : "var(--filmstrip-waveform-bg)",
              borderColor: isCurrentlyActive
                ? "var(--filmstrip-caption-border)"
                : "var(--filmstrip-waveform-border)",
            })}
            title="Word: '${word.text}' (${word.start}s - ${word.end}s)"
          >
          </div>`;
        })}
      </div>
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ef-captions-track": EFCaptionsTrack;
    "ef-captions-active-word-track": EFCaptionsActiveWordTrack;
    "ef-captions-segment-track": EFCaptionsSegmentTrack;
    "ef-captions-before-word-track": EFCaptionsBeforeWordTrack;
    "ef-captions-after-word-track": EFCaptionsAfterWordTrack;
  }
}

