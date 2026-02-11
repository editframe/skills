import { ClientRenderDemo } from "../index";

export function RenderAnywhereSection() {
  return (
    <section className="relative py-24 bg-[var(--poster-red)] text-white overflow-hidden">
      {/* Three-way split pattern - three equal paths */}
      <div className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/4 w-[500px] h-[500px] opacity-[0.08]">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <circle cx="20" cy="50" r="8" fill="white" />
          <line x1="28" y1="50" x2="45" y2="30" stroke="white" strokeWidth="4" />
          <line x1="28" y1="50" x2="45" y2="50" stroke="white" strokeWidth="4" />
          <line x1="28" y1="50" x2="45" y2="70" stroke="white" strokeWidth="4" />
          <circle cx="50" cy="30" r="6" fill="white" />
          <circle cx="50" cy="50" r="6" fill="white" />
          <circle cx="50" cy="70" r="6" fill="white" />
        </svg>
      </div>

      <div className="relative max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-5xl md:text-7xl font-black tracking-tighter uppercase mb-6">
            Render<br />Anywhere
          </h2>
          <div className="flex justify-center gap-2 mb-6">
            <div className="w-12 h-1 bg-white" />
            <div className="w-12 h-1 bg-white/70" />
            <div className="w-12 h-1 bg-white/40" />
          </div>
          <p className="text-xl text-white/80 max-w-3xl mx-auto leading-relaxed">
            Same code, same API, same fidelity. Choose the execution context that fits your use case.
          </p>
        </div>

        {/* Three equal paths */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {/* Browser */}
          <div className="relative">
            <div className="absolute -bottom-3 -right-3 w-full h-full bg-[var(--poster-gold)]" />
            <div className="relative bg-white text-[var(--ink-black)] border-4 border-white p-6 h-full">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-[var(--poster-red)] text-white flex items-center justify-center font-black text-xl">
                  🌐
                </div>
                <h3 className="text-2xl font-black uppercase tracking-tight">Browser</h3>
              </div>
              <p className="text-sm mb-4 text-[var(--warm-gray)]">
                WebCodecs API. Instant rendering. No upload. Complete privacy.
              </p>
              <div className="font-mono text-xs bg-[var(--ink-black)] text-white p-3 mb-4">
                <span className="text-[var(--poster-gold)]">renderToVideo</span>(comp)
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--poster-green)]" />
                  <span>H.264, VP9, AV1</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--poster-green)]" />
                  <span>Browser-dependent</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--poster-green)]" />
                  <span>Zero latency</span>
                </div>
              </div>
            </div>
          </div>

          {/* Cloud */}
          <div className="relative">
            <div className="absolute -bottom-3 -right-3 w-full h-full bg-[var(--poster-blue)]" />
            <div className="relative bg-white text-[var(--ink-black)] border-4 border-white p-6 h-full">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-[var(--poster-red)] text-white flex items-center justify-center font-black text-xl">
                  ☁️
                </div>
                <h3 className="text-2xl font-black uppercase tracking-tight">Cloud</h3>
              </div>
              <p className="text-sm mb-4 text-[var(--warm-gray)]">
                Parallel fragment rendering. Hyperscale. Full codec support.
              </p>
              <div className="font-mono text-xs bg-[var(--ink-black)] text-white p-3 mb-4">
                $ <span className="text-[var(--poster-gold)]">editframe render</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--poster-green)]" />
                  <span>H.264, H.265, VP9, AV1</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--poster-green)]" />
                  <span>All codecs supported</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--poster-green)]" />
                  <span>Infinite scale</span>
                </div>
              </div>
            </div>
          </div>

          {/* Local */}
          <div className="relative">
            <div className="absolute -bottom-3 -right-3 w-full h-full bg-[var(--poster-green)]" />
            <div className="relative bg-white text-[var(--ink-black)] border-4 border-white p-6 h-full">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-[var(--poster-red)] text-white flex items-center justify-center font-black text-xl">
                  💻
                </div>
                <h3 className="text-2xl font-black uppercase tracking-tight">Local</h3>
              </div>
              <p className="text-sm mb-4 text-[var(--warm-gray)]">
                FFmpeg on your machine. Full control. No network dependency.
              </p>
              <div className="font-mono text-xs bg-[var(--ink-black)] text-white p-3 mb-4">
                $ <span className="text-[var(--poster-gold)]">editframe render --local</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--poster-green)]" />
                  <span>All FFmpeg codecs</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--poster-green)]" />
                  <span>Complete control</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--poster-green)]" />
                  <span>Offline capable</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Same API callout */}
        <div className="max-w-3xl mx-auto mb-12">
          <div className="relative">
            <div className="absolute -bottom-3 -right-3 w-full h-full bg-white" />
            <div className="relative bg-[var(--card-dark-bg)] border-4 border-white p-8 text-center">
              <div className="flex items-center justify-center gap-3 mb-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-lg font-black uppercase tracking-wider">Same API, Same Fidelity</span>
              </div>
              <p className="text-white/70 text-sm">
                Write once. Render anywhere. The API doesn't change. The quality doesn't change. Only the execution context.
              </p>
            </div>
          </div>
        </div>

        {/* Demo */}
        <div className="max-w-4xl mx-auto">
          <div className="mb-4 text-center">
            <span className="text-xs font-bold uppercase tracking-wider text-white/50">Live Demo • Browser Rendering</span>
          </div>
          <div className="relative">
            <div className="absolute -bottom-4 -right-4 w-full h-full bg-[var(--poster-gold)]" />
            <div className="relative border-4 border-white overflow-hidden">
              <ClientRenderDemo />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
