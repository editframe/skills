import { Timegroup, Waveform, Audio } from "@editframe/react";
import { useId, useState } from "react";
import { EFPlayer } from "~/components/EFPlayer";
import { RadioGroup, Label, Radio } from "@headlessui/react";
import { useTheme } from "~/hooks/useTheme";

const modes: { value: string; label: string }[] = [
  { value: "roundBars", label: "Round Bars" },
  { value: "bars", label: "Bars" },
  { value: "bricks", label: "Bricks" },
  { value: "line", label: "Line" },
  { value: "curve", label: "Curve" },
  { value: "pixel", label: "Pixel" },
  { value: "wave", label: "Wave" },
  { value: "spikes", label: "Spikes" },
];

export const EditableWaveform = () => {
  const id = useId();
  const { resolvedTheme } = useTheme();
  const [mode, setMode] = useState("roundBars");
  const [color, setColor] = useState("#a83dff");
  const [lineWidth, setLineWidth] = useState(4);
  const [fftSize, setFftSize] = useState(256);
  const [decaySteps, setDecaySteps] = useState(8);
  const [barSpacing, setBarSpacing] = useState(0.5);
  const [fftGain, setFftGain] = useState(3);

  const [interpolateFrequencies, setInterpolateFrequencies] = useState(false);
  const handleFftSizeChange = (value: number) => {
    const base = value * 128;
    const power = Math.round(Math.log2(base));
    setFftSize(2 ** power);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="w-full">
        <EFPlayer className="h-[300px] sm:h-[400px] lg:h-[500px]">
          <Timegroup
            loop
            mode="contain"
            className="aspect-[1/1] w-full max-w-[500px] h-full bg-black flex items-center justify-center mx-auto"
          >
            <Audio
              src="https://assets.editframe.com/card-joker.mp3"
              fftSize={fftSize}
              fftDecay={decaySteps}
              fftGain={fftGain}
              interpolateFrequencies={interpolateFrequencies}
              id={`${id}-audio`}
            />
            <Waveform
              target={`${id}-audio`}
              mode={mode as any}
              barSpacing={barSpacing}
              className="h-[200px] box-border border-2 border-gray-300 dark:border-gray-600 w-full block outline-2"
              color={color}
              style={{
                backgroundColor: resolvedTheme === "dark" ? "#1f2937" : "white",
              }}
              lineWidth={lineWidth}
            />
          </Timegroup>
        </EFPlayer>
      </div>

      <div className="space-y-4 min-w-0">
        <RadioGroup value={mode} onChange={setMode} className="mb-4">
          <Label className="text-xs font-medium text-gray-600 dark:text-gray-300">
            Waveform Mode
          </Label>
          <div className="flex flex-wrap gap-2 mt-1">
            {modes.map((option) => (
              <Radio
                key={option.value}
                value={option.value}
                className={({ checked }) =>
                  `${checked
                    ? "bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800"
                    : "bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border-gray-300 dark:border-gray-600"
                  } border rounded px-2 py-1 cursor-pointer transition-colors`
                }
              >
                {({ checked }) => (
                  <span
                    className={`text-xs ${checked ? "text-blue-900 dark:text-blue-100" : "text-gray-700 dark:text-gray-300"}`}
                  >
                    {option.label}
                  </span>
                )}
              </Radio>
            ))}
          </div>
        </RadioGroup>

        <div className="grid grid-cols-1 gap-4">
          <label className="space-y-1">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Color</span>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="rounded ml-2 order border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
            />
          </label>

          <label className="space-y-1">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
              Line Width
            </span>
            <input
              type="number"
              min={1}
              max={40}
              value={lineWidth}
              onChange={(e) => setLineWidth(Number(e.target.value))}
              className="px-2 ml-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
          </label>

          <label className="space-y-1">
            <div className="flex items-center justify-start">
              <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                Bar Spacing
              </span>
              <span className="text-xs ml-2 text-gray-500 dark:text-gray-400">{barSpacing}</span>
            </div>
            <input
              type="range"
              min={0.1}
              max={4}
              step={0.1}
              value={barSpacing}
              onChange={(e) => setBarSpacing(Number(e.target.value))}
              className="w-full max-w-xs"
            />
          </label>

          <div className="space-y-1">
            <div className="flex items-center justify-start">
              <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                FFT Size
              </span>
              <span className="text-xs ml-2 text-gray-500 dark:text-gray-400">{fftSize}</span>
            </div>
            <input
              type="range"
              min={1}
              max={8}
              value={Math.round(fftSize / 128)}
              onChange={(e) => handleFftSizeChange(Number(e.target.value))}
              className="w-full max-w-xs"
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-start">
              <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                Decay Steps
              </span>
              <span className="text-xs ml-2 text-gray-500 dark:text-gray-400">{decaySteps}</span>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              value={decaySteps}
              onChange={(e) => setDecaySteps(Number(e.target.value))}
              className="w-full max-w-xs"
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-start">
              <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                FFT Gain
              </span>
              <span className="text-xs ml-2 text-gray-500 dark:text-gray-400">{fftGain}</span>
            </div>
            <input
              type="range"
              min={0}
              max={10}
              step={0.1}
              value={fftGain}
              onChange={(e) => setFftGain(Number(e.target.value))}
              className="w-full max-w-xs"
            />
          </div>

          <div className="space-y-1">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={interpolateFrequencies}
                onChange={(e) => setInterpolateFrequencies(e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
              />
              <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                Interpolate Frequencies ({interpolateFrequencies ? "Yes" : "No"}
                )
              </span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
