import type { ElementNode, Animation } from "~/lib/motion-designer/types";

export interface AnimationMetadata {
  property: string;
  indices: number[];
  totalDuration: number;
  isMerged: boolean;
}

// Transform function mappings: property name -> transform function
const TRANSFORM_FUNCTIONS: Record<string, (value: string) => string> = {
  translateX: (v) => `translateX(${v})`,
  translateY: (v) => `translateY(${v})`,
  translateZ: (v) => `translateZ(${v})`,
  scale: (v) => `scale(${v})`,
  scaleX: (v) => `scaleX(${v})`,
  scaleY: (v) => `scaleY(${v})`,
  rotate: (v) => `rotate(${v})`,
  rotateX: (v) => `rotateX(${v})`,
  rotateY: (v) => `rotateY(${v})`,
  rotateZ: (v) => `rotateZ(${v})`,
  skew: (v) => `skew(${v})`,
  skewX: (v) => `skewX(${v})`,
  skewY: (v) => `skewY(${v})`,
};

// Helper to check if a property is a transform function (exported for use in renderer)
export function isTransformProperty(property: string): boolean {
  return property in TRANSFORM_FUNCTIONS;
}

// Helper to get the actual CSS property name (transform functions map to "transform")
function getCSSProperty(property: string): string {
  return isTransformProperty(property) ? "transform" : property;
}

export function generateAnimationStyles(
  element: ElementNode,
): string | null {
  if (element.animations.length === 0) return null;

  // Group animations by their CSS property
  const animationsByProperty = new Map<string, Array<{ anim: Animation; index: number }>>();
  element.animations.forEach((anim, index) => {
    const cssProperty = getCSSProperty(anim.property);
    const existing = animationsByProperty.get(cssProperty) || [];
    existing.push({ anim, index });
    animationsByProperty.set(cssProperty, existing);
  });

  const keyframes: string[] = [];

  for (const [cssProperty, group] of animationsByProperty) {
    if (group.length === 1) {
      // Single animation - generate normally
      const first = group[0];
      if (first) {
        keyframes.push(generateKeyframes(first.anim, element, first.index));
      }
    } else {
      // Multiple animations on same property - merge into one keyframe animation
      keyframes.push(generateMergedKeyframes(group, element, cssProperty));
    }
  }

  return keyframes.join("\n");
}

export function getAnimationMetadata(element: ElementNode): AnimationMetadata[] {
  if (element.animations.length === 0) return [];

  // Group animations by CSS property
  const animationsByProperty = new Map<string, Array<{ anim: Animation; index: number }>>();
  element.animations.forEach((anim, index) => {
    const cssProperty = getCSSProperty(anim.property);
    const existing = animationsByProperty.get(cssProperty) || [];
    existing.push({ anim, index });
    animationsByProperty.set(cssProperty, existing);
  });

  const metadata: AnimationMetadata[] = [];

  for (const [, group] of animationsByProperty) {
    if (group.length === 1) {
      const first = group[0];
      if (first) {
        metadata.push({
          property: first.anim.property,
          indices: [first.index],
          totalDuration: Math.round(first.anim.delay + first.anim.duration),
          isMerged: false,
        });
      }
    } else {
      // Merged animations
      const sorted = group.sort((a, b) => a.anim.delay - b.anim.delay);
      const first = sorted[0];
      if (first) {
        const firstStart = first.anim.delay;
        const lastEnd = Math.max(
          ...sorted.map(({ anim }) => anim.delay + anim.duration)
        );
        const totalDuration = Math.round(lastEnd - firstStart);
        metadata.push({
          property: first.anim.property,
          indices: sorted.map(({ index }) => index),
          totalDuration,
          isMerged: true,
        });
      }
    }
  }

  return metadata;
}

/**
 * Converts animation property/value to CSS property/value, adding base rotation for rotate animations.
 * This is the single place where base rotation is added to animation values.
 */
function convertToTransformIfNeeded(
  property: string, 
  value: string, 
  baseRotation: number = 0
): { prop: string; val: string } {
  // Add base rotation to rotate animation values
  let finalValue = value;
  if (property === "rotate" && baseRotation !== 0) {
    const match = value.match(/(-?\d+\.?\d*)(deg|rad)?/);
    if (match) {
      const numValue = parseFloat(match[1]);
      const unit = match[2] || "deg";
      let valueDegrees = numValue;
      if (unit === "rad") {
        valueDegrees = numValue * (180 / Math.PI);
      }
      const totalDegrees = valueDegrees + baseRotation;
      finalValue = `${totalDegrees}deg`;
    }
  }
  
  const transformFn = TRANSFORM_FUNCTIONS[property];
  if (transformFn) {
    return { prop: "transform", val: transformFn(finalValue) };
  }
  return { prop: property, val: finalValue };
}

function generateMergedKeyframes(
  group: Array<{ anim: Animation; index: number }>,
  element: ElementNode,
  cssProperty: string,
): string {
  // Sort by start time (delay)
  const sorted = group.sort((a, b) => a.anim.delay - b.anim.delay);
  const first = sorted[0];
  if (!first) {
    return "";
  }
  
  // Calculate total duration (from first animation start to last animation end)
  const firstStart = first.anim.delay;
  const lastEnd = Math.max(
    ...sorted.map(({ anim }) => anim.delay + anim.duration)
  );
  const totalDuration = lastEnd - firstStart;
  
  // Use the first animation's index for the merged animation name
  const animationName = `animation-${element.id}-${first.index}`;
  
  // Get base rotation for rotate animations
  const baseRotation = element.props.rotation ?? 0;
  
  // Collect all keyframe points across all animations
  const keyframePoints: Array<{ timeMs: number; value: string; property: string }> = [];
  
  for (const { anim } of sorted) {
    const animStart = anim.delay;
    const animEnd = anim.delay + anim.duration;
    
    // Get keyframe values for this animation
    if (anim.fromValue !== undefined && anim.toValue !== undefined) {
      // Simple from/to animation - base rotation added in convertToTransformIfNeeded
      const from = convertToTransformIfNeeded(anim.property, anim.fromValue, baseRotation);
      const to = convertToTransformIfNeeded(anim.property, anim.toValue, baseRotation);
      
      keyframePoints.push({
        timeMs: animStart,
        value: from.val,
        property: from.prop,
      });
      keyframePoints.push({
        timeMs: animEnd,
        value: to.val,
        property: to.prop,
      });
    } else if (anim.keyframes && anim.keyframes.length > 0) {
      // Complex keyframes animation - base rotation added in convertToTransformIfNeeded
      for (const kf of anim.keyframes) {
        const timeMs = animStart + (kf.time * anim.duration);
        const converted = convertToTransformIfNeeded(anim.property, kf.value, baseRotation);
        keyframePoints.push({
          timeMs,
          value: converted.val,
          property: converted.prop,
        });
      }
    } else {
      // Fallback: use fromValue or toValue or default - base rotation added in convertToTransformIfNeeded
      const value = anim.fromValue || anim.toValue || "0";
      const converted = convertToTransformIfNeeded(anim.property, value, baseRotation);
      keyframePoints.push({
        timeMs: animStart,
        value: converted.val,
        property: converted.prop,
      });
      keyframePoints.push({
        timeMs: animEnd,
        value: converted.val,
        property: converted.prop,
      });
    }
  }
  
  // For transform properties, we need to combine multiple transform functions
  if (cssProperty === "transform") {
    // Collect all unique time points
    const timePoints = new Set<number>();
    for (const point of keyframePoints) {
      timePoints.add(point.timeMs);
    }
    
    // Also add points at animation boundaries to ensure smooth transitions
    for (const { anim } of sorted) {
      timePoints.add(anim.delay);
      timePoints.add(anim.delay + anim.duration);
    }
    
    const sortedTimePoints = Array.from(timePoints).sort((a, b) => a - b);
    
    // Use actual first and last time points for percentage calculation
    const actualFirstStart = sortedTimePoints[0] ?? firstStart;
    const actualLastEnd = sortedTimePoints[sortedTimePoints.length - 1] ?? lastEnd;
    const actualTotalDuration = actualLastEnd - actualFirstStart;
    
    // For each time point, collect all active transform functions and determine easing
    const keyframeRules = sortedTimePoints.map((timeMs, index) => {
      // Force first keyframe to 0% and last to 100% for proper fill mode support
      let percent: number;
      if (index === 0) {
        percent = 0;
      } else if (index === sortedTimePoints.length - 1) {
        percent = 100;
      } else {
        percent = actualTotalDuration > 0 
          ? ((timeMs - actualFirstStart) / actualTotalDuration) * 100 
          : 0;
      }
      // Use Map to deduplicate transform properties - later animations override earlier ones
      const transformMap = new Map<string, string>();
      let controllingAnim: Animation | undefined;
      
      // First pass: collect fill mode values (backwards/forwards)
      for (const { anim } of sorted) {
        const animStart = anim.delay;
        const animEnd = anim.delay + anim.duration;
        
        if (timeMs < animStart && (anim.fillMode === "backwards" || anim.fillMode === "both")) {
          const fromValue = anim.fromValue || "0";
          const converted = convertToTransformIfNeeded(anim.property, fromValue, baseRotation);
          if (converted.prop === "transform") {
            // converted.val already has the transform function applied (e.g., "rotate(45deg)")
            transformMap.set(anim.property, converted.val);
          }
          if (!controllingAnim) {
            controllingAnim = anim;
          }
        } else if (timeMs > animEnd && (anim.fillMode === "forwards" || anim.fillMode === "both")) {
          const toValue = anim.toValue || "1";
          const converted = convertToTransformIfNeeded(anim.property, toValue, baseRotation);
          if (converted.prop === "transform") {
            // converted.val already has the transform function applied (e.g., "rotate(90deg)")
            transformMap.set(anim.property, converted.val);
          }
          if (!controllingAnim) {
            controllingAnim = anim;
          }
        }
      }
      
      // Second pass: collect active animation values (these override fill mode values)
      for (const { anim } of sorted) {
        const animStart = anim.delay;
        const animEnd = anim.delay + anim.duration;
        
        if (timeMs >= animStart && timeMs <= animEnd) {
          // Calculate progress within this animation
          const progress = anim.duration > 0 
            ? (timeMs - animStart) / anim.duration 
            : 0;
          
          // Get the value at this progress
          let value: string;
          if (anim.fromValue !== undefined && anim.toValue !== undefined) {
            const from = anim.fromValue;
            const to = anim.toValue;
            const fromNum = parseFloat(from);
            const toNum = parseFloat(to);
            if (!isNaN(fromNum) && !isNaN(toNum)) {
              const interpolated = fromNum + (toNum - fromNum) * progress;
              const unit = to.replace(/[0-9.-]/g, "") || from.replace(/[0-9.-]/g, "");
              value = `${interpolated}${unit}`;
            } else {
              value = progress < 0.5 ? from : to;
            }
            // Base rotation will be added in convertToTransformIfNeeded below
          } else if (anim.keyframes && anim.keyframes.length > 0) {
            const kfIndex = anim.keyframes.findIndex(
              (kf, idx) => {
                const nextKf = anim.keyframes[idx + 1];
                const kfTime = kf.time * anim.duration;
                const nextTime = nextKf ? nextKf.time * anim.duration : anim.duration;
                return progress * anim.duration >= kfTime && progress * anim.duration < nextTime;
              }
            );
            if (kfIndex >= 0) {
              const kf = anim.keyframes[kfIndex];
              const nextKf = anim.keyframes[kfIndex + 1];
              if (nextKf) {
                const kfTime = kf.time;
                const nextTime = nextKf.time;
                const segmentProgress = (progress - kfTime) / (nextTime - kfTime);
                const fromNum = parseFloat(kf.value);
                const toNum = parseFloat(nextKf.value);
                if (!isNaN(fromNum) && !isNaN(toNum)) {
                  const interpolated = fromNum + (toNum - fromNum) * segmentProgress;
                  const unit = nextKf.value.replace(/[0-9.-]/g, "") || kf.value.replace(/[0-9.-]/g, "");
                  value = `${interpolated}${unit}`;
                } else {
                  value = segmentProgress < 0.5 ? kf.value : nextKf.value;
                }
              } else {
                value = kf.value;
              }
            } else {
              value = anim.keyframes[anim.keyframes.length - 1]?.value || "0";
            }
            // Base rotation will be added in convertToTransformIfNeeded below
          } else {
            value = anim.fromValue || anim.toValue || "0";
            // Base rotation will be added in convertToTransformIfNeeded below
          }
          
          // Convert to transform and add base rotation if needed
          const converted = convertToTransformIfNeeded(anim.property, value, baseRotation);
          if (converted.prop === "transform") {
            // Active animations override fill mode values for the same property
            transformMap.set(anim.property, converted.val);
          }
          if (!controllingAnim) {
            controllingAnim = anim;
          }
        }
      }
      
      // Convert map to array
      const transforms = Array.from(transformMap.values());
      
      // Determine easing for the segment AFTER this keyframe
      let easing: string | undefined;
      if (index < sortedTimePoints.length - 1) {
        const nextTimeMs = sortedTimePoints[index + 1];
        // Find which animation controls the segment from this keyframe to the next
        const segmentAnim = sorted.find(({ anim }) => {
          const start = Math.round(anim.delay);
          const end = Math.round(anim.delay + anim.duration);
          // Animation controls this segment if it's active at the start of the segment
          return timeMs >= start && timeMs < end;
        });
        if (segmentAnim) {
          easing = segmentAnim.anim.easing || "ease";
        } else {
          // Check if next keyframe is the start of a new animation
          const nextAnim = sorted.find(({ anim }) => Math.round(anim.delay) === Math.round(nextTimeMs));
          if (nextAnim) {
            easing = nextAnim.anim.easing || "ease";
          }
        }
      }
      
      const transformValue = transforms.length > 0 ? transforms.join(" ") : "none";
      const easingRule = easing ? ` animation-timing-function: ${easing};` : "";
      const percentStr = percent === 0 ? "0" : percent === 100 ? "100" : percent.toFixed(2);
      return `  ${percentStr}% { transform: ${transformValue};${easingRule} }`;
    }).join("\n");
    
    return `@keyframes ${animationName} {\n${keyframeRules}\n}`;
  }
  
  // For non-transform properties, merge keyframes by time
  // Collect all time points including animation boundaries
  const timePoints = new Set<number>();
  for (const point of keyframePoints) {
    timePoints.add(Math.round(point.timeMs));
  }
  // Add animation boundaries (rounded to avoid floating point issues)
  for (const { anim } of sorted) {
    timePoints.add(Math.round(anim.delay));
    timePoints.add(Math.round(anim.delay + anim.duration));
  }
  
  const sortedTimePoints = Array.from(timePoints).sort((a, b) => a - b);
  
  // Use rounded first and last time points for percentage calculation to match rounded time points
  const roundedFirstStart = sortedTimePoints[0] ?? Math.round(firstStart);
  const roundedLastEnd = sortedTimePoints[sortedTimePoints.length - 1] ?? Math.round(lastEnd);
  const roundedTotalDuration = roundedLastEnd - roundedFirstStart;
  
  // For each time point, determine the value and easing
  const keyframeRules = sortedTimePoints.map((timeMs, index) => {
    // Force first keyframe to 0% and last to 100% for proper fill mode support
    let percent: number;
    if (index === 0) {
      percent = 0;
    } else if (index === sortedTimePoints.length - 1) {
      percent = 100;
    } else {
      percent = roundedTotalDuration > 0 
        ? ((timeMs - roundedFirstStart) / roundedTotalDuration) * 100 
        : 0;
    }
    
    // Find the value at this time point and which animation controls it
    let value: string | undefined;
    let easing: string | undefined;
    let controllingAnim: Animation | undefined;
    
    // Check if this time point is within any animation
    // Process animations in reverse order so later animations take precedence
    for (let i = sorted.length - 1; i >= 0; i--) {
      const { anim } = sorted[i];
      const animStart = Math.round(anim.delay);
      const animEnd = Math.round(anim.delay + anim.duration);
      
      // Check exact boundaries first
      if (timeMs === animEnd) {
        // At exact end time, use toValue (or last keyframe value)
        if (anim.toValue !== undefined) {
          value = anim.toValue;
        } else if (anim.keyframes && anim.keyframes.length > 0) {
          value = anim.keyframes[anim.keyframes.length - 1]?.value;
        } else if (anim.fromValue !== undefined) {
          value = anim.fromValue;
        } else {
          value = "0";
        }
        controllingAnim = anim;
        break;
      } else if (timeMs === animStart) {
        // At exact start time, use fromValue (or first keyframe value)
        if (anim.fromValue !== undefined) {
          value = anim.fromValue;
        } else if (anim.keyframes && anim.keyframes.length > 0) {
          value = anim.keyframes[0]?.value;
        } else if (anim.toValue !== undefined) {
          value = anim.toValue;
        } else {
          value = "0";
        }
        controllingAnim = anim;
        break;
      } else if (timeMs > animStart && timeMs < animEnd) {
        // Within animation, calculate progress
        const originalStart = anim.delay;
        const progress = anim.duration > 0 
          ? (timeMs - originalStart) / anim.duration 
          : 0;
        
        // Get value at this progress
        if (anim.fromValue !== undefined && anim.toValue !== undefined) {
          const fromNum = parseFloat(anim.fromValue);
          const toNum = parseFloat(anim.toValue);
          if (!isNaN(fromNum) && !isNaN(toNum)) {
            const interpolated = fromNum + (toNum - fromNum) * progress;
            const unit = anim.toValue.replace(/[0-9.-]/g, "") || anim.fromValue.replace(/[0-9.-]/g, "");
            value = `${interpolated}${unit}`;
          } else {
            value = progress < 0.5 ? anim.fromValue : anim.toValue;
          }
        } else if (anim.keyframes && anim.keyframes.length > 0) {
          const kfIndex = anim.keyframes.findIndex(
            (kf, idx) => {
              const nextKf = anim.keyframes[idx + 1];
              const kfTime = kf.time;
              const nextTime = nextKf ? nextKf.time : 1;
              return progress >= kfTime && progress < nextTime;
            }
          );
          if (kfIndex >= 0) {
            const kf = anim.keyframes[kfIndex];
            const nextKf = anim.keyframes[kfIndex + 1];
            if (nextKf) {
              const kfTime = kf.time;
              const nextTime = nextKf.time;
              const segmentProgress = (progress - kfTime) / (nextTime - kfTime);
              const fromNum = parseFloat(kf.value);
              const toNum = parseFloat(nextKf.value);
              if (!isNaN(fromNum) && !isNaN(toNum)) {
                const interpolated = fromNum + (toNum - fromNum) * segmentProgress;
                const unit = nextKf.value.replace(/[0-9.-]/g, "") || kf.value.replace(/[0-9.-]/g, "");
                value = `${interpolated}${unit}`;
              } else {
                value = segmentProgress < 0.5 ? kf.value : nextKf.value;
              }
            } else {
              value = kf.value;
            }
          } else {
            value = anim.keyframes[anim.keyframes.length - 1]?.value || "0";
          }
        } else {
          value = anim.fromValue || anim.toValue || "0";
        }
        controllingAnim = anim;
        break;
      } else if (timeMs < animStart && (anim.fillMode === "backwards" || anim.fillMode === "both")) {
        value = anim.fromValue || "0";
        controllingAnim = anim;
      } else if (timeMs > animEnd && (anim.fillMode === "forwards" || anim.fillMode === "both")) {
        value = anim.toValue || "1";
        controllingAnim = anim;
      }
    }
    
    // Fallback value logic
    if (value === undefined) {
      const previousAnim = sorted
        .filter(({ anim }) => anim.delay + anim.duration <= timeMs)
        .pop();
      if (previousAnim) {
        if (previousAnim.anim.fillMode === "forwards" || previousAnim.anim.fillMode === "both") {
          value = previousAnim.anim.toValue;
          if (value === undefined && previousAnim.anim.keyframes && previousAnim.anim.keyframes.length > 0) {
            value = previousAnim.anim.keyframes[previousAnim.anim.keyframes.length - 1]?.value;
          }
          if (value === undefined) {
            value = previousAnim.anim.fromValue || "0";
          }
          controllingAnim = previousAnim.anim;
        } else {
          const nextAnim = sorted.find(({ anim }) => anim.delay > timeMs);
          if (nextAnim && (nextAnim.anim.fillMode === "backwards" || nextAnim.anim.fillMode === "both")) {
            value = nextAnim.anim.fromValue || "0";
            controllingAnim = nextAnim.anim;
          } else {
            value = sorted[0].anim.fromValue || "0";
            controllingAnim = sorted[0].anim;
          }
        }
      } else {
        const nextAnim = sorted.find(({ anim }) => anim.delay >= timeMs);
        if (nextAnim && (nextAnim.anim.fillMode === "backwards" || nextAnim.anim.fillMode === "both")) {
          value = nextAnim.anim.fromValue || "0";
          controllingAnim = nextAnim.anim;
        } else {
          value = sorted[0].anim.fromValue || "0";
          controllingAnim = sorted[0].anim;
        }
      }
    }
    
    // Determine easing for the segment AFTER this keyframe
    // The easing applies to the segment from this keyframe to the next
    if (index < sortedTimePoints.length - 1) {
      const nextTimeMs = sortedTimePoints[index + 1];
      // Find which animation controls the segment from this keyframe to the next
      const segmentAnim = sorted.find(({ anim }) => {
        const start = Math.round(anim.delay);
        const end = Math.round(anim.delay + anim.duration);
        // Animation controls this segment if it's active at the start of the segment
        return timeMs >= start && timeMs < end;
      });
      if (segmentAnim) {
        easing = segmentAnim.anim.easing || "ease";
      } else {
        // Check if next keyframe is the start of a new animation
        const nextAnim = sorted.find(({ anim }) => Math.round(anim.delay) === Math.round(nextTimeMs));
        if (nextAnim) {
          easing = nextAnim.anim.easing || "ease";
        }
      }
    }
    
    // Build keyframe rule with optional easing
    const easingRule = easing ? ` animation-timing-function: ${easing};` : "";
    const percentStr = percent === 0 ? "0" : percent === 100 ? "100" : percent.toFixed(2);
    return `  ${percentStr}% { ${cssProperty}: ${value};${easingRule} }`;
  }).join("\n");
  
  return `@keyframes ${animationName} {\n${keyframeRules}\n}`;
}

function generateKeyframes(
  animation: ElementNode["animations"][0],
  element: ElementNode,
  index: number,
): string {
  const animationName = `animation-${element.id}-${index}`;
  
  // Get base rotation for rotate animations
  const baseRotation = animation.property === "rotate" ? (element.props.rotation ?? 0) : 0;
  
  let keyframeRules: string;
  
  // If fromValue/toValue are specified, use simple 0-100% animation
  if (animation.fromValue !== undefined && animation.toValue !== undefined) {
    // Base rotation added in convertToTransformIfNeeded
    const from = convertToTransformIfNeeded(animation.property, animation.fromValue, baseRotation);
    const to = convertToTransformIfNeeded(animation.property, animation.toValue, baseRotation);
    keyframeRules = `  0% { ${from.prop}: ${from.val}; }\n  100% { ${to.prop}: ${to.val}; }`;
  } 
  // Otherwise use the keyframes array for complex animations
  else if (animation.keyframes && animation.keyframes.length > 0) {
    keyframeRules = animation.keyframes
      .map((kf) => {
        const percent = Math.round(kf.time * 100);
        // Base rotation added in convertToTransformIfNeeded
        const converted = convertToTransformIfNeeded(animation.property, kf.value, baseRotation);
        return `  ${percent}% { ${converted.prop}: ${converted.val}; }`;
      })
      .join("\n");
  }
  // Fallback: if neither are specified, create a simple 0-100% with same value
  else {
    const value = animation.fromValue || animation.toValue || "0";
    // Base rotation added in convertToTransformIfNeeded
    const converted = convertToTransformIfNeeded(animation.property, value, baseRotation);
    keyframeRules = `  0% { ${converted.prop}: ${converted.val}; }\n  100% { ${converted.prop}: ${converted.val}; }`;
  }

  return `@keyframes ${animationName} {\n${keyframeRules}\n}`;
}

