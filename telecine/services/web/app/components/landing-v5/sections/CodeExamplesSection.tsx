import { Atom, Browsers, Target } from "@phosphor-icons/react";
import { CodeBlock } from "~/components/CodeBlock";

export function CodeExamplesSection() {
  return (
    <section className="relative py-24 bg-[var(--card-dark-bg)] text-white overflow-hidden">
      {/* Giant curly braces - THE code symbol */}
      <div className="absolute top-1/2 left-0 -translate-y-1/2 -translate-x-1/4 text-[400px] font-black text-white/[0.03] leading-none select-none pointer-events-none" aria-hidden="true">
        {'{'}
      </div>
      <div className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/4 text-[400px] font-black text-white/[0.03] leading-none select-none pointer-events-none" aria-hidden="true">
        {'}'}
      </div>

      <div className="relative max-w-7xl mx-auto px-6">
        <div className="flex items-start gap-6 mb-16">
          {/* Opening brace as accent */}
          <div className="hidden md:block text-8xl font-black text-[var(--poster-gold)] leading-none -mt-4">
            {'{'}
          </div>
          <div>
            <h2 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tighter uppercase mb-4 text-white">
              Just<br />Code
            </h2>
            <p className="text-xl text-white/70 max-w-xl">
              HTML and CSS are the foundation. Add scripting for animation. Use React when you want components. No proprietary system to learn.
            </p>
          </div>
        </div>

        {/* Single killer end-to-end example */}
        <div className="max-w-4xl mx-auto">
          <div className="relative">
            <div className="absolute -bottom-4 -right-4 w-full h-full bg-[var(--poster-gold)]" />
            <div className="relative border-4 border-white overflow-hidden bg-[var(--card-bg)]">
              <div className="bg-[var(--ink-black)] px-4 py-3 md:px-6 md:py-4 border-b-2 border-white/10">
                <div className="flex items-center gap-3">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-[var(--poster-red)]" />
                    <div className="w-3 h-3 rounded-full bg-[var(--poster-gold)]" />
                    <div className="w-3 h-3 rounded-full bg-[var(--poster-green)]" />
                  </div>
                  <span className="text-white/40 text-xs font-mono">welcome-video.tsx</span>
                </div>
              </div>
              <div className="p-3 md:p-6">
                <CodeBlock>
                  {`import { Timegroup, Video, Text } from '@editframe/react'

// Define your composition as a React component
const WelcomeVideo = ({ user }) => (
  <Timegroup mode="fixed" duration="5s"
    className="w-[1920px] h-[1080px] relative">
    <Video src="background.mp4" className="absolute inset-0" />
    <img
      src={user.avatar}
      className="absolute top-12 left-12 w-48 h-48 rounded-full"
    />
    <Text className="absolute top-32 left-72 text-7xl font-bold text-white">
      Welcome, {user.name}!
    </Text>
  </Timegroup>
)

// Preview instantly in browser (no build, no account)
<Preview>
  <WelcomeVideo user={{ name: 'Alex', avatar: 'avatar.jpg' }} />
</Preview>`}
                </CodeBlock>
              </div>
            </div>
          </div>

          {/* Key points */}
          <div className="grid md:grid-cols-3 gap-6 mt-12">
            {[
              {
                icon: <Browsers size={28} weight="bold" aria-hidden="true" />,
                title: 'HTML & CSS',
                desc: 'The foundation. Tailwind, flexbox, grid, animations — standard web layout.'
              },
              {
                icon: <Atom size={28} weight="bold" aria-hidden="true" />,
                title: 'Scripting & React',
                desc: 'Add scripting for dynamic content. Use React components when you want them.'
              },
              {
                icon: <Target size={28} weight="bold" aria-hidden="true" />,
                title: 'Render Anywhere',
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
