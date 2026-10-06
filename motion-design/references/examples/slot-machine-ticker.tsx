import { Solo, type Aspect } from "../src/primitives";
import { TypeField, displayType } from "./shared/type-studies";

// Intent: discrete word substitution. A small downward preload precedes each lift.
// Repeat the first cell at the end so the loop joins on an identical held frame.
export const duration = 6;
export const posterTime = 1.8;
export const aspect = "landscape" as const;
export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: Aspect }) {
  return (
    <Solo id={id} aspect={frame} duration={duration}>
      <TypeField background="#f0e6d2" color="#a33e32">
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            ...displayType,
            fontSize: "17cqw",
            letterSpacing: "-.06em",
          }}
        >
          <div style={{ height: "1.15em", overflow: "hidden", width: "90%", textAlign: "center" }}>
            <div style={{ animation: "ty-slot-cycle 6s linear both" }}>
              {["MAKE", "MOVE", "LOOP", "MAKE"].map((word, i) => (
                <div key={i} style={{ height: "1.15em", lineHeight: "1.15em" }}>
                  {word}
                </div>
              ))}
            </div>
          </div>
        </div>
      </TypeField>
      <style>{`@keyframes ty-slot-cycle {
      0%,10% { transform: translateY(0); animation-timing-function: ease-in-out; }
      14% { transform: translateY(.045em); animation-timing-function: cubic-bezier(.65,0,.2,1); }
      23% { transform: translateY(-1.18em); animation-timing-function: ease-out; }
      27%,40% { transform: translateY(-1.15em); animation-timing-function: ease-in-out; }
      44% { transform: translateY(-1.105em); animation-timing-function: cubic-bezier(.65,0,.2,1); }
      53% { transform: translateY(-2.33em); animation-timing-function: ease-out; }
      57%,70% { transform: translateY(-2.3em); animation-timing-function: ease-in-out; }
      74% { transform: translateY(-2.255em); animation-timing-function: cubic-bezier(.65,0,.2,1); }
      83% { transform: translateY(-3.48em); animation-timing-function: ease-out; }
      87%,100% { transform: translateY(-3.45em); }
    }`}</style>
    </Solo>
  );
}
