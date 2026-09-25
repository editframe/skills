import { Timegroup } from "@editframe/react";
import { ExampleRoot, Scene, type Aspect } from "../src/primitives";
import { TypeField, displayType, serifType, typeEase } from "./shared/type-studies";

export const duration = 12;
export const aspect = "landscape" as const;

export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: Aspect }) {
  const wide = frame === "landscape";
  return (
    <ExampleRoot id={id} aspect={frame}>
      <Timegroup mode="sequence" className="absolute inset-0">
        <Scene duration={4}>
          <TypeField background="#eeeadf" color="#1f392f">
            <div
              style={{
                position: "absolute",
                top: "25%",
                left: "8%",
                right: "8%",
                ...serifType,
                fontSize: wide ? "15cqw" : "16cqw",
              }}
            >
              {["The art", "of noticing."].map((line, i) => (
                <div key={line} style={{ overflow: "hidden", paddingBottom: ".1em" }}>
                  <div
                    style={{
                      fontStyle: i ? "italic" : "normal",
                      animation: `ty-sequence-reveal 1200ms ${180 + i * 300}ms ${typeEase} both`,
                    }}
                  >
                    {line}
                  </div>
                </div>
              ))}
            </div>
            <div
              style={{
                position: "absolute",
                left: "8%",
                bottom: "19%",
                width: "84%",
                height: 1,
                background: "currentColor",
                transformOrigin: "left",
                animation: `ty-sequence-rule 1000ms 1100ms ${typeEase} both`,
              }}
            />
          </TypeField>
        </Scene>
        <Scene duration={4}>
          <TypeField background="#1f392f" color="#d6e7a5">
            <div
              style={{
                position: "absolute",
                top: "26%",
                left: "8%",
                right: "8%",
                ...displayType,
                fontSize: "18cqw",
              }}
            >
              {["LOOK", "CLOSER"].map((line, i) => (
                <div key={line} style={{ overflow: "hidden", paddingBottom: ".1em" }}>
                  <div
                    style={{
                      animation: `ty-sequence-reveal 900ms ${100 + i * 240}ms ${typeEase} both`,
                      color: i ? "transparent" : undefined,
                      WebkitTextStroke: i ? "2px #d6e7a5" : undefined,
                    }}
                  >
                    {line}
                  </div>
                </div>
              ))}
            </div>
          </TypeField>
        </Scene>
        <Scene duration={4}>
          <TypeField background="#dd694c" color="#252e29">
            <div
              style={{
                position: "absolute",
                top: "29%",
                left: "8%",
                right: "8%",
                ...serifType,
                fontSize: wide ? "17cqw" : "20cqw",
                animation: `ty-sequence-final 1600ms 100ms ${typeEase} both`,
              }}
            >
              Small
              <br />
              <span style={{ fontStyle: "italic" }}>wonders.</span>
            </div>
          </TypeField>
        </Scene>
      </Timegroup>
      <style>{`@keyframes ty-sequence-reveal { from { transform: translateY(120%); } to { transform: translateY(0); } } @keyframes ty-sequence-rule { from { transform: scaleX(0); } to { transform: scaleX(1); } } @keyframes ty-sequence-final { from { opacity: 0; transform: scale(.94); letter-spacing: -.02em; } to { opacity: 1; transform: scale(1); letter-spacing: -.065em; } }`}</style>
    </ExampleRoot>
  );
}
