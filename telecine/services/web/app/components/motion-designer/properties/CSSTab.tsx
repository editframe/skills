import React, { useState } from "react";
import type { ElementNode } from "~/lib/motion-designer/types";
import { generateAnimationStyles } from "../animations/generateStyles";
import { generateAnimationStyle } from "../rendering/styleGenerators/animationStyles";

interface CSSTabProps {
  element: ElementNode;
}

export function CSSTab({ element }: CSSTabProps) {
  const [copied, setCopied] = useState(false);

  const keyframesCSS = generateAnimationStyles(element);
  const animationStyle = generateAnimationStyle(element);

  const formatCSS = (): string => {
    if (!keyframesCSS && Object.keys(animationStyle).length === 0) {
      return "";
    }

    const parts: string[] = [];

    if (keyframesCSS) {
      parts.push(keyframesCSS);
    }

    if (animationStyle.animation) {
      const selector = `[data-element-id="${element.id}"]`;
      const animationProperty = `animation: ${animationStyle.animation};`;
      const properties = [animationProperty, `animation-play-state: paused;`];

      parts.push(`${selector} {\n  ${properties.join("\n  ")}\n}`);
    }

    return parts.join("\n\n");
  };

  const css = formatCSS();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(css);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy to clipboard", error);
    }
  };

  if (!css) {
    return (
      <div className="p-4">
        <p className="text-xs text-gray-500">No animations on this element</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-gray-700/30">
        <h3 className="text-sm font-medium">Generated CSS</h3>
        <button
          onClick={handleCopy}
          className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 rounded transition-colors flex items-center gap-1"
        >
          {copied ? (
            <>
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Copied
            </>
          ) : (
            <>
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              Copy
            </>
          )}
        </button>
      </div>
      <div className="flex-1 overflow-auto p-4">
        <pre className="text-xs font-mono text-gray-300 bg-gray-900 rounded p-3 overflow-x-auto">
          <code>{css}</code>
        </pre>
      </div>
    </div>
  );
}
