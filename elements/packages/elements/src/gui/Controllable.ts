import type { LitElement } from "lit";

import {
  isEFTemporal,
  type TemporalMixinInterface,
} from "../elements/EFTemporal.js";
import { type ContextMixinInterface, isContextMixin } from "./ContextMixin.js";
import type { PlaybackControllerUpdateEvent } from "./PlaybackController.js";

export declare class ControllableInterface extends LitElement {
  playing: boolean;
  loop: boolean;
  currentTimeMs: number;
  durationMs: number;
  play(): void | Promise<void>;
  pause(): void;
}

export function isControllable(value: any): value is ControllableInterface {
  if (!value || typeof value !== "object") {
    return false;
  }

  if (isContextMixin(value)) {
    return true;
  }

  if (isEFTemporal(value)) {
    const temporal = value as TemporalMixinInterface;
    return temporal.playbackController !== undefined;
  }

  return false;
}

export type ControllableElement =
  | ContextMixinInterface
  | (TemporalMixinInterface & {
      playbackController: NonNullable<
        TemporalMixinInterface["playbackController"]
      >;
    });

// ============================================================================
// Core Concept: Controllable Target Type
// ============================================================================
// A controllable target is either a context-providing wrapper (EFPreview)
// OR a direct temporal element with its own playback controller.
// This enumeration makes the mental model explicit.
// ============================================================================

export type ControllableTargetType = "context-provider" | "direct-temporal" | "none";

/**
 * Determines the type of controllable target for subscription purposes.
 * 
 * - "context-provider": Target is a ContextMixin (like EFPreview) that provides contexts
 * - "direct-temporal": Target is a root temporal element with its own playbackController
 * - "none": Target is not controllable (null, undefined, or nested temporal)
 */
export function determineTargetType(target: unknown): ControllableTargetType {
  if (!target) return "none";
  
  if (isContextMixin(target)) {
    return "context-provider";
  }
  
  if (isEFTemporal(target)) {
    const temporal = target as TemporalMixinInterface;
    // Only root temporal elements have playbackController
    // Nested elements delegate to their root
    if (temporal.playbackController) {
      return "direct-temporal";
    }
  }
  
  return "none";
}

// ============================================================================
// Subscription Interface
// ============================================================================
// Abstracts the mechanism of subscribing to playback state updates.
// Different target types use different mechanisms (context vs direct listener).
// ============================================================================

export interface SubscriptionCallbacks {
  onPlayingChange(value: boolean): void;
  onLoopChange(value: boolean): void;
  onCurrentTimeMsChange(value: number): void;
  onDurationMsChange(value: number): void;
  onTargetTemporalChange(value: TemporalMixinInterface | null): void;
  onFocusedElementChange?(value: HTMLElement | undefined): void;
}

export interface ControllableSubscription {
  unsubscribe(): void;
}

/**
 * Creates a subscription to a direct temporal element's playback controller.
 * Used when EFControls targets a temporal element directly (not wrapped in EFPreview).
 */
export function createDirectTemporalSubscription(
  target: TemporalMixinInterface & HTMLElement,
  callbacks: SubscriptionCallbacks,
): ControllableSubscription {
  const controller = target.playbackController!;
  
  // Initial sync - propagate current state immediately
  callbacks.onPlayingChange(controller.playing);
  callbacks.onLoopChange(controller.loop);
  callbacks.onCurrentTimeMsChange(controller.currentTimeMs);
  callbacks.onDurationMsChange(target.durationMs);
  callbacks.onTargetTemporalChange(target);
  
  // Subscribe to playback controller updates
  const listener = (event: PlaybackControllerUpdateEvent) => {
    switch (event.property) {
      case "playing":
        callbacks.onPlayingChange(event.value as boolean);
        break;
      case "loop":
        callbacks.onLoopChange(event.value as boolean);
        break;
      case "currentTimeMs":
        callbacks.onCurrentTimeMsChange(event.value as number);
        break;
    }
  };
  controller.addListener(listener);
  
  // Watch for duration changes via MutationObserver on duration-affecting attributes
  const durationObserver = new MutationObserver(() => {
    callbacks.onDurationMsChange(target.durationMs);
  });
  durationObserver.observe(target, {
    attributes: true,
    attributeFilter: ["duration", "trimstart", "trimend", "sourcein", "sourceout"],
    subtree: true,
  });
  
  // For media elements (ef-video, ef-audio), also watch for intrinsic duration changes
  // The intrinsicDurationMs comes from mediaEngineTask which loads asynchronously
  let lastKnownDuration = target.durationMs;
  let durationPollInterval: ReturnType<typeof setInterval> | null = null;
  
  // If duration is currently 0, poll until it becomes available
  // This handles the case where media hasn't loaded yet
  if (lastKnownDuration === 0) {
    durationPollInterval = setInterval(() => {
      const currentDuration = target.durationMs;
      if (currentDuration !== lastKnownDuration) {
        lastKnownDuration = currentDuration;
        callbacks.onDurationMsChange(currentDuration);
        // Once we have a non-zero duration, stop polling
        if (currentDuration > 0 && durationPollInterval) {
          clearInterval(durationPollInterval);
          durationPollInterval = null;
        }
      }
    }, 100); // Check every 100ms
  }
  
  return {
    unsubscribe: () => {
      controller.removeListener(listener);
      durationObserver.disconnect();
      if (durationPollInterval) {
        clearInterval(durationPollInterval);
      }
    },
  };
}
