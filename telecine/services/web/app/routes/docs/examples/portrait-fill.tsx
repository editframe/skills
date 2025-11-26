import type { Route } from "./+types/portrait-fill";
import { useState } from "react";
import { Timegroup, Preview, Video } from "@editframe/react";
import { TimelineControls } from "./shared";

// Type declarations for custom elements
declare global {
  namespace JSX {
    interface IntrinsicElements {
      "ef-surface": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        target?: string;
      };
    }
  }
}

export default function PortraitFill(_props: Route.ComponentProps) {
  const [blurAmount, setBlurAmount] = useState(8);
  const [backgroundOpacity, setBackgroundOpacity] = useState(0.6);

  return (
    <Preview className="w-full h-[calc(100vh-12rem)]">
      <div className="grid grid-cols-[300px_1fr] gap-1 min-h-0 overflow-hidden h-full">
        {/* Controls Panel */}
        <section className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border border-gray-200 overflow-hidden">
          <div className="p-4 space-y-4 h-full overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-800">
              Portrait Fill Effect
            </h3>
            <p className="text-sm text-gray-600">
              Portrait video centered in landscape frame with blurred background
              fill.
            </p>

            {/* Blur Amount Control */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-gray-700">
                  Background Blur
                </label>
                <span className="text-sm text-gray-600 font-mono">
                  {blurAmount}px
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={20}
                step={1}
                value={blurAmount}
                onChange={(e) => setBlurAmount(Number.parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Background Opacity Control */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-gray-700">
                  Background Opacity
                </label>
                <span className="text-sm text-gray-600 font-mono">
                  {Math.round(backgroundOpacity * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0.1}
                max={1}
                step={0.1}
                value={backgroundOpacity}
                onChange={(e) =>
                  setBackgroundOpacity(Number.parseFloat(e.target.value))
                }
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
        </section>

        {/* Video Panel */}
        <section className="bg-gradient-to-br from-black to-gray-900 rounded-lg border border-gray-700 flex flex-col">
          <div className="flex-1 flex items-center justify-center overflow-hidden relative">
            {/* Landscape container - 16:9 aspect ratio */}
            <div className="w-[800px] h-[450px] bg-black rounded-lg overflow-hidden relative">
              {/* Background surfaces - blurred clones filling sides */}
              <ef-surface
                target="portrait-video"
                className="absolute left-0 top-0 w-[273px] h-full"
                style={{
                  filter: `blur(${blurAmount}px)`,
                  opacity: backgroundOpacity,
                  transform: "scaleX(-1) scaleY(1.5)",
                  transformOrigin: "right center",
                }}
              />

              <ef-surface
                target="portrait-video"
                className="absolute right-0 top-0 w-[273px] h-full"
                style={{
                  filter: `blur(${blurAmount}px)`,
                  opacity: backgroundOpacity,
                  transform: "scaleY(1.5)",
                  transformOrigin: "left center",
                }}
              />

              {/* Main portrait video container - exactly 9:16 in the center */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                <div className="w-[253px] h-[450px] bg-gray-800 border border-gray-600 rounded overflow-hidden">
                  <Timegroup mode="contain" className="w-full h-full">
                    <Video
                      id="portrait-video"
                      src="https://assets.editframe.com/bars-n-tone-portrait.mp4"
                      className="w-full h-full"
                    />
                  </Timegroup>
                </div>
              </div>
            </div>
          </div>

          <TimelineControls className="mx-2" />
        </section>
      </div>
    </Preview>
  );
}
