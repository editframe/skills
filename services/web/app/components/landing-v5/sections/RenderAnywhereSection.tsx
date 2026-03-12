import { Globe, Cloud, Terminal } from "@phosphor-icons/react";

export function RenderAnywhereSection() {
  return (
    <section className="relative py-24 bg-[var(--poster-red)] dark:bg-[#3a1a1a] text-white overflow-hidden">
      {/* Three-way split pattern - three equal paths */}
      <div
        className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/4 w-[500px] h-[500px] opacity-[0.08]"
        aria-hidden="true"
      >
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <circle cx="20" cy="50" r="8" fill="white" />
          <line
            x1="28"
            y1="50"
            x2="45"
            y2="30"
            stroke="white"
            strokeWidth="4"
          />
          <line
            x1="28"
            y1="50"
            x2="45"
            y2="50"
            stroke="white"
            strokeWidth="4"
          />
          <line
            x1="28"
            y1="50"
            x2="45"
            y2="70"
            stroke="white"
            strokeWidth="4"
          />
          <circle cx="50" cy="30" r="6" fill="white" />
          <circle cx="50" cy="50" r="6" fill="white" />
          <circle cx="50" cy="70" r="6" fill="white" />
        </svg>
      </div>

      <div className="relative max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-5xl md:text-7xl font-black tracking-tighter uppercase mb-6 text-white">
            Render
            <br />
            Anywhere
          </h2>
          <div className="flex justify-center gap-2 mb-6">
            <div className="w-12 h-1 bg-white" />
            <div className="w-12 h-1 bg-white/70" />
            <div className="w-12 h-1 bg-white/40" />
          </div>
          <p className="text-xl text-white/80 max-w-3xl mx-auto leading-relaxed">
            One composition, three execution contexts. Choose the one that fits.
          </p>
        </div>

        {/* Three equal paths */}
        <div className="grid md:grid-cols-3 gap-4 md:gap-8">
          {/* Browser */}
          <div className="relative">
            <div className="absolute -bottom-2 -right-2 md:-bottom-3 md:-right-3 w-full h-full bg-[var(--poster-gold)]" />
            <div className="relative bg-white dark:bg-[#1a1a1a] text-[var(--ink-black)] dark:text-white border-4 border-white dark:border-white/20 p-4 md:p-6 h-full">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-[var(--poster-red)] text-white flex items-center justify-center">
                  <Globe size={24} weight="bold" aria-hidden="true" />
                </div>
                <h3 className="text-2xl font-black uppercase tracking-tight">
                  Browser
                </h3>
              </div>
              <p className="text-sm mb-4 text-[var(--warm-gray)]">
                Export video directly from the browser. No server round-trip.
                Nothing to install.
              </p>
              <div className="font-mono text-xs bg-[var(--ink-black)] text-white p-3 mb-4">
                <span className="text-[var(--poster-gold)]">renderToVideo</span>
                (comp)
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--poster-green)]" />
                  <span>H.264, VP9, AV1 via WebCodecs</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--poster-green)]" />
                  <span>No upload required</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--poster-green)]" />
                  <span>Embed export in your app</span>
                </div>
              </div>
            </div>
          </div>

          {/* CLI */}
          <div className="relative">
            <div className="absolute -bottom-2 -right-2 md:-bottom-3 md:-right-3 w-full h-full bg-[var(--poster-green)]" />
            <div className="relative bg-white dark:bg-[#1a1a1a] text-[var(--ink-black)] dark:text-white border-4 border-white dark:border-white/20 p-4 md:p-6 h-full">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-[var(--poster-red)] text-white flex items-center justify-center">
                  <Terminal size={24} weight="bold" aria-hidden="true" />
                </div>
                <h3 className="text-2xl font-black uppercase tracking-tight">
                  CLI
                </h3>
              </div>
              <p className="text-sm mb-4 text-[var(--warm-gray)]">
                Render from the command line. Same composition, headless Chrome
                under the hood.
              </p>
              <div className="font-mono text-xs bg-[var(--ink-black)] text-white p-3 mb-4">
                ${" "}
                <span className="text-[var(--poster-gold)]">
                  editframe render
                </span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--poster-green)]" />
                  <span>H.264, VP9, AV1 via WebCodecs</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--poster-green)]" />
                  <span>Scriptable and CI-friendly</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--poster-green)]" />
                  <span>GPU-accelerated encoding</span>
                </div>
              </div>
            </div>
          </div>

          {/* Cloud */}
          <div className="relative">
            <div className="absolute -bottom-2 -right-2 md:-bottom-3 md:-right-3 w-full h-full bg-[var(--poster-blue)]" />
            <div className="relative bg-white dark:bg-[#1a1a1a] text-[var(--ink-black)] dark:text-white border-4 border-white dark:border-white/20 p-4 md:p-6 h-full">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-[var(--poster-red)] text-white flex items-center justify-center">
                  <Cloud size={24} weight="bold" aria-hidden="true" />
                </div>
                <h3 className="text-2xl font-black uppercase tracking-tight">
                  Cloud
                </h3>
              </div>
              <p className="text-sm mb-4 text-[var(--warm-gray)]">
                Parallel fragment rendering. Split your video into segments,
                encode concurrently, reassemble.
              </p>
              <div className="font-mono text-xs bg-[var(--ink-black)] text-white p-3 mb-4">
                ${" "}
                <span className="text-[var(--poster-gold)]">
                  editframe cloud-render
                </span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--poster-green)]" />
                  <span>H.264 via server-side FFmpeg</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--poster-green)]" />
                  <span>Parallel fragment processing</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--poster-green)]" />
                  <span>API and webhook integration</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
