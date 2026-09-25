import type { Aspect } from "../src/primitives";
import { FocusStudy, AppHeader, Box, Label, motion } from "./shared/FocusStudy";
import { SettingPanel, settingLayout } from "./shared/FocusSettings";
export const duration = 8;
export const posterTime = 4.8;
export const aspect = "landscape" as const;
export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: Aspect }) {
  return (
    <FocusStudy
      id={id}
      aspect={frame}
      duration={duration}
      title="Selective blur → a focus handoff"
      note="Geometry holds still while the readable region changes."
    >
      {(h, tall) => {
        const p = settingLayout(h, tall);
        return (
          <>
            <Box h={h} />
            <AppHeader section="Reading preferences" />
            <g style={motion("fsb-left", duration)}>
              <SettingPanel
                x={p.x1}
                y={p.y1}
                w={p.w}
                h={p.h}
                title="SPACING"
                value="Comfortable"
                changeAt={24}
              />
            </g>
            <g style={motion("fsb-right", duration)}>
              <SettingPanel
                x={p.x2}
                y={p.y2}
                w={p.w}
                h={p.h}
                title="TYPE SIZE"
                value="Large"
                changeAt={55}
              />
            </g>
            <style>{`@keyframes fsb-left {0%,41%{filter:blur(0px);animation-timing-function:ease-in-out}49%,75%{filter:blur(4px);animation-timing-function:ease-in-out}84%,100%{filter:blur(0px)}} @keyframes fsb-right {0%,12%{filter:blur(0px);animation-timing-function:ease-in-out}21%,41%{filter:blur(4px);animation-timing-function:ease-in-out}49%,100%{filter:blur(0px)}}`}</style>
          </>
        );
      }}
    </FocusStudy>
  );
}
