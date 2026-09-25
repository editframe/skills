import { type Aspect } from "../src/primitives";
import { SpatialStudy } from "./shared/SpatialStudy";
export const duration = 6;
export const aspect = "landscape" as const;
// Intent: make suspension legible through the relationship between object and shadow.
// Emotion: calm. Material: light ceramic. Exaggeration: moderate. Context: seamless study.
export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: Aspect }) {
  return (
    <SpatialStudy id={id} aspect={frame} duration={duration} background="#e3e8df" color="#293a31">
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
        <div style={{ position: "relative", width: "60cqmin", height: "60cqmin" }}>
          <div
            style={{
              position: "absolute",
              left: "15%",
              right: "15%",
              height: "7%",
              bottom: "10%",
              borderRadius: "50%",
              background: "#344332",
              filter: "blur(2cqmin)",
              animation: "study-shadow 6s ease-in-out infinite",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: "7% 16% 25%",
              borderRadius: "48% 48% 44% 44%",
              background:
                "radial-gradient(circle at 32% 24%, #f6f7eb 0%, #a7b997 43%, #526c4e 80%, #314c36)",
              boxShadow: "inset -2cqmin -2cqmin 4cqmin #28452d44",
              animation: "study-float 6s ease-in-out infinite",
            }}
          />
        </div>
      </div>
      <style>{`@keyframes study-float {0%,100%{transform:translateY(3cqmin) rotate(-5deg)}50%{transform:translateY(-5cqmin) rotate(5deg)}} @keyframes study-shadow {0%,100%{transform:scaleX(.8);opacity:.3}50%{transform:scaleX(1.15);opacity:.13}}`}</style>
    </SpatialStudy>
  );
}
