import { Timegroup } from "@editframe/react";
import { ExampleRoot, Scene, type Aspect } from "../src/primitives";
import { Artboard } from "./shared/geometry-studies";

export const duration = 7.2;
export const posterTime = 3.5;
export const aspect = "landscape" as const;

// The disc stays at exactly (400,400), r=155, through every hard cut.
// Identity changes through context: a record, a planet, a camera lens.
export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: Aspect }) {
  const planetClip = `relay-planet-${id.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
  return (
    <ExampleRoot id={id} aspect={frame} background="#f2b08c">
      <Timegroup mode="sequence" className="absolute inset-0">
        <Scene duration={2.4} style={{ background: "#f2b08c" }}>
          <Artboard aspect={frame} size={800}>
            <svg
              viewBox="0 0 800 800"
              width="100%"
              height="100%"
              aria-label="A vinyl record spins beneath a tonearm"
            >
              <rect x="95" y="130" width="610" height="540" rx="28" fill="#e99472" />
              <path
                d="M142 618H241M142 599H203"
                stroke="#91492f"
                strokeOpacity=".4"
                strokeWidth="4"
              />
              <circle cx="400" cy="400" r="155" fill="#203743" />
              {[68, 83, 99, 116, 134, 146].map((r) => (
                <circle
                  key={r}
                  cx="400"
                  cy="400"
                  r={r}
                  fill="none"
                  stroke="#6b8590"
                  strokeOpacity=".35"
                  strokeWidth="1.5"
                />
              ))}
              <g style={{ transformOrigin: "400px 400px", animation: "relay-record 2.4s both" }}>
                <path
                  d="M302 302A138.6 138.6 0 0 1 435 266M500 496A138.6 138.6 0 0 1 367 534"
                  fill="none"
                  stroke="#9fb4b8"
                  strokeOpacity=".25"
                  strokeWidth="7"
                />
                <circle cx="400" cy="400" r="51" fill="#f5c954" />
                <path d="M373 382H427M373 393H405" stroke="#203743" strokeWidth="5" />
              </g>
              <circle cx="400" cy="400" r="8" fill="#f2b08c" />
              <g style={{ transformOrigin: "614px 239px", animation: "relay-arm 2.4s both" }}>
                <path
                  d="M614 239V408L530 484"
                  stroke="#203743"
                  strokeWidth="15"
                  strokeLinejoin="round"
                  fill="none"
                />
                <path
                  d="M614 239V408L530 484"
                  stroke="#f7ddc4"
                  strokeWidth="6"
                  strokeLinejoin="round"
                  fill="none"
                />
                <rect
                  x="512"
                  y="465"
                  width="27"
                  height="55"
                  rx="5"
                  transform="rotate(46 526 492)"
                  fill="#203743"
                />
              </g>
              <circle cx="614" cy="239" r="23" fill="#203743" />
              <circle cx="614" cy="239" r="10" fill="#f5c954" />
            </svg>
          </Artboard>
        </Scene>
        <Scene duration={2.4} style={{ background: "#152c3a" }}>
          <Artboard aspect={frame} size={800}>
            <svg
              viewBox="0 0 800 800"
              width="100%"
              height="100%"
              aria-label="The same disc becomes a banded planet with an orbiting moon"
            >
              <defs>
                <clipPath id={planetClip}>
                  <circle cx="400" cy="400" r="155" />
                </clipPath>
              </defs>
              {[
                [136, 190],
                [637, 145],
                [191, 624],
                [664, 588],
                [537, 680],
                [95, 455],
              ].map(([x, y], i) => (
                <path
                  key={i}
                  d={`M${x - 5} ${y}H${x + 5}M${x} ${y - 5}V${y + 5}`}
                  stroke="#9ab2bc"
                  strokeWidth="2"
                />
              ))}
              <circle
                cx="400"
                cy="400"
                r="265"
                stroke="#9ab2bc"
                strokeOpacity=".3"
                strokeWidth="1.5"
                fill="none"
              />
              <circle cx="400" cy="400" r="155" fill="#f5c954" />
              <g clipPath={`url(#${planetClip})`}>
                <g style={{ transformOrigin: "400px 400px", animation: "relay-bands 2.4s both" }}>
                  {[-2, -1, 0, 1, 2].map((i) => (
                    <path
                      key={i}
                      d={`M130 ${370 + i * 64}Q400 ${250 + i * 64} 670 ${370 + i * 64}`}
                      stroke={i % 2 ? "#d97f52" : "#f1ab65"}
                      strokeWidth={i % 2 ? "28" : "14"}
                      fill="none"
                    />
                  ))}
                </g>
                <ellipse cx="286" cy="400" rx="109" ry="178" fill="#fff0aa" fillOpacity=".2" />
              </g>
              <g style={{ transformOrigin: "400px 400px", animation: "relay-moon 2.4s both" }}>
                <circle cx="400" cy="135" r="21" fill="#bbd4d0" />
                <circle cx="393" cy="129" r="5" fill="#849fa4" />
              </g>
            </svg>
          </Artboard>
        </Scene>
        <Scene duration={2.4} style={{ background: "#d9e5db" }}>
          <Artboard aspect={frame} size={800}>
            <svg
              viewBox="0 0 800 800"
              width="100%"
              height="100%"
              aria-label="The disc becomes a camera lens; its aperture closes and opens"
            >
              <path d="M112 258H251L286 208H507L541 258H688V592H112Z" fill="#78968c" />
              <rect x="134" y="275" width="532" height="290" rx="22" fill="#a9bdb0" />
              <rect x="149" y="239" width="62" height="20" rx="6" fill="#203743" />
              <rect x="559" y="300" width="69" height="38" rx="4" fill="#e7edde" />
              <circle cx="400" cy="400" r="175" fill="#d9e5db" />
              <circle cx="400" cy="400" r="155" fill="#203743" />
              {[137, 143].map((r) => (
                <circle
                  key={r}
                  cx="400"
                  cy="400"
                  r={r}
                  stroke="#8da7aa"
                  strokeOpacity=".5"
                  strokeWidth="2"
                  fill="none"
                />
              ))}
              <circle cx="400" cy="400" r="115" fill="#4f7275" />
              <g style={{ transformOrigin: "400px 400px", animation: "relay-iris 2.4s both" }}>
                <polygon points="400,313 475,357 475,443 400,487 325,443 325,357" fill="#142c3b" />
                {Array.from({ length: 6 }, (_, i) => (
                  <path
                    key={i}
                    d="M400 313L485 285"
                    transform={`rotate(${i * 60} 400 400)`}
                    stroke="#d9e5db"
                    strokeOpacity=".48"
                    strokeWidth="2"
                  />
                ))}
              </g>
              <circle cx="363" cy="363" r="20" fill="#d9e5db" fillOpacity=".17" />
              <circle cx="603" cy="520" r="8" fill="#f4ba70" />
            </svg>
          </Artboard>
        </Scene>
      </Timegroup>
      <style>{`
      @keyframes relay-record {0%,15%{transform:rotate(0)}80%,100%{transform:rotate(180deg)}}
      @keyframes relay-arm {0%,10%{transform:rotate(-18deg)}25%,70%{transform:rotate(0)}88%,100%{transform:rotate(-18deg)}}
      @keyframes relay-bands {0%,15%{transform:translateY(0) rotate(-18deg)}80%,100%{transform:translateY(18px) rotate(18deg)}}
      @keyframes relay-moon {0%,15%{transform:rotate(-45deg)}80%,100%{transform:rotate(135deg)}}
      @keyframes relay-iris {0%,18%{transform:rotate(0) scale(1);animation-timing-function:cubic-bezier(.6,0,.3,1)}48%,60%{transform:rotate(38deg) scale(.32);animation-timing-function:cubic-bezier(.2,.65,.3,1)}84%,100%{transform:rotate(0) scale(1)}}
    `}</style>
    </ExampleRoot>
  );
}
