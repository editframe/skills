#!/usr/bin/env npx tsx

/**
 * Keyframe Animation System Demo
 *
 * This script demonstrates a simple keyframe animation system that compiles
 * CSS animations from timeline data. Features include timeline management,
 * keyframe manipulation, and CSS generation for position and rotation properties.
 */

interface KeyframeValue {
  timeMs: number;
  value: number | string;
}

interface AnimationTrack {
  property: "translateX" | "translateY" | "rotate";
  keyframes: KeyframeValue[];
  unit: string;
}

interface TimeGroup {
  durationMs: number;
  element: string;
  tracks: AnimationTrack[];
}

class KeyframeAnimationSystem {
  private timeGroup: TimeGroup;

  constructor(durationMs: number, elementSelector: string) {
    this.timeGroup = {
      durationMs,
      element: elementSelector,
      tracks: [],
    };
  }

  // Add a new animation track for a property
  addTrack(
    property: "translateX" | "translateY" | "rotate",
    unit: string = "px",
  ): AnimationTrack {
    const track: AnimationTrack = {
      property,
      keyframes: [],
      unit: property === "rotate" ? "deg" : unit,
    };
    this.timeGroup.tracks.push(track);
    return track;
  }

  // Add keyframe to a specific track
  addKeyframe(track: AnimationTrack, timeMs: number, value: number): void {
    // Remove existing keyframe at same time
    track.keyframes = track.keyframes.filter((kf) => kf.timeMs !== timeMs);

    // Add new keyframe and sort by time
    track.keyframes.push({ timeMs, value: `${value}${track.unit}` });
    track.keyframes.sort((a, b) => a.timeMs - b.timeMs);
  }

  // Move keyframe to new time position (simulates dragging)
  moveKeyframe(
    track: AnimationTrack,
    oldTimeMs: number,
    newTimeMs: number,
  ): boolean {
    const keyframe = track.keyframes.find((kf) => kf.timeMs === oldTimeMs);
    if (!keyframe) return false;

    keyframe.timeMs = Math.max(
      0,
      Math.min(newTimeMs, this.timeGroup.durationMs),
    );
    track.keyframes.sort((a, b) => a.timeMs - b.timeMs);
    return true;
  }

  // Get keyframe timeline representation
  getTimelineView(): string {
    const lines: string[] = [];
    const duration = this.timeGroup.durationMs;
    const timelineWidth = 60;

    lines.push(`Timeline (${duration}ms):`);
    lines.push("─".repeat(timelineWidth + 4));

    for (const track of this.timeGroup.tracks) {
      const trackLine = Array(timelineWidth).fill("─");
      const labelPadding = 12 - track.property.length;

      // Mark keyframes on timeline
      for (const kf of track.keyframes) {
        const position = Math.round(
          (kf.timeMs / duration) * (timelineWidth - 1),
        );
        trackLine[position] = "●";
      }

      const trackDisplay = trackLine.join("");
      lines.push(
        `${track.property}${" ".repeat(labelPadding)}│${trackDisplay}│`,
      );

      // Show keyframe values below
      const valueDisplay = track.keyframes
        .map((kf) => `${kf.timeMs}ms:${kf.value}`)
        .join(", ");
      if (valueDisplay) {
        lines.push(`${" ".repeat(12)}└─ ${valueDisplay}`);
      }
      lines.push("");
    }

    return lines.join("\n");
  }

  // Compile to CSS animation string
  toCSSAnimation(animationName: string): string {
    if (this.timeGroup.tracks.length === 0) {
      return "/* No animation tracks defined */";
    }

    const css: string[] = [];
    const duration = this.timeGroup.durationMs;

    // Generate @keyframes rule
    css.push(`@keyframes ${animationName} {`);

    // Collect all unique time points
    const timePoints = new Set<number>();
    timePoints.add(0); // Always include 0%
    timePoints.add(duration); // Always include 100%

    for (const track of this.timeGroup.tracks) {
      for (const kf of track.keyframes) {
        timePoints.add(kf.timeMs);
      }
    }

    const sortedTimes = Array.from(timePoints).sort((a, b) => a - b);

    for (const timeMs of sortedTimes) {
      const percentage = Math.round((timeMs / duration) * 100);
      const transforms: string[] = [];

      // Get values for each property at this time
      for (const track of this.timeGroup.tracks) {
        const value = this.getValueAtTime(track, timeMs);

        if (track.property === "translateX") {
          transforms.push(`translateX(${value})`);
        } else if (track.property === "translateY") {
          transforms.push(`translateY(${value})`);
        } else if (track.property === "rotate") {
          transforms.push(`rotate(${value})`);
        }
      }

      if (transforms.length > 0) {
        css.push(`  ${percentage}% { transform: ${transforms.join(" ")}; }`);
      }
    }

    css.push("}");
    css.push("");
    css.push(`/* Apply animation to element */`);
    css.push(`${this.timeGroup.element} {`);
    css.push(
      `  animation: ${animationName} ${duration}ms ease-in-out infinite;`,
    );
    css.push(`}`);

    return css.join("\n");
  }

  // Get interpolated or exact value at specific time
  private getValueAtTime(track: AnimationTrack, timeMs: number): string {
    if (track.keyframes.length === 0) {
      return `0${track.unit}`;
    }

    // Find exact match
    const exact = track.keyframes.find((kf) => kf.timeMs === timeMs);
    if (exact) return exact.value.toString();

    // Find surrounding keyframes for interpolation
    let before = track.keyframes[0];
    let after = track.keyframes[track.keyframes.length - 1];

    for (let i = 0; i < track.keyframes.length - 1; i++) {
      if (
        track.keyframes[i].timeMs <= timeMs &&
        track.keyframes[i + 1].timeMs >= timeMs
      ) {
        before = track.keyframes[i];
        after = track.keyframes[i + 1];
        break;
      }
    }

    if (before === after) {
      return before.value.toString();
    }

    // Simple linear interpolation
    const beforeVal = parseFloat(before.value.toString());
    const afterVal = parseFloat(after.value.toString());
    const ratio = (timeMs - before.timeMs) / (after.timeMs - before.timeMs);
    const interpolated = beforeVal + (afterVal - beforeVal) * ratio;

    return `${Math.round(interpolated * 100) / 100}${track.unit}`;
  }

  // Get timeline data for external manipulation
  getTimeGroup(): TimeGroup {
    return { ...this.timeGroup, tracks: [...this.timeGroup.tracks] };
  }
}

async function demonstrateKeyframeSystem() {
  console.log("🎬 Keyframe Animation System Demo\n");

  // Create animation system with 3-second duration
  const animator = new KeyframeAnimationSystem(3000, ".animated-div");

  console.log("📋 Setting up animation tracks:\n");

  // Add tracks for different properties
  const translateXTrack = animator.addTrack("translateX", "px");
  const translateYTrack = animator.addTrack("translateY", "px");
  const rotateTrack = animator.addTrack("rotate", "deg");

  console.log("   ✓ Added translateX track (px)");
  console.log("   ✓ Added translateY track (px)");
  console.log("   ✓ Added rotate track (deg)\n");

  console.log("🎯 Adding keyframes to create bouncing rotation animation:\n");

  // Create a bouncing ball animation with rotation
  animator.addKeyframe(translateXTrack, 0, 0); // Start at left
  animator.addKeyframe(translateXTrack, 1000, 200); // Move right
  animator.addKeyframe(translateXTrack, 2000, 100); // Move back partial
  animator.addKeyframe(translateXTrack, 3000, 300); // End far right

  animator.addKeyframe(translateYTrack, 0, 0); // Start at top
  animator.addKeyframe(translateYTrack, 500, 50); // Drop slightly
  animator.addKeyframe(translateYTrack, 1500, -30); // Bounce up
  animator.addKeyframe(translateYTrack, 3000, 0); // Return to start

  animator.addKeyframe(rotateTrack, 0, 0); // No rotation
  animator.addKeyframe(rotateTrack, 1000, 180); // Half turn
  animator.addKeyframe(rotateTrack, 2000, 270); // Three quarters
  animator.addKeyframe(rotateTrack, 3000, 360); // Full rotation

  console.log("   ✓ translateX: 0px → 200px → 100px → 300px");
  console.log("   ✓ translateY: 0px → 50px → -30px → 0px");
  console.log("   ✓ rotate: 0deg → 180deg → 270deg → 360deg\n");

  console.log("🗓️ Timeline View:\n");
  console.log(animator.getTimelineView());

  console.log("🎭 Demonstrating keyframe manipulation:\n");

  // Simulate dragging a keyframe
  console.log("   Moving translateX keyframe from 1000ms to 1200ms...");
  const moved = animator.moveKeyframe(translateXTrack, 1000, 1200);
  console.log(`   ${moved ? "✅ Successfully moved" : "❌ Failed to move"}\n`);

  console.log("📐 Updated Timeline View:\n");
  console.log(animator.getTimelineView());

  console.log("💅 Generated CSS Animation:\n");
  const cssAnimation = animator.toCSSAnimation("bouncing-element");
  console.log(cssAnimation);
  console.log("\n");

  console.log("🔧 Usage in HTML:\n");
  console.log("   <!-- HTML Structure -->");
  console.log('   <div class="animated-div">Animated Element</div>\n');
  console.log("   <!-- Inject generated CSS -->");
  console.log("   <style>");
  console.log("   " + cssAnimation.split("\n").join("\n   "));
  console.log("   </style>\n");

  console.log("✨ System Features:");
  console.log("   • Timeline-based keyframe management");
  console.log("   • Draggable keyframes (simulated with moveKeyframe)");
  console.log("   • Multi-track property animation");
  console.log("   • Automatic CSS compilation");
  console.log("   • Linear interpolation between keyframes");
  console.log("   • Visual timeline representation\n");

  console.log("🚀 Next Steps:");
  console.log("   • Integrate with a GUI timeline editor");
  console.log("   • Add easing function support");
  console.log("   • Support for color and other CSS properties");
  console.log("   • Export/import timeline JSON");
  console.log("   • Real-time preview capability\n");
}

// Run the demo
demonstrateKeyframeSystem().catch(console.error);
