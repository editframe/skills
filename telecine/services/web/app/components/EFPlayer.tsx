import { useRef } from "react";
import { Preview, Scrubber, TimeDisplay, TogglePlay } from "@editframe/react";
import type { EFPreview } from "@editframe/elements";
import clsx from "classnames";
import { Pause, Play } from "@phosphor-icons/react";

export const EFPlayer = ({
  code,
  className,
  children,
}: {
  code?: string;
  className?: string;
  children?: React.ReactNode;
}) => {
  const previewRef = useRef<EFPreview | null>(null);
  const codeContainerRef = useRef<HTMLDivElement | null>(null);

  return (
    <div className={clsx("relative w-full", className)}>
      <Preview className="bg-slate-800 w-full h-full" ref={previewRef}>
        {children ? (
          <>{children}</>
        ) : (
          <div
            ref={codeContainerRef}
            dangerouslySetInnerHTML={{
              __html: code || "",
            }}
          />
        )}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 via-black/60 to-transparent pointer-events-auto">
          <div className="flex flex-col gap-3">
            <Scrubber className="w-full" />
            <div className="flex items-center justify-between">
              <TogglePlay>
                <button
                  slot="pause"
                  className="text-white hover:text-white/80 flex flex-col items-center p-1 rounded hover:bg-white/10 transition-colors"
                >
                  <Pause className="size-5" />
                </button>
                <button
                  slot="play"
                  className="text-white hover:text-white/80 flex flex-col items-center p-1 rounded hover:bg-white/10 transition-colors"
                >
                  <Play className="size-5" />
                </button>
              </TogglePlay>
              <TimeDisplay className="text-xs font-medium text-white/80" />
            </div>
          </div>
        </div>
      </Preview>
    </div>
  );
};
