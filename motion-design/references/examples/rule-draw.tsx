import { Solo, type Aspect } from "../src/primitives";
import { TypeField, serifType, typeEase } from "./shared/type-studies";

export const duration = 4;
export const aspect = "landscape" as const;

export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: Aspect }) {
  return (
    <Solo id={id} aspect={frame} duration={duration}>
      <TypeField background="#efece2" color="#293b30">
        <div style={{ position: "absolute", left: "9%", right: "9%", top: "27%" }}>
          <div
            style={{
              ...serifType,
              fontSize: frame === "landscape" ? "12.5cqw" : "16cqw",
              animation: "ty-rule-title 600ms 100ms both",
            }}
          >
            Ways of
            <br />
            <span style={{ fontStyle: "italic" }}>seeing.</span>
          </div>
          <div
            style={{
              width: "100%",
              height: 2,
              background: "#ad543a",
              marginTop: "5cqh",
              transformOrigin: "left",
              animation: `ty-rule-draw 1100ms 500ms ${typeEase} both`,
            }}
          />
        </div>
      </TypeField>
      <style>{`@keyframes ty-rule-draw { from { transform: scaleX(0); } to { transform: scaleX(1); } } @keyframes ty-rule-title { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </Solo>
  );
}
