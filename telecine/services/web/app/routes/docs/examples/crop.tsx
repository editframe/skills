import type { Route } from "./+types/crop";
import { useState } from "react";
import { Timegroup, Preview, Video } from "@editframe/react";
import { WithEnv } from "~/components/WithEnv";
import { ResizableBox } from "./ResizableBox";
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

export interface CropSpecification {
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function Crop(_props: Route.ComponentProps) {
  const [crop, setCrop] = useState<CropSpecification>({
    x: 50,
    y: 50,
    width: 210,
    height: 118,
  });

  return (
    <Preview className="w-full h-[calc(100vh-12rem)]">
      <div className="grid grid-cols-[420px_1fr_420px] gap-1 min-h-0 overflow-hidden">
        <section className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border border-gray-200 flex items-center justify-center">
          <div className="w-[350px] h-[197px] bg-black rounded border border-gray-300 relative">
            <ef-surface target="crop-demo-video" className="w-full h-full" />
            <ResizableBox
              bounds={crop}
              onBoundsChange={(bounds) =>
                setCrop({
                  x: Math.round(bounds.x),
                  y: Math.round(bounds.y),
                  width: Math.round(bounds.width),
                  height: Math.round(bounds.height),
                })
              }
              containerWidth={350}
              containerHeight={197}
              minSize={35}
            />
          </div>
        </section>

        <section className="bg-gradient-to-br from-black to-gray-900 rounded-lg border border-gray-700 flex flex-col">
          <div className="flex-1 flex items-center justify-center overflow-hidden">
            <Timegroup
              mode="contain"
              id="crop-demo-video"
              className="overflow-hidden static"
              style={{ width: crop.width, height: crop.height }}
            >
              <div
                style={{
                  transform: `translate(-${crop.x}px, -${crop.y}px)`,
                }}
              >
                <Video
                  id="crop-demo-video"
                  src="https://assets.editframe.com/bars-n-tone.mp4"
                  className="pointer-events-none w-[350px] h-[197px]"
                />
              </div>
            </Timegroup>
          </div>
          <TimelineControls className="mx-2" />
        </section>
      </div>
    </Preview>
  );
}
