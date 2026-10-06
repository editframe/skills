import { GeometryStage, Artboard, absolute, type StudyProps } from "./shared/geometry-studies";

export const duration = 4.8;
export const posterTime = 2.3;
export const aspect = "landscape" as const;

// A camera impulse enlarges a real aperture, preserving the focal point into the next scene.
export function Video({ id, aspect: frame = aspect }: StudyProps) {
  return (
    <GeometryStage id={id} aspect={frame} duration={duration} background="#263b45" ink="#e7ddc8">
      <Artboard aspect={frame} size={680}>
        <svg
          viewBox="0 0 680 680"
          width="100%"
          height="100%"
          aria-label="A circular portal opens onto a radial composition"
          style={{ animation: "blast-arrival 4.8s linear both", transformOrigin: "50% 50%" }}
        >
          <circle cx="340" cy="340" r="220" fill="#d67553" />
          {Array.from({ length: 16 }, (_, i) => (
            <path
              key={i}
              d="M340 94V198"
              transform={`rotate(${i * 22.5} 340 340)`}
              stroke="#e7ddc8"
              strokeWidth="9"
            />
          ))}
          <circle cx="340" cy="340" r="120" fill="#263b45" />
          <circle cx="340" cy="340" r="44" fill="#e7ddc8" />
        </svg>
      </Artboard>
      <div
        style={{
          ...absolute,
          background: "#e7ddc8",
          maskImage: "radial-gradient(circle at 50% 50%, transparent 0 56px, #000 57px)",
          transformOrigin: "50% 50%",
          animation: "zoom-blast 4.8s linear both",
        }}
      >
        <Artboard aspect={frame} size={680}>
          <svg viewBox="0 0 680 680" width="100%" height="100%" aria-hidden="true">
            <circle cx="340" cy="340" r="200" stroke="#d67553" strokeWidth="110" fill="none" />
            <circle cx="340" cy="340" r="92" stroke="#263b45" strokeWidth="5" fill="none" />
            {[0, 90, 180, 270].map((a) => (
              <path
                key={a}
                d="M340 34V63"
                transform={`rotate(${a} 340 340)`}
                stroke="#263b45"
                strokeWidth="5"
              />
            ))}
          </svg>
        </Artboard>
      </div>
      <style>{`
   @keyframes zoom-blast {
    0%,15%{transform:scale(1);animation-timing-function:cubic-bezier(.72,0,.88,.22)}
    29%,60%{transform:scale(32);animation-timing-function:cubic-bezier(.12,.7,.25,1)}
    84%,100%{transform:scale(1)}
   }
   @keyframes blast-arrival {
    0%,22%{transform:rotate(-14deg) scale(.9);animation-timing-function:cubic-bezier(.12,.7,.25,1)}
    36%,60%{transform:rotate(0) scale(1);animation-timing-function:cubic-bezier(.45,0,.55,1)}
    83%,100%{transform:rotate(-14deg) scale(.9)}
   }
  `}</style>
    </GeometryStage>
  );
}
