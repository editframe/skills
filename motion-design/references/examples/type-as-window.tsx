import { Solo, type Aspect } from "../src/primitives";
import { TypeField, displayType } from "./shared/type-studies";

// Intent: stationary letterforms reveal a moving color field; no entrance competes with the texture.
export const duration = 8;
export const posterTime = 3.2;
export const aspect = "portrait" as const;

export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: Aspect }) {
  return (
    <Solo id={id} aspect={frame} duration={duration}>
      <TypeField background="#131e24" color="#f1ead9">
        <div
          style={{
            position: "absolute",
            left: "5%",
            right: "5%",
            top: "50%",
            transform: "translateY(-50%)",
            textAlign: "center",
            ...displayType,
            fontSize: frame === "landscape" ? "17cqw" : "26cqw",
            lineHeight: 0.85,
          }}
        >
          {["LIQ", "UID"].map((word) => (
            <div
              key={word}
              style={{
                paddingBottom: ".08em",
                backgroundImage:
                  "repeating-linear-gradient(115deg, #f4eabf 0%, #db774c 13%, #4e8b91 24%, #d4e1bb 35%, #6d8c9b 48%, #f4eabf 60%)",
                backgroundSize: "250% 240%",
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                color: "transparent",
                WebkitTextFillColor: "transparent",
                animation: "ty-window-ink 8s ease-in-out infinite",
              }}
            >
              {word}
            </div>
          ))}
        </div>
      </TypeField>
      <style>{`@keyframes ty-window-ink { 0%, 10%, 100% { background-position: 0% 30%; } 45%, 55% { background-position: 100% 70%; } }`}</style>
    </Solo>
  );
}
