import { GeometryStage, Artboard, type StudyProps } from "./shared/geometry-studies";
export const duration = 5;
export const posterTime = 1.4;
export const aspect = "landscape" as const;
export function Video({ id, aspect: frame = aspect }: StudyProps) {
  return (
    <GeometryStage id={id} aspect={frame} duration={duration} background="#e8b8c9" ink="#592841">
      <Artboard aspect={frame} size={650}>
        <div
          style={{
            position: "absolute",
            left: 40,
            right: 40,
            top: 325,
            height: 2,
            background: "#59284130",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 130,
            borderRadius: "50%",
            border: "2px dashed #59284150",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 130,
            borderRadius: "50%",
            background: "#592841",
            animation: "geo-elastic 5s linear both",
            transformOrigin: "50% 50%",
          }}
        >
          <div
            style={{ position: "absolute", inset: 100, borderRadius: "50%", background: "#f6d566" }}
          />
        </div>
        {[0, 1].map((i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: i ? 520 : 112,
              top: 273,
              width: 18,
              height: 104,
              borderRadius: 9,
              background: "#f6d566",
              animation: `geo-press-${i} 5s linear both`,
            }}
          />
        ))}
      </Artboard>
      <style>{`
      @keyframes geo-elastic {
        0%,12%{transform:scale(1);animation-timing-function:cubic-bezier(.45,0,.65,1)}
        31%{transform:scale(.68,1.47);animation-timing-function:cubic-bezier(.12,.65,.25,1)}
        40%{transform:scale(1.18,.847);animation-timing-function:ease-in-out}
        49%{transform:scale(.93,1.075);animation-timing-function:ease-in-out}
        57%{transform:scale(1.024,.976);animation-timing-function:ease-in-out}
        65%,100%{transform:scale(1)}
      }
      @keyframes geo-press-0{0%,12%{transform:translateX(0);animation-timing-function:cubic-bezier(.45,0,.65,1)}31%{transform:translateX(62.4px);animation-timing-function:cubic-bezier(.1,.8,.2,1)}36%,70%{transform:translateX(-58px);animation-timing-function:ease-in-out}90%,100%{transform:translateX(0)}}
      @keyframes geo-press-1{0%,12%{transform:translateX(0);animation-timing-function:cubic-bezier(.45,0,.65,1)}31%{transform:translateX(-62.4px);animation-timing-function:cubic-bezier(.1,.8,.2,1)}36%,70%{transform:translateX(58px);animation-timing-function:ease-in-out}90%,100%{transform:translateX(0)}}
    `}</style>
    </GeometryStage>
  );
}
