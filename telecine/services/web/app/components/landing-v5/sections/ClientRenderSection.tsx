import { ClientRenderDemo } from "../ClientRenderDemo";

export function ClientRenderSection() {
  return (
    <section className="relative py-24 bg-[var(--poster-red)] text-white overflow-hidden">
      {/* Download arrow pattern - export/download, no upload needed */}
      <div className="absolute top-1/2 left-0 -translate-y-1/2 -translate-x-1/4 w-[500px] h-[500px] opacity-[0.08]">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <path d="M50,10 L50,70 M30,50 L50,70 L70,50" fill="none" stroke="white" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="20" y="80" width="60" height="8" fill="white" rx="2" />
        </svg>
      </div>

      <div className="relative max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left - Content */}
          <div>
            <h2 className="text-5xl md:text-6xl font-black tracking-tighter uppercase mb-6">
              Render in<br />the browser
            </h2>
            
            {/* Feature highlights */}
            <div className="flex items-center gap-4 mb-8">
              <div className="w-8 h-1 bg-white" />
              <div className="w-6 h-1 bg-white/70" />
              <div className="w-4 h-1 bg-white/40" />
            </div>
            
            <p className="text-xl text-white/80 mb-8 leading-relaxed">
              Export video directly in the browser. No upload. No server queue. 
              Full quality MP4 rendered on the client using WebCodecs.
            </p>
            
            {/* Benefits */}
            <div className="space-y-4 mb-10">
              {[
                { icon: '⚡', title: 'Instant', desc: 'No upload wait. Start rendering immediately.' },
                { icon: '🔒', title: 'Private', desc: 'Video never leaves the browser. Complete privacy.' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-white text-black flex items-center justify-center font-bold shrink-0">
                    {item.icon}
                  </div>
                  <div>
                    <h3 className="font-bold uppercase tracking-wider text-sm">{item.title}</h3>
                    <p className="text-sm text-white/70">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Code snippet */}
            <div className="font-mono text-sm bg-white/10 p-4 mb-8 rounded">
              <span className="text-white/70">const</span> <span className="text-white">blob</span> <span className="text-white/70">=</span> <span className="text-white/70">await</span> <span className="text-[var(--poster-gold)]">renderToVideo</span><span className="text-white">(</span><span className="text-white">composition</span><span className="text-white">)</span><span className="text-white/70">;</span>
            </div>
            
            {/* Codec support - split for browser vs cloud */}
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[var(--poster-green)]" />
                <span className="text-white/70">Browser: H.264, VP9, AV1 (browser-dependent)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[var(--poster-green)]" />
                <span className="text-white/70">Cloud: H.264, H.265, VP9, AV1 — full codec support</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[var(--poster-green)]" />
                <span className="text-white/70">Up to 4K resolution</span>
              </div>
            </div>
          </div>
          
          {/* Right - Demo */}
          <div className="relative">
            <ClientRenderDemo />
          </div>
        </div>
      </div>
    </section>
  );
}
