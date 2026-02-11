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

        {/* Single killer end-to-end example */}
        <div className="max-w-4xl mx-auto">
          <div className="relative">
            <div className="absolute -bottom-4 -right-4 w-full h-full bg-[var(--poster-gold)]" />
            <div className="relative border-4 border-white overflow-hidden bg-[var(--card-bg)]">
              <div className="bg-[var(--ink-black)] px-6 py-4 border-b-2 border-white/10">
                <div className="flex items-center gap-3">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-[var(--poster-red)]" />
                    <div className="w-3 h-3 rounded-full bg-[var(--poster-gold)]" />
                    <div className="w-3 h-3 rounded-full bg-[var(--poster-green)]" />
                  </div>
                  <span className="text-white/40 text-xs font-mono">welcome-video.tsx</span>
                </div>
              </div>
              <div className="p-6">
                <CodeBlock>
                  {`import { Composition, Video, Text, Image } from '@editframe/react'
import { renderToVideo } from '@editframe/elements'

// 1. Define your composition as a React component
const WelcomeVideo = ({ user }) => (
  <Composition width={1920} height={1080} duration={5000}>
    <Video src="background.mp4" />
    <Image 
      src={user.avatar} 
      x={50} 
      y={50} 
      width={200} 
      height={200}
      style={{ borderRadius: '50%' }}
    />
    <Text 
      x={300} 
      y={125}
      style={{ 
        fontSize: 72, 
        fontWeight: 'bold',
        color: 'white' 
      }}
    >
      Welcome, {user.name}!
    </Text>
  </Composition>
)

// 2. Preview instantly in browser (no build, no account)
<Preview>
  <WelcomeVideo user={{ name: 'Alex', avatar: 'avatar.jpg' }} />
</Preview>

// 3. Render to video
// Browser: WebCodecs, instant, private
const blob = await renderToVideo(
  <WelcomeVideo user={{ name: 'Alex', avatar: 'avatar.jpg' }} />
)

// Cloud: Parallel fragments, hyperscale
// $ editframe render welcome-video.tsx --data users.json

// Local: FFmpeg, full control
// $ editframe render welcome-video.tsx --local`}
                </CodeBlock>
              </div>
            </div>
          </div>

          {/* Key points */}
          <div className="grid md:grid-cols-3 gap-6 mt-12">
            {[
              { 
                icon: '⚛️', 
                title: 'React Components', 
                desc: 'Familiar JSX syntax. Props, state, hooks — everything you know.' 
              },
              { 
                icon: '⚡', 
                title: 'Instant Preview', 
                desc: 'See changes immediately. No build step. No server required.' 
              },
              { 
                icon: '🎯', 
                title: 'One API', 
                desc: 'Same code runs in browser, cloud, or local. Your choice.' 
              },
            ].map((item, i) => (
              <div key={i} className="bg-white/5 border border-white/10 p-6">
                <div className="text-3xl mb-3">{item.icon}</div>
                <h3 className="text-sm font-bold uppercase tracking-wider mb-2">{item.title}</h3>
                <p className="text-xs text-white/60 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
