import { Solo, type Aspect } from "../src/primitives";
import { TypeField, serifType, typeEase } from "./shared/type-studies";

export const duration = 5;
export const aspect = "portrait" as const;

export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: Aspect }) {
  return (
    <Solo id={id} aspect={frame} duration={duration}>
      <TypeField background="#e9dfca" color="#68302c">
        <div style={{ position: "absolute", inset: "6%", border: "1px solid #68302c66" }} />
        <div
          style={{
            position: "absolute",
            top: frame === "landscape" ? "29%" : "32%",
            left: 0,
            width: "100%",
            textAlign: "center",
            ...serifType,
            fontSize: "19cqw",
            animation: `ty-masthead-in 1400ms 100ms ${typeEase} both`,
          }}
        >
          Still<span style={{ fontStyle: "italic" }}>life</span>
        </div>
        <div
          style={{
            position: "absolute",
            top: frame === "landscape" ? "68%" : "54%",
            left: "29%",
            width: "42%",
            height: 1,
            background: "currentColor",
            transformOrigin: "center",
            animation: `ty-masthead-rule 900ms 800ms ${typeEase} both`,
          }}
        />
      </TypeField>
      <style>{`@keyframes ty-masthead-in { from { opacity: 0; letter-spacing: .04em; transform: translateY(25px); } to { opacity: 1; letter-spacing: -.065em; transform: translateY(0); } } @keyframes ty-masthead-rule { from { transform: scaleX(0); } to { transform: scaleX(1); } }`}</style>
    </Solo>
  );
}
