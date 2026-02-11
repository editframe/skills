import { CodeExamples } from "../index";
import { CodeBlock } from "~/components/CodeBlock";

export function CodeExamplesSection() {
  return (
    <section className="relative py-24 bg-[var(--card-dark-bg)] text-white overflow-hidden">
      {/* Giant curly braces - THE code symbol */}
      <div className="absolute top-1/2 left-0 -translate-y-1/2 -translate-x-1/4 text-[400px] font-black text-white/[0.03] leading-none select-none pointer-events-none">
        {'{'}
      </div>
      <div className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/4 text-[400px] font-black text-white/[0.03] leading-none select-none pointer-events-none">
        {'}'}
      </div>

      <div className="relative max-w-7xl mx-auto px-6">
        <div className="flex items-start gap-6 mb-16">
          {/* Opening brace as accent */}
          <div className="hidden md:block text-8xl font-black text-[var(--poster-gold)] leading-none -mt-4">
            {'{'}
          </div>
          <div>
            <h2 className="text-5xl md:text-6xl font-black tracking-tighter uppercase mb-4">
              Just<br />Code
            </h2>
            <p className="text-xl text-white/70 max-w-xl">
              If you know React, you know Editframe. Familiar patterns, predictable behavior.
            </p>
          </div>
        </div>

        {/* End-to-end example */}
        <div className="max-w-3xl mx-auto mb-16">
          <div className="mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-1 bg-[var(--poster-gold)]" />
              <span className="text-xs font-bold uppercase tracking-wider text-white/50">
                Complete Example
              </span>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -bottom-3 -right-3 w-full h-full bg-[var(--poster-gold)]" />
            <div className="relative border-4 border-white overflow-hidden">
              <CodeBlock>
                {`import { Composition, Video, Text } from '@editframe/react'
import { renderToVideo } from '@editframe/elements'

const MyVideo = () => (
  <Composition width={1920} height={1080} duration={5000}>
    <Video src="background.mp4" />
    <Text style={{ fontSize: 72 }}>Hello World</Text>
  </Composition>
)

// Preview: instant in browser
// Production: editframe render my-video.tsx`}
              </CodeBlock>
            </div>
          </div>
        </div>
        
        <CodeExamples />
      </div>
    </section>
  );
}
