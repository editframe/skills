import type { CSSProperties } from "react";
import { Solo, type Aspect } from "../src/primitives";
import { TypeField, displayType } from "./shared/type-studies";

// Intent: the solid word leads; outlines carry its momentum, then return to it.
export const duration = 6;
export const posterTime = 2.8;
export const aspect = "landscape" as const;
export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: Aspect }) {
  return (
    <Solo id={id} aspect={frame} duration={duration}>
      <TypeField background="#23251f" color="#d9e9a1">
        <div
          style={{
            position: "absolute",
            left: "7%",
            top: "50%",
            width: "86%",
            height: "23cqw",
            marginTop: "-8cqw",
            ...displayType,
            fontSize: "23cqw",
          }}
        >
          {[5, 4, 3, 2, 1, 0].map((layer) => (
            <div
              key={layer}
              style={
                {
                  position: "absolute",
                  inset: 0,
                  color: layer ? "transparent" : "#d9e9a1",
                  WebkitTextStroke: layer ? ".2cqw #d9e9a1" : undefined,
                  opacity: layer ? 0.65 - layer * 0.085 : 1,
                  "--echo-shift": `${layer * -2.2}cqw`,
                  animation: `ty-echo-release 5.4s ${layer * 60}ms linear both`,
                } as CSSProperties
              }
            >
              ECHO
            </div>
          ))}
        </div>
      </TypeField>
      <style>{`@keyframes ty-echo-release {
      0%,10% { transform: translateY(0); animation-timing-function: ease-in-out; }
      16% { transform: translateY(1.2cqw); animation-timing-function: cubic-bezier(.15,.7,.25,1); }
      32% { transform: translateY(calc(var(--echo-shift) - .6cqw)); animation-timing-function: ease-out; }
      42%,65% { transform: translateY(var(--echo-shift)); animation-timing-function: cubic-bezier(.6,0,.3,1); }
      83% { transform: translateY(.25cqw); animation-timing-function: ease-out; }
      91%,100% { transform: translateY(0); }
    }`}</style>
    </Solo>
  );
}
