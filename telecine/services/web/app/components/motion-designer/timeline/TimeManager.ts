export class TimeManager {
  private activeTimegroupId: string | null = null;
  private timegroupElement: any = null;
  private animationFrameId: number | null = null;
  private lastReadTime = 0;
  private currentTimeRef = 0;
  private isScrubbing = false;
  private listeners: Set<(time: number) => void> = new Set();
  private durationRef = 5000;
  private lastReadDuration = 5000;
  private durationListeners: Set<(duration: number) => void> = new Set();

  setActiveTimegroup(timegroupId: string | null): void {
    this.stopPolling();
    this.activeTimegroupId = timegroupId;
    if (timegroupId) {
      this.timegroupElement = document.getElementById(timegroupId);
      // Initialize duration from DOM element
      if (this.timegroupElement) {
        const initialDuration = this.timegroupElement.durationMs || 5000;
        this.durationRef = initialDuration;
        this.lastReadDuration = initialDuration;
      }
      this.startPolling();
    } else {
      this.timegroupElement = null;
    }
  }

  setCurrentTime(time: number): void {
    this.currentTimeRef = time;
    this.notifyListeners(time);
  }

  setIsScrubbing(scrubbing: boolean): void {
    this.isScrubbing = scrubbing;
  }

  subscribe(listener: (time: number) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  subscribeDuration(listener: (duration: number) => void): () => void {
    this.durationListeners.add(listener);
    return () => {
      this.durationListeners.delete(listener);
    };
  }

  getCurrentTime(): number {
    return this.currentTimeRef;
  }

  getDuration(): number {
    if (!this.timegroupElement) return this.durationRef;
    // Always read from DOM element getter (single source of truth)
    return this.timegroupElement.durationMs || this.durationRef;
  }

  seek(timeMs: number): void {
    if (!this.timegroupElement) return;
    if (this.timegroupElement.playbackController?.playing) {
      this.timegroupElement.playbackController.pause();
    }
    this.timegroupElement.seek(timeMs);
    this.setCurrentTime(timeMs);
  }

  private startPolling(): void {
    if (!this.timegroupElement) return;

    const pollCurrentTime = () => {
      if (!this.timegroupElement) return;

      if (this.isScrubbing) {
        this.animationFrameId = requestAnimationFrame(pollCurrentTime);
        return;
      }

      const currentTimeMs = this.timegroupElement.currentTimeMs || 0;

      if (Math.abs(currentTimeMs - this.lastReadTime) > 16) {
        this.lastReadTime = currentTimeMs;
        if (Math.abs(currentTimeMs - this.currentTimeRef) > 16) {
          this.setCurrentTime(currentTimeMs);
        }
      }

      // Poll duration once per RAF cycle
      const durationMs = this.timegroupElement.durationMs || 5000;
      if (Math.abs(durationMs - this.lastReadDuration) > 1) {
        this.lastReadDuration = durationMs;
        this.durationRef = durationMs;
        this.notifyDurationListeners(durationMs);
      }

      this.animationFrameId = requestAnimationFrame(pollCurrentTime);
    };

    this.animationFrameId = requestAnimationFrame(pollCurrentTime);
  }

  private stopPolling(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private notifyListeners(time: number): void {
    this.listeners.forEach((listener) => listener(time));
  }

  private notifyDurationListeners(duration: number): void {
    this.durationListeners.forEach((listener) => listener(duration));
  }

  cleanup(): void {
    this.stopPolling();
    this.listeners.clear();
    this.durationListeners.clear();
    this.activeTimegroupId = null;
    this.timegroupElement = null;
  }
}

