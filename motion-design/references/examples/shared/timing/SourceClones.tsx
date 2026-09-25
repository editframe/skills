import { TypeField, displayType } from "../type-studies";
import { Artboard } from "../geometry-studies";

// Visual clones of the five named catalog studies. Their artwork, palette, masks,
// and spatial relationships stay fixed; TimingStudy supplies the gesture poses.
// Keep these independent of the originals so timing experiments cannot retime them.
export function WordClone() {
  return (
    <TypeField background="#e9e7dc" color="#242824">
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "8%",
          right: "8%",
          transform: "translateY(-50%)",
          ...displayType,
          fontSize: 203.52,
        }}
      >
        {[
          ["Give", "it"],
          ["some", "space."],
        ].map((line, row) => (
          <div key={row} style={{ display: "flex", gap: ".23em", paddingBottom: ".12em" }}>
            {line.map((word, i) => (
              <span
                key={word}
                style={{ display: "block", overflow: "hidden", paddingBottom: ".08em" }}
              >
                <span
                  data-timing-word={row * 2 + i}
                  style={{ display: "block", color: row === 1 && i === 1 ? "#d54c32" : undefined }}
                >
                  {word}
                </span>
              </span>
            ))}
          </div>
        ))}
      </div>
      <div
        data-timing-rule=""
        style={{
          position: "absolute",
          left: "8%",
          bottom: "18%",
          width: "20%",
          height: 2,
          background: "currentColor",
          transformOrigin: "left",
        }}
      />
    </TypeField>
  );
}

export function MorphClone() {
  return (
    <Artboard aspect="square" size={650}>
      <div style={{ position: "absolute", inset: 60, border: "1px solid #26376435" }} />
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          data-timing-morph={i}
          style={{
            position: "absolute",
            inset: 95 + i * 54,
            background: ["#263764", "#ea7654", "#f8df96"][i],
          }}
        />
      ))}
    </Artboard>
  );
}

export function OrbitClone() {
  return (
    <Artboard aspect="square" size={700}>
      <svg
        width="700"
        height="700"
        viewBox="0 0 700 700"
        fill="none"
        aria-label="Three orbits converge into a shared alignment and release"
      >
        <path d="M350 35V665M35 350H665" stroke="#e8e0b9" strokeOpacity=".13" />
        <g data-timing-ray="">
          <path
            d="M350 350V54"
            stroke="#e8e0b9"
            strokeOpacity=".38"
            strokeWidth="2"
            strokeDasharray="3 9"
          />
        </g>
        {[110, 195, 280].map((r, i) => (
          <g key={r}>
            <circle
              cx="350"
              cy="350"
              r={r}
              stroke="#e8e0b9"
              strokeOpacity=".26"
              strokeWidth="1.5"
            />
            <g
              data-timing-orbit={i}
              style={{ transformOrigin: "350px 350px", transformBox: "view-box" }}
            >
              <circle
                cx="350"
                cy={350 - r}
                r={17 + i * 7}
                fill={["#e8e0b9", "#e8a363", "#8dada0"][i]}
              />
              <circle cx="350" cy={350 + r} r={4} fill="#e8e0b9" fillOpacity=".7" />
            </g>
          </g>
        ))}
        <circle cx="350" cy="350" r="21" fill="#e8e0b9" />
      </svg>
    </Artboard>
  );
}

export function WipeClone() {
  return (
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
      <div style={{ position: "absolute", inset: 0, background: "#ed5b39" }} />
      {["#fdbda0", "#442631", "#fae8d0"].map((color, i) => (
        <div
          key={color}
          data-timing-wipe={i}
          style={{
            position: "absolute",
            left: `${(i * 100) / 3}%`,
            width: "33.5%",
            top: 0,
            bottom: 0,
            background: color,
          }}
        />
      ))}
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
  );
}

export function ChartClone() {
  return (
    <div
      style={{
        position: "absolute",
        inset: "22% 9%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      <svg viewBox="0 0 900 400" style={{ width: "100%", maxHeight: 464.4, overflow: "visible" }}>
        {[60, 150, 240, 330].map((y) => (
          <path key={y} d={`M0 ${y}H900`} stroke="#c4c4b5" strokeWidth="1" />
        ))}
        <path
          data-timing-line=""
          d="M0 320 C80 320 90 260 180 265 S310 325 360 210 S460 250 540 155 S640 230 720 105 S830 125 890 42"
          fill="none"
          stroke="#606d4e"
          strokeWidth="7"
          strokeLinecap="round"
          pathLength="1"
          strokeDasharray="1"
        />
        <g data-timing-endpoint="">
          <circle cx="890" cy="42" r="10" fill="#606d4e" />
          <text x="880" y="5" textAnchor="end" fontSize="25" fill="#393d34">
            96
          </text>
        </g>
        {["01", "02", "03", "04", "05", "06"].map((s, i) => (
          <text key={s} x={i * 174} y="385" fontSize="18" fill="#6c7063" fontFamily="monospace">
            {s}
          </text>
        ))}
      </svg>
    </div>
  );
}
export const SOURCE_CLONES = [WordClone, MorphClone, OrbitClone, WipeClone, ChartClone];
