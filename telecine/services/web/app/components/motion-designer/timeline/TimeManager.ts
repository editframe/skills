export class TimeManager {
  private activeTimegroupId: string | null = null;
  private timegroupElement: any = null;
  private animationFrameId: number | null = null;
  private lastReadTime = 0;
  private currentTimeRef = 0;
  private isScrubbing = false;
  private listeners: Set<(time: number) => void> = new Set();

  setActiveTimegroup(timegroupId: string | null): void {
    this.stopPolling();
    this.activeTimegroupId = timegroupId;
    if (timegroupId) {
      this.timegroupElement = document.getElementById(timegroupId);
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

  getCurrentTime(): number {
    return this.currentTimeRef;
  }

  getDuration(): number {
    if (!this.timegroupElement) return 5000;
    return this.timegroupElement.durationMs || 5000;
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

  cleanup(): void {
    this.stopPolling();
    this.listeners.clear();
    this.activeTimegroupId = null;
    this.timegroupElement = null;
  }
}

