import { useState } from "react";
import { Highlight, themes } from "prism-react-renderer";

const examples = {
  basic: {
    name: "Basic composition",
    code: `import { Timegroup, Video, Text } from '@editframe/react';

export function SocialClip() {
  return (
    <Timegroup mode="contain" className="w-[1080px] h-[1920px]">
      <Video src="background.mp4" className="size-full object-cover" />
      
      <Text 
        className="absolute top-16 inset-x-8 text-white text-5xl font-bold text-center"
        start={0}
        duration={3}
      >
        Welcome to Editframe
      </Text>
    </Timegroup>
  );
}`,
  },
  waveform: {
    name: "Audio waveform",
    code: `import { Timegroup, Audio, Waveform } from '@editframe/react';

export function PodcastClip() {
  return (
    <Timegroup mode="contain" className="w-[1920px] h-[1080px] bg-slate-900">
      <Audio src="podcast.mp3" />
      
      <Waveform
        target="podcast.mp3"
        barColor="rgb(239, 68, 68)"
        barWidth={4}
        barGap={2}
        className="absolute bottom-8 inset-x-8 h-32"
      />
    </Timegroup>
  );
}`,
  },
  sequence: {
    name: "Sequenced clips",
    code: `import { Timegroup, Video, Sequence } from '@editframe/react';

export function Montage() {
  return (
    <Timegroup mode="contain" className="w-[1920px] h-[1080px]">
      <Sequence>
        <Video src="clip1.mp4" duration={3} />
        <Video src="clip2.mp4" duration={3} />
        <Video src="clip3.mp4" duration={3} />
      </Sequence>
    </Timegroup>
  );
}`,
  },
};

function CodeExamples() {
  const [selected, setSelected] = useState<keyof typeof examples>("basic");
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(examples[selected].code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = examples[selected].code;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {(Object.keys(examples) as Array<keyof typeof examples>).map((key) => (
          <button
            key={key}
            onClick={() => setSelected(key)}
            className={`px-4 py-2 text-sm font-medium rounded transition-colors ${
              selected === key
                ? "bg-white text-[var(--ink-black)]"
                : "text-white/70 hover:text-white"
            }`}
          >
            {examples[key].name}
          </button>
        ))}
      </div>

      {/* Code block */}
      <div className="relative rounded-lg overflow-hidden">
        {/* Copy button */}
        <button
          onClick={handleCopy}
          className="absolute top-4 right-4 z-10 p-2 text-white/50 hover:text-white transition-colors"
          title="Copy code"
        >
          {copied ? (
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          ) : (
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          )}
        </button>

        <Highlight
          theme={themes.nightOwl}
          code={examples[selected].code}
          language="tsx"
        >
          {({ style, tokens, getLineProps, getTokenProps }) => (
            <pre
              className="overflow-x-auto"
              style={{
                ...style,
                fontSize: "0.875rem",
                lineHeight: "1.625",
                padding: "1.5rem",
                margin: 0,
              }}
            >
              {tokens.map((line, i) => (
                <div key={i} {...getLineProps({ line })}>
                  {line.map((token, key) => (
                    <span key={key} {...getTokenProps({ token })} />
                  ))}
                </div>
              ))}
            </pre>
          )}
        </Highlight>
      </div>
    </div>
  );
}

export { CodeExamples };
export default CodeExamples;
