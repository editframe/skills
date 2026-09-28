import { Chip, FONT, GOLD, Reveal, SELECT, Solo, SUCCESS } from "../src/primitives";

const REQUESTS = [
  { label: "Brief", bg: "rgba(61,220,132,0.12)", fg: SUCCESS, ring: SUCCESS, anim: "req-a" },
  { label: "Debug", bg: "rgba(91,140,255,0.12)", fg: SELECT, ring: SELECT, anim: "req-b" },
  { label: "Deploy", bg: "rgba(228,192,122,0.12)", fg: GOLD, ring: GOLD, anim: "req-c" },
] as const;

const OUTPUTS = [
  { label: "CAN", bg: "rgba(61,220,132,0.12)", fg: SUCCESS, ring: SUCCESS, anim: "out-a" },
  { label: "SKU", bg: "rgba(91,140,255,0.12)", fg: SELECT, ring: SELECT, anim: "out-b" },
  { label: "Checks", bg: "rgba(228,192,122,0.12)", fg: GOLD, ring: GOLD, anim: "out-c" },
] as const;

export const duration = 6;
export const aspect = "landscape" as const;

function Arrow({ delay, width }: { delay: number; width: number }) {
  return (
    <div className="relative h-6" style={{ width }}>
      <div
        className="absolute left-0 top-[9px] h-[2px]"
        style={{
          width: width - 16,
          background: SUCCESS,
          boxShadow: `0 0 10px ${SUCCESS}`,
          transformOrigin: "left center",
          animation: `rule-draw-in 520ms ${delay}ms steps(6, end) both`,
        }}
      />
      <div
        className="absolute right-0 top-[3px]"
        style={{
          width: 0,
          height: 0,
          borderTop: "9px solid transparent",
          borderBottom: "9px solid transparent",
          borderLeft: `14px solid ${SUCCESS}`,
          filter: `drop-shadow(0 0 6px ${SUCCESS})`,
          animation: `fade-in 120ms ${delay + 480}ms both`,
        }}
      />
    </div>
  );
}

export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: typeof aspect }) {
  return (
    <Solo id={id} aspect={frame} duration={duration} theme="data">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at 50% 48%, rgba(61,220,132,0.14), transparent 60%)",
        }}
      />
      <div
        className="flex h-full w-full items-center justify-center"
        style={{ animation: "flow-exit 480ms 5520ms cubic-bezier(0.32,0,0.67,0) forwards" }}
      >
        <div className="flex items-center gap-8">
          <div className="relative h-[76px] w-[260px]">
            {REQUESTS.map((box) => (
              <div
                key={box.label}
                className="absolute inset-0 flex items-center justify-end"
                style={{ animation: `${box.anim} 6s linear both` }}
              >
                <div
                  className="flex h-[76px] items-center justify-center rounded-2xl px-10 text-3xl font-medium"
                  style={{
                    background: box.bg,
                    color: box.fg,
                    minWidth: 240,
                    border: `1px solid ${box.ring}55`,
                    boxShadow: `0 0 28px ${box.ring}22`,
                    fontFamily: FONT.mono,
                  }}
                >
                  {box.label}
                </div>
              </div>
            ))}
          </div>
          <Arrow delay={520} width={220} />
          <Reveal
            enter={[900, 1180]}
            y={10}
            scaleFrom={0.94}
            className="flex flex-col items-center gap-3"
          >
            <Chip active>route</Chip>
            <div
              className="flex h-[76px] w-[200px] items-center justify-center rounded-2xl text-3xl font-medium"
              style={{
                background: "rgba(91,140,255,0.16)",
                color: SELECT,
                border: `1px solid ${SELECT}66`,
                boxShadow: `0 0 32px ${SELECT}33`,
                fontFamily: FONT.mono,
              }}
            >
              WORKFLOW
            </div>
          </Reveal>
          <Arrow delay={1500} width={220} />
          <div className="relative h-[76px] w-[260px]">
            {OUTPUTS.map((box) => (
              <div
                key={box.label}
                className="absolute inset-0 flex items-center justify-start"
                style={{ animation: `${box.anim} 6s linear both` }}
              >
                <div
                  className="flex h-[76px] items-center justify-center rounded-2xl px-10 text-3xl font-medium"
                  style={{
                    background: box.bg,
                    color: box.fg,
                    minWidth: 220,
                    border: `1px solid ${box.ring}55`,
                    boxShadow: `0 0 28px ${box.ring}22`,
                    fontFamily: FONT.mono,
                  }}
                >
                  {box.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <style>{`
        @keyframes req-a { 0%{opacity:0} 3%{opacity:1} 46%{opacity:1} 53%{opacity:0} 100%{opacity:0} }
        @keyframes req-b { 0%{opacity:0} 46%{opacity:0} 53%{opacity:1} 68%{opacity:1} 73%{opacity:0} 100%{opacity:0} }
        @keyframes req-c { 0%{opacity:0} 68%{opacity:0} 73%{opacity:1} 100%{opacity:1} }
        @keyframes out-a { 0%{opacity:0} 28%{opacity:0} 32%{opacity:1} 46%{opacity:1} 53%{opacity:0} 100%{opacity:0} }
        @keyframes out-b { 0%{opacity:0} 46%{opacity:0} 53%{opacity:1} 68%{opacity:1} 73%{opacity:0} 100%{opacity:0} }
        @keyframes out-c { 0%{opacity:0} 68%{opacity:0} 73%{opacity:1} 100%{opacity:1} }
        @keyframes flow-exit {
          to { transform: translateY(-560px); opacity: 0; }
        }
      `}</style>
    </Solo>
  );
}
