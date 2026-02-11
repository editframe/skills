import { InteractivePlayground } from "../index";

export function PlaygroundSection() {
  return (
    <section className="relative py-24 bg-[var(--poster-blue)] text-white overflow-hidden">
      {/* Circular arrows / refresh cycle - edit→preview→edit→preview */}
      <div className="absolute top-1/2 right-0 w-[500px] h-[500px] -translate-y-1/2 translate-x-1/4 opacity-[0.08]">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          {/* Circular arrow suggesting continuous loop */}
          <path 
            d="M50,15 A35,35 0 1,1 15,50" 
            fill="none" 
            stroke="white" 
            strokeWidth="8"
            strokeLinecap="round"
          />
          {/* Arrow head */}
          <polygon points="15,35 15,55 5,50" fill="white" />
          {/* Second partial arc */}
          <path 
            d="M50,85 A35,35 0 0,1 85,50" 
            fill="none" 
            stroke="white" 
            strokeWidth="8"
            strokeLinecap="round"
          />
          {/* Second arrow head */}
          <polygon points="85,45 85,65 95,50" fill="white" />
        </svg>
      </div>

      <div className="relative max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-5xl md:text-6xl font-black tracking-tighter uppercase mb-6">
            Edit code,<br />see video
          </h2>
          {/* Small loop icon echoing the concept */}
          <div className="flex justify-center gap-2 mb-6">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M1 4v6h6M23 20v-6h-6" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="text-white/60 text-sm uppercase tracking-wider font-bold">Instant feedback loop</span>
          </div>
          <p className="text-xl text-white/80">
            Experience instant preview. No account required.
          </p>
        </div>
        
        <div className="relative">
          <div className="absolute -top-4 -left-4 w-full h-full bg-[var(--poster-gold)]" />
          <div className="relative border-4 border-[var(--ink-black)] overflow-hidden">
            <InteractivePlayground />
          </div>
        </div>
      </div>
    </section>
  );
}
