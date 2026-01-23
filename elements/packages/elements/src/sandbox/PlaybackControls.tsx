import React, { useState, useEffect, useRef, useCallback } from "react";
import type { EFTimegroup } from "../elements/EFTimegroup.js";

export interface PlaybackControlsProps {
  /**
   * The timegroup element to control.
   * If null, controls are disabled.
   */
  timegroup: EFTimegroup | null;
  
  /**
   * Playback mode:
   * - "auto": Play/pause with continuous scrubbing
   * - "step": Discrete keyframe navigation
   */
  mode?: "auto" | "step";
  
  /**
   * Callback when mode changes.
   */
  onModeChange?: (mode: "auto" | "step") => void;
  
  /**
   * Keyframes for step mode (array of time values in ms).
   * If not provided, step mode divides duration into 10 equal steps.
   */
  keyframes?: number[];
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const centiseconds = Math.floor((ms % 1000) / 10);
  return `${minutes}:${seconds.toString().padStart(2, "0")}.${centiseconds.toString().padStart(2, "0")}`;
}

export function PlaybackControls({
  timegroup,
  mode = "auto",
  onModeChange,
  keyframes,
}: PlaybackControlsProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  
  const scrubberRef = useRef<HTMLDivElement>(null);
  const updateIntervalRef = useRef<number | null>(null);

  // Calculate step keyframes
  const steps = React.useMemo(() => {
    if (keyframes && keyframes.length > 0) {
      return keyframes;
    }
    // Default: 11 steps (0%, 10%, 20%, ..., 100%)
    const stepCount = 11;
    const stepSize = durationMs / (stepCount - 1);
    return Array.from({ length: stepCount }, (_, i) => i * stepSize);
  }, [keyframes, durationMs]);

  // Update duration when timegroup changes
  useEffect(() => {
    if (timegroup) {
      setDurationMs(timegroup.durationMs);
      setCurrentTimeMs(timegroup.currentTimeMs);
    } else {
      setDurationMs(0);
      setCurrentTimeMs(0);
    }
  }, [timegroup]);

  // Update current time periodically
  useEffect(() => {
    if (!timegroup) return;

    const updateTime = () => {
      if (!isDragging) {
        setCurrentTimeMs(timegroup.currentTimeMs);
        setIsPlaying(timegroup.playbackController?.playing ?? false);
      }
    };

    updateIntervalRef.current = window.setInterval(updateTime, 50);

    return () => {
      if (updateIntervalRef.current) {
        window.clearInterval(updateIntervalRef.current);
      }
    };
  }, [timegroup, isDragging]);

  // Update step index when time changes in step mode
  useEffect(() => {
    if (mode === "step" && steps.length > 0) {
      // Find closest step
      let closestIndex = 0;
      const firstStep = steps[0];
      if (firstStep !== undefined) {
        let closestDiff = Math.abs(currentTimeMs - firstStep);
        for (let i = 1; i < steps.length; i++) {
          const step = steps[i];
          if (step !== undefined) {
            const diff = Math.abs(currentTimeMs - step);
            if (diff < closestDiff) {
              closestDiff = diff;
              closestIndex = i;
            }
          }
        }
        setCurrentStepIndex(closestIndex);
      }
    }
  }, [currentTimeMs, mode, steps]);

  const handlePlayPause = useCallback(async () => {
    if (!timegroup) return;
    
    if (isPlaying) {
      timegroup.pause();
      setIsPlaying(false);
    } else {
      // Handle AudioContext for mobile devices
      if (timegroup.playbackController) {
        try {
          const audioContext = new AudioContext({ latencyHint: "playback" });
          audioContext.resume();
          timegroup.playbackController.setPendingAudioContext(audioContext);
        } catch (error) {
          console.warn("Failed to create/resume AudioContext:", error);
        }
      }
      await timegroup.play();
      setIsPlaying(true);
    }
  }, [timegroup, isPlaying]);

  const handleLoopToggle = useCallback(() => {
    if (!timegroup?.playbackController) return;
    
    const newLooping = !isLooping;
    // @ts-expect-error - loop property is read-only in types but writable at runtime
    timegroup.playbackController.loop = newLooping;
    setIsLooping(newLooping);
  }, [timegroup, isLooping]);

  const handleScrubStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!timegroup || !scrubberRef.current) return;
    
    setIsDragging(true);
    handleScrub(e);
  }, [timegroup]);

  const handleScrub = useCallback((e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    if (!timegroup || !scrubberRef.current || !isDragging) return;
    
    const scrubber = scrubberRef.current;
    if (!scrubber) return;
    
    const rect = scrubber.getBoundingClientRect();
    const touches = "touches" in e ? e.touches : null;
    const clientX = touches && touches[0] 
      ? touches[0].clientX 
      : (e as MouseEvent).clientX;
    const x = clientX - rect.left;
    const percent = Math.max(0, Math.min(1, x / rect.width));
    const targetTimeMs = percent * durationMs;
    
    timegroup.currentTime = targetTimeMs / 1000;
    setCurrentTimeMs(targetTimeMs);
  }, [timegroup, durationMs, isDragging]);

  const handleScrubEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Global mouse/touch events for scrubbing
  useEffect(() => {
    if (isDragging) {
      const handleMove = (e: MouseEvent | TouchEvent) => handleScrub(e);
      const handleUp = () => handleScrubEnd();
      
      document.addEventListener("mousemove", handleMove);
      document.addEventListener("mouseup", handleUp);
      document.addEventListener("touchmove", handleMove);
      document.addEventListener("touchend", handleUp);
      
      return () => {
        document.removeEventListener("mousemove", handleMove);
        document.removeEventListener("mouseup", handleUp);
        document.removeEventListener("touchmove", handleMove);
        document.removeEventListener("touchend", handleUp);
      };
    }
  }, [isDragging, handleScrub, handleScrubEnd]);

  const handleStepPrevious = useCallback(() => {
    if (!timegroup || steps.length === 0) return;
    
    const newIndex = Math.max(0, currentStepIndex - 1);
    const step = steps[newIndex];
    if (step !== undefined) {
      timegroup.currentTime = step / 1000;
      setCurrentStepIndex(newIndex);
      setCurrentTimeMs(step);
    }
  }, [timegroup, steps, currentStepIndex]);

  const handleStepNext = useCallback(() => {
    if (!timegroup || steps.length === 0) return;
    
    const newIndex = Math.min(steps.length - 1, currentStepIndex + 1);
    const step = steps[newIndex];
    if (step !== undefined) {
      timegroup.currentTime = step / 1000;
      setCurrentStepIndex(newIndex);
      setCurrentTimeMs(step);
    }
  }, [timegroup, steps, currentStepIndex]);

  const progress = durationMs > 0 ? (currentTimeMs / durationMs) * 100 : 0;
  const isDisabled = !timegroup;

  return (
    <div style={styles.container}>
      {/* Mode Toggle */}
      <div style={styles.modeToggle}>
        <button
          style={{
            ...styles.modeButton,
            ...(mode === "auto" ? styles.modeButtonActive : {}),
          }}
          onClick={() => onModeChange?.("auto")}
          disabled={isDisabled}
        >
          Auto
        </button>
        <button
          style={{
            ...styles.modeButton,
            ...(mode === "step" ? styles.modeButtonActive : {}),
          }}
          onClick={() => onModeChange?.("step")}
          disabled={isDisabled}
        >
          Step
        </button>
      </div>

      {/* Controls */}
      <div style={styles.controls}>
        {mode === "auto" ? (
          <>
            {/* Play/Pause */}
            <button
              style={styles.button}
              onClick={handlePlayPause}
              disabled={isDisabled}
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? "⏸" : "▶"}
            </button>

            {/* Loop */}
            <button
              style={{
                ...styles.button,
                ...(isLooping ? styles.buttonActive : {}),
              }}
              onClick={handleLoopToggle}
              disabled={isDisabled}
              title="Loop"
            >
              🔁
            </button>
          </>
        ) : (
          <>
            {/* Previous Step */}
            <button
              style={styles.button}
              onClick={handleStepPrevious}
              disabled={isDisabled || currentStepIndex === 0}
              title="Previous Step"
            >
              ⏮
            </button>

            {/* Step indicator */}
            <span style={styles.stepIndicator}>
              {currentStepIndex + 1} / {steps.length}
            </span>

            {/* Next Step */}
            <button
              style={styles.button}
              onClick={handleStepNext}
              disabled={isDisabled || currentStepIndex === steps.length - 1}
              title="Next Step"
            >
              ⏭
            </button>
          </>
        )}
      </div>

      {/* Scrubber */}
      <div style={styles.scrubberContainer}>
        <span style={styles.time}>{formatTime(currentTimeMs)}</span>
        <div
          ref={scrubberRef}
          style={{
            ...styles.scrubberTrack,
            ...(isDragging ? styles.scrubberTrackDragging : {}),
          }}
          onMouseDown={handleScrubStart}
          onTouchStart={handleScrubStart}
        >
          <div
            style={{
              ...styles.scrubberProgress,
              width: `${progress}%`,
            }}
          >
            <div style={styles.scrubberHandle} />
          </div>
        </div>
        <span style={styles.time}>{formatTime(durationMs)}</span>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    padding: "8px",
    background: "#1f2937",
    borderTop: "1px solid #374151",
  },
  modeToggle: {
    display: "flex",
    gap: "4px",
    justifyContent: "center",
  },
  modeButton: {
    padding: "4px 12px",
    fontSize: "11px",
    background: "#374151",
    border: "1px solid #4b5563",
    borderRadius: "4px",
    color: "#d1d5db",
    cursor: "pointer",
  },
  modeButtonActive: {
    background: "#3b82f6",
    borderColor: "#3b82f6",
    color: "white",
  },
  controls: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
  },
  button: {
    width: "32px",
    height: "32px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "transparent",
    border: "none",
    color: "#e5e7eb",
    fontSize: "16px",
    cursor: "pointer",
    borderRadius: "4px",
  },
  buttonActive: {
    color: "#22c55e",
  },
  stepIndicator: {
    fontSize: "12px",
    color: "#9ca3af",
    minWidth: "50px",
    textAlign: "center",
  },
  scrubberContainer: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  time: {
    fontSize: "11px",
    color: "#9ca3af",
    fontFamily: "'SF Mono', 'Monaco', 'Consolas', monospace",
    minWidth: "60px",
  },
  scrubberTrack: {
    flex: 1,
    height: "4px",
    background: "rgba(255, 255, 255, 0.2)",
    borderRadius: "2px",
    cursor: "pointer",
    position: "relative",
  },
  scrubberTrackDragging: {
    cursor: "grabbing",
  },
  scrubberProgress: {
    height: "100%",
    background: "#3b82f6",
    borderRadius: "2px",
    position: "relative",
    transition: "width 0.05s linear",
  },
  scrubberHandle: {
    position: "absolute",
    right: "-6px",
    top: "50%",
    transform: "translateY(-50%)",
    width: "12px",
    height: "12px",
    background: "white",
    borderRadius: "50%",
    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.3)",
  },
};
