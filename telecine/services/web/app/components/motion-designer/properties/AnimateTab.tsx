import React, { useEffect, useRef } from "react";
import type { ElementNode, Animation } from "~/lib/motion-designer/types";
import { useMotionDesignerActions } from "../context/MotionDesignerContext";

interface AnimateTabProps {
  element: ElementNode;
  selectedAnimationId: string | null;
}

function getPlaceholder(property: string, direction: "from" | "to"): string {
  const placeholders: Record<string, { from: string; to: string }> = {
    opacity: { from: "0", to: "1" },
    scale: { from: "0.5", to: "1.5" },
    scaleX: { from: "0.5", to: "1.5" },
    scaleY: { from: "0.5", to: "1.5" },
    rotate: { from: "0deg", to: "360deg" },
    rotateX: { from: "0deg", to: "180deg" },
    rotateY: { from: "0deg", to: "180deg" },
    rotateZ: { from: "0deg", to: "360deg" },
    translateX: { from: "0px", to: "100px" },
    translateY: { from: "0px", to: "100px" },
    translateZ: { from: "0px", to: "50px" },
    skewX: { from: "0deg", to: "15deg" },
    skewY: { from: "0deg", to: "15deg" },
    transform: { from: "scale(1)", to: "scale(1.5)" },
  };

  return placeholders[property]?.[direction] || (direction === "from" ? "0" : "1");
}

export function AnimateTab({ element, selectedAnimationId }: AnimateTabProps) {
  const actions = useMotionDesignerActions();
  const animationRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Scroll to selected animation when it changes
  useEffect(() => {
    if (selectedAnimationId && animationRefs.current[selectedAnimationId]) {
      animationRefs.current[selectedAnimationId]?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [selectedAnimationId]);

  const handleAddAnimation = () => {
    actions.addAnimation(element.id, {
      name: "Fade In",
      property: "opacity",
      fromValue: "0",
      toValue: "1",
      duration: 1000,
      delay: 0,
      easing: "ease",
      fillMode: "both",
    });
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Animations</h3>
        <button
          onClick={handleAddAnimation}
          className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 rounded"
        >
          Add Animation
        </button>
      </div>

      {element.animations.length === 0 ? (
        <p className="text-xs text-gray-500">No animations yet</p>
      ) : (
        <div className="space-y-2">
          {element.animations.map((animation) => (
            <div
              key={animation.id}
              ref={(el) => { animationRefs.current[animation.id] = el; }}
              className={`p-2 bg-gray-700 rounded border ${selectedAnimationId === animation.id ? 'border-blue-500 ring-2 ring-blue-500/50' : 'border-gray-600'}`}
            >
              <div className="flex items-center justify-between mb-2">
                <input
                  type="text"
                  value={animation.name}
                  onChange={(e) =>
                    actions.updateAnimation(element.id, animation.id, {
                      name: e.target.value,
                    })
                  }
                  className="flex-1 px-2 py-1 text-xs bg-gray-600 rounded"
                />
                <button
                  onClick={() =>
                    actions.deleteAnimation(element.id, animation.id)
                  }
                  className="ml-2 px-2 py-1 text-xs bg-red-600 hover:bg-red-700 rounded"
                >
                  Delete
                </button>
              </div>
              <div className="space-y-2">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">
                    Property
                  </label>
                  <select
                    value={animation.property}
                    onChange={(e) =>
                      actions.updateAnimation(element.id, animation.id, {
                        property: e.target.value,
                      })
                    }
                    className="w-full px-2 py-1 text-xs bg-gray-600 rounded"
                  >
                    <option value="opacity">Opacity</option>
                    <optgroup label="Transform Functions">
                      <option value="translateX">Translate X</option>
                      <option value="translateY">Translate Y</option>
                      <option value="translateZ">Translate Z</option>
                      <option value="scale">Scale (uniform)</option>
                      <option value="scaleX">Scale X</option>
                      <option value="scaleY">Scale Y</option>
                      <option value="rotate">Rotate (2D)</option>
                      <option value="rotateX">Rotate X (3D)</option>
                      <option value="rotateY">Rotate Y (3D)</option>
                      <option value="rotateZ">Rotate Z (3D)</option>
                      <option value="skewX">Skew X</option>
                      <option value="skewY">Skew Y</option>
                    </optgroup>
                    <option value="transform">Transform (raw CSS)</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">
                      From Value
                    </label>
                    <input
                      type="text"
                      value={animation.fromValue || ""}
                      onChange={(e) =>
                        actions.updateAnimation(element.id, animation.id, {
                          fromValue: e.target.value,
                        })
                      }
                      placeholder={getPlaceholder(animation.property, "from")}
                      className="w-full px-2 py-1 text-xs bg-gray-600 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">
                      To Value
                    </label>
                    <input
                      type="text"
                      value={animation.toValue || ""}
                      onChange={(e) =>
                        actions.updateAnimation(element.id, animation.id, {
                          toValue: e.target.value,
                        })
                      }
                      placeholder={getPlaceholder(animation.property, "to")}
                      className="w-full px-2 py-1 text-xs bg-gray-600 rounded"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">
                    Fill Mode
                  </label>
                  <select
                    value={animation.fillMode || "none"}
                    onChange={(e) =>
                      actions.updateAnimation(element.id, animation.id, {
                        fillMode: e.target.value as Animation["fillMode"],
                      })
                    }
                    className="w-full px-2 py-1 text-xs bg-gray-600 rounded"
                  >
                    <option value="none">None (no hold)</option>
                    <option value="forwards">Forwards (hold end state)</option>
                    <option value="backwards">Backwards (hold start state)</option>
                    <option value="both">Both (hold start & end)</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {animation.fillMode === "backwards" && "Holds start value during delay"}
                    {animation.fillMode === "forwards" && "Holds end value after animation"}
                    {animation.fillMode === "both" && "Holds start during delay, end after"}
                    {animation.fillMode === "none" && "Returns to default state"}
                  </p>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">
                    Duration (ms)
                  </label>
                  <input
                    type="number"
                    value={animation.duration}
                    onChange={(e) =>
                      actions.updateAnimation(element.id, animation.id, {
                        duration: Number(e.target.value),
                      })
                    }
                    className="w-full px-2 py-1 text-xs bg-gray-600 rounded"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">
                    Delay (ms)
                  </label>
                  <input
                    type="number"
                    value={animation.delay}
                    onChange={(e) =>
                      actions.updateAnimation(element.id, animation.id, {
                        delay: Number(e.target.value),
                      })
                    }
                    className="w-full px-2 py-1 text-xs bg-gray-600 rounded"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">
                    Easing
                  </label>
                  <select
                    value={animation.easing}
                    onChange={(e) =>
                      actions.updateAnimation(element.id, animation.id, {
                        easing: e.target.value,
                      })
                    }
                    className="w-full px-2 py-1 text-xs bg-gray-600 rounded"
                  >
                    <option value="linear">Linear</option>
                    <option value="ease">Ease</option>
                    <option value="ease-in">Ease In</option>
                    <option value="ease-out">Ease Out</option>
                    <option value="ease-in-out">Ease In-Out</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
