import { InteractivePlayground } from "../InteractivePlayground";

export function PlaygroundSection() {
  return (
    <section className="relative py-24 bg-[var(--poster-blue)] text-white overflow-hidden">
      {/* Double-headed arrow pattern - works in both directions, any context */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] opacity-[0.05]">
        <svg viewBox="0 0 100 50" className="w-full h-full">
          {/* Left to right arrow */}
          <path
            d="M10,20 L40,20"
            stroke="white"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <polygon points="40,15 50,20 40,25" fill="white" />
          {/* Right to left arrow */}
          <path
            d="M90,30 L60,30"
            stroke="white"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <polygon points="60,25 50,30 60,35" fill="white" />
          {/* Labels */}
          <text x="5" y="15" fill="white" fontSize="6" fontWeight="bold">
            CODE
          </text>
          <text x="75" y="40" fill="white" fontSize="6" fontWeight="bold">
            VIDEO
          </text>
        </svg>
      </div>

      <div className="relative max-w-7xl mx-auto px-6">
        <div className="mb-12">
          <div className="flex items-center gap-4 mb-6">
            <div className="flex gap-1">
              <div className="w-8 h-8 bg-white flex items-center justify-center">
                <span className="text-[var(--poster-blue)] font-black text-lg">
                  {"<"}
                </span>
              </div>
              <svg
                className="w-8 h-8 text-white"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path
                  d="M7 16l-4-4m0 0l4-4m-4 4h18"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M17 8l4 4m0 0l-4 4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <div className="w-8 h-8 bg-white flex items-center justify-center">
                <span className="text-[var(--poster-blue)] font-black text-lg">
                  ▶
                </span>
              </div>
            </div>
            <div>
              <h2 className="text-4xl md:text-5xl font-black tracking-tighter uppercase text-white">
                Works everywhere
              </h2>
              <p className="text-lg text-white/90 mt-2">
                Custom elements that run in any framework or vanilla HTML. No
                build step. No account required.
              </p>
            </div>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -top-4 -left-4 w-full h-full bg-[var(--poster-gold)]" />
          <div className="relative border-4 border-white overflow-hidden bg-[var(--card-dark-bg)]">
            <InteractivePlayground />
          </div>
        </div>

        {/* Visual connection indicator */}
        <div className="mt-8 flex items-center justify-center gap-4">
          <div className="flex items-center gap-2 bg-white/10 px-4 py-2 border border-white/30">
            <div className="w-2 h-2 rounded-full bg-[var(--poster-green)] animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider">
              Live Preview
            </span>
          </div>
          <svg
            className="w-6 h-6"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path
              d="M13 10V3L4 14h7v7l9-11h-7z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div className="flex items-center gap-2 bg-white/10 px-4 py-2 border border-white/30">
            <span className="text-xs font-bold uppercase tracking-wider">
              No Framework Required
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
