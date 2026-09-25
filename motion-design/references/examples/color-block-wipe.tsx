import { GeometryStage, absolute, type StudyProps } from "./shared/geometry-studies";
export const duration = 5.2;
export const posterTime = 2.6;
export const aspect = "portrait" as const;
export function Video({ id, aspect: frame = aspect }: StudyProps) {
  return (
    <GeometryStage id={id} aspect={frame} duration={duration} background="#fae8d0" ink="#442631">
      <div
        style={{
          position: "absolute",
          left: "16%",
          right: "16%",
          top: "20%",
          bottom: "20%",
          overflow: "hidden",
        }}
      >
        <div style={{ ...absolute, background: "#ed5b39" }} />
        {["#fdbda0", "#442631", "#fae8d0"].map((color, i) => (
          <div
            key={color}
            style={{
              position: "absolute",
              left: `${(i * 100) / 3}%`,
              width: "33.5%",
              top: 0,
              bottom: 0,
              background: color,
              animation: `geo-block-${i} 5.2s linear both`,
            }}
          />
        ))}
        {/* A fixed silhouette makes the palette change visible across every passing block. */}
        <div
          style={{
            position: "absolute",
            width: 580,
            height: 580,
            borderRadius: "50%",
            left: "50%",
            top: "50%",
            marginLeft: -290,
            marginTop: -290,
            background: "#a8c5a7",
            mixBlendMode: "difference",
          }}
        />
      </div>
      <style>
        {[0, 1, 2]
          .map(
            (i) => `@keyframes geo-block-${i} {
   0%,${18 + [0, 3, 7][i]}%{transform:translateY(101%);animation-timing-function:cubic-bezier(.7,0,.18,1)}
   ${37 + [0, 3, 7][i]}%,${66 + (2 - i) * 3}%{transform:translateY(0);animation-timing-function:cubic-bezier(.7,0,.18,1)}
   ${85 + (2 - i) * 3}%,100%{transform:translateY(-101%)}
  }`,
          )
          .join("\n")}
      </style>
    </GeometryStage>
  );
}
