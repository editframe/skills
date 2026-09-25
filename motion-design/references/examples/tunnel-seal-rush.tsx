import { CREAM, INK, StudyMarker, Solo, type Aspect } from "../src/primitives";

export const duration = 3.2;
export const posterTime = 1.7;
export const aspect = "landscape" as const;

// Forward travel grows each frame from the vanishing point. Phase offsets sustain depth.
export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: Aspect }) {
  return (
    <Solo id={id} aspect={frame} duration={duration} background={INK}>
      {Array.from({ length: 8 }, (_, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: 980,
            height: 980,
            border: `12px solid ${CREAM}`,
            boxSizing: "border-box",
            animation: `tunnel-rush 1.6s ${-i * 0.2}s linear infinite`,
          }}
        />
      ))}
      <div className="absolute inset-0 flex items-center justify-center">
        {["A", "B", "C"].map((letter, i) => (
          <div
            key={letter}
            className="absolute"
            style={{ animation: `seal-station-${i} 3.2s steps(1,end) both` }}
          >
            <StudyMarker letter={letter} size={180} />
          </div>
        ))}
      </div>
      <style>{`
   @keyframes tunnel-rush {
    0%{transform:translate(-50%,-50%) scale(.06);opacity:0;animation-timing-function:cubic-bezier(.55,0,.8,.2)}
    90%,100%{transform:translate(-50%,-50%) scale(3.2);opacity:.8}
   }
   @keyframes seal-station-0 {0%,16%{opacity:1}17%,82%{opacity:0}83%,100%{opacity:1}}
   @keyframes seal-station-1 {0%,21%{opacity:0}22%,42%{opacity:1}43%,100%{opacity:0}}
   @keyframes seal-station-2 {0%,48%{opacity:0}49%,74%{opacity:1}75%,100%{opacity:0}}
  `}</style>
    </Solo>
  );
}
