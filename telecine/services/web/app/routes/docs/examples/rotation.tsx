import type { Route } from "./+types/rotation";
import { useState } from "react";
import { Timegroup, Preview, Video, Dial } from "@editframe/react";
import { TimelineControls } from "./shared";

export default function Rotation(_props: Route.ComponentProps) {
  const [rotation, setRotation] = useState(0);

  return (
    <div className="p-8">
      <div className="space-y-8">
        <div className="grid grid-cols-[300px_1fr] gap-8">
          <div>
            <Dial
              value={rotation}
              onChange={(event) => setRotation(event.detail.value)}
              style={{ width: "100px", height: "100px" }}
            />
            <div className="mt-4 text-center">
              <button
                onClick={() => setRotation(0)}
                className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300 mr-2"
              >
                Reset
              </button>
              <button
                onClick={() => setRotation(rotation + 90)}
                className="px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
              >
                +90°
              </button>
            </div>
          </div>

          <div>
            <Preview className="w-full h-full">
              <div className="bg-black w-[400px] h-[300px] relative overflow-hidden border-2 border-gray-300">
                <Timegroup
                  mode="contain"
                  className="w-full h-full"
                  style={{
                    transform: `rotate(${rotation}deg)`,
                    transformOrigin: "center",
                  }}
                >
                  <Video
                    src="https://assets.editframe.com/bars-n-tone.mp4"
                    className="w-full h-full object-contain"
                  />
                </Timegroup>
              </div>

              <TimelineControls />
            </Preview>
          </div>
        </div>
      </div>
    </div>
  );
}
