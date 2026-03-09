export function HeroDemoPoster() {
  return (
    <div className="w-full">
      <div className="bg-[#0a0a0a] border-4 border-[var(--ink-black)] dark:border-white overflow-hidden">
        <div
          className="relative flex flex-col items-center justify-center"
          style={{
            aspectRatio: "16/9",
            background:
              "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(21,101,192,0.08) 0%, transparent 70%)",
          }}
        >
          <span className="text-white text-5xl font-black tracking-tighter leading-[1.1] text-center select-none">
            VIDEO IS A
          </span>
          <span className="text-[var(--poster-gold)] text-7xl font-black tracking-tighter leading-[1.0] text-center select-none">
            WEB PAGE
          </span>
          <span className="text-white/60 text-3xl font-bold tracking-tight leading-[1.2] mt-1 text-center select-none">
            THAT MOVES.
          </span>
        </div>
        <div className="border-t-4 border-[var(--ink-black)] dark:border-white bg-[#111] flex items-center h-12">
          <div className="w-12 h-12 flex items-center justify-center bg-[var(--poster-blue)]">
            <svg
              className="w-4 h-4 text-white"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
          <div className="flex-1 px-4 border-l-2 border-[var(--ink-black)] dark:border-white">
            <div className="w-full h-1.5 bg-white/20" />
          </div>
          <div className="px-4 border-l-2 border-[var(--ink-black)] dark:border-white h-12 flex items-center">
            <span className="text-xs text-white/50 font-mono">0:00</span>
          </div>
        </div>
      </div>
    </div>
  );
}
