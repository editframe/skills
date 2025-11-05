interface LoadingOperation {
  id: string;
  message: string;
  startTime: number;
  timeout?: NodeJS.Timeout;
  isBackground: boolean;
}

interface LoadingOptions {
  background?: boolean;
}

export class DelayedLoadingState {
  private operations = new Map<string, LoadingOperation>();
  private loadingDelayMs: number;
  private isCurrentlyLoading = false;
  private currentMessage = "";
  private onStateChange?: (isLoading: boolean, message: string) => void;

  constructor(
    delayMs = 250,
    onStateChange?: (isLoading: boolean, message: string) => void,
  ) {
    this.loadingDelayMs = delayMs;
    this.onStateChange = onStateChange;
  }

  /**
   * Start a delayed loading operation
   */
  startLoading(
    operationId: string,
    message: string,
    options: LoadingOptions = {},
  ): void {
    const isBackground = options.background || false;

    // Clear existing timeout for this operation if it exists
    const existingOp = this.operations.get(operationId);
    if (existingOp?.timeout) {
      clearTimeout(existingOp.timeout);
    }

    // Don't create timeout for background operations
    if (isBackground) {
      this.operations.set(operationId, {
        id: operationId,
        message,
        startTime: Date.now(),
        isBackground: true,
      });
      return;
    }

    // Create timeout to show loading after delay
    const timeout = setTimeout(() => {
      // Only trigger if operation still exists and is not background
      const operation = this.operations.get(operationId);
      if (operation && !operation.isBackground) {
        this.triggerLoadingState();
      }
    }, this.loadingDelayMs);

    this.operations.set(operationId, {
      id: operationId,
      message,
      startTime: Date.now(),
      timeout,
      isBackground: false,
    });
  }

  /**
   * Clear a loading operation
   */
  clearLoading(operationId: string): void {
    const operation = this.operations.get(operationId);
    if (!operation) return;

    // Clear timeout if it exists
    if (operation.timeout) {
      clearTimeout(operation.timeout);
    }

    this.operations.delete(operationId);

    // Update loading state
    this.updateLoadingState();
  }

  /**
   * Clear all loading operations
   */
  clearAllLoading(): void {
    for (const operation of this.operations.values()) {
      if (operation.timeout) {
        clearTimeout(operation.timeout);
      }
    }
    this.operations.clear();
    this.updateLoadingState();
  }

  /**
   * Get current loading state
   */
  get isLoading(): boolean {
    return this.isCurrentlyLoading;
  }

  /**
   * Get current loading message
   */
  get message(): string {
    return this.currentMessage;
  }

  /**
   * Check if any non-background operations are active
   */
  private hasActiveOperations(): boolean {
    for (const operation of this.operations.values()) {
      if (!operation.isBackground) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get the message for the most recent non-background operation
   */
  private getCurrentMessage(): string {
    let latestTime = 0;
    let latestMessage = "";

    for (const operation of this.operations.values()) {
      if (!operation.isBackground && operation.startTime > latestTime) {
        latestTime = operation.startTime;
        latestMessage = operation.message;
      }
    }

    return latestMessage;
  }

  /**
   * Trigger loading state (called by timeout)
   */
  private triggerLoadingState(): void {
    if (this.hasActiveOperations() && !this.isCurrentlyLoading) {
      this.isCurrentlyLoading = true;
      this.currentMessage = this.getCurrentMessage();
      this.onStateChange?.(true, this.currentMessage);
    }
  }

  /**
   * Update loading state based on current operations
   */
  private updateLoadingState(): void {
    const shouldBeLoading = this.hasActiveOperations();

    if (shouldBeLoading !== this.isCurrentlyLoading) {
      this.isCurrentlyLoading = shouldBeLoading;

      if (shouldBeLoading) {
        this.currentMessage = this.getCurrentMessage();
        this.onStateChange?.(true, this.currentMessage);
      } else {
        this.currentMessage = "";
        this.onStateChange?.(false, "");
      }
    }
  }
}
