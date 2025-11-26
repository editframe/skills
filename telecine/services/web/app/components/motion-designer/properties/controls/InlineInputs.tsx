import React from "react";

interface InlineInput {
  label: string;
  propPath: string;
  value: number | undefined;
  unit?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  type?: "number" | "slider";
  displayMultiplier?: number;
}

interface InlineInputsProps {
  inputs: InlineInput[];
  onChange: (propPath: string, value: number) => void;
}

export function InlineInputs({ inputs, onChange }: InlineInputsProps) {
  return (
    <div className="flex items-center gap-1">
      {inputs.map((input, idx) => {
        if (input.type === "slider") {
          const defaultValue = input.displayMultiplier === 100 ? 1 : 0;
          const displayValue = Math.round(
            (input.value ?? defaultValue) * (input.displayMultiplier ?? 1),
          );
          return (
            <div
              key={input.propPath}
              className="flex-1 flex items-center gap-1"
            >
              <label className="text-[10px] text-gray-500 whitespace-nowrap font-normal w-10 flex-shrink-0">
                {input.label}
              </label>
              <input
                type="range"
                min={input.min ?? 0}
                max={input.max ?? 100}
                step={input.step ?? 1}
                value={displayValue}
                onChange={(e) =>
                  onChange(
                    input.propPath,
                    Number(e.target.value) / (input.displayMultiplier ?? 1),
                  )
                }
                className="flex-1 h-1 bg-gray-900 rounded-full appearance-none cursor-pointer accent-blue-500/80"
                style={{
                  WebkitAppearance: "none",
                  MozAppearance: "none",
                }}
              />
              <span className="text-[9px] text-gray-500 w-8 text-right font-medium tabular-nums">
                {displayValue}
                {input.unit}
              </span>
            </div>
          );
        }

        return (
          <div key={input.propPath} className="flex-1 flex items-center gap-1">
            <label className="text-[10px] text-gray-500 whitespace-nowrap font-normal flex-shrink-0">
              {input.label}
            </label>
            <div className="relative flex-1">
              <input
                type="number"
                value={input.value ?? ""}
                onChange={(e) =>
                  onChange(input.propPath, Number(e.target.value))
                }
                className="w-full h-5 px-1.5 pr-5 text-[10px] bg-gray-900/50 border border-gray-700/30 rounded-sm text-white placeholder:text-gray-700 hover:border-gray-600/50 focus:border-blue-500/50 focus:bg-gray-900 focus:outline-none transition-colors"
                placeholder={input.placeholder}
                min={input.min}
                max={input.max}
                step={input.step}
              />
              {input.unit && (
                <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[7px] text-gray-600 pointer-events-none font-bold uppercase">
                  {input.unit}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
