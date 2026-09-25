import type { Aspect } from "../src/primitives";
import { FocusStudy, AppHeader, Box, Label, motion, focus } from "./shared/FocusStudy";
import { SettingPanel, settingLayout } from "./shared/FocusSettings";
export const duration = 8;
export const posterTime = 4.5;
export const aspect = "landscape" as const;
export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: Aspect }) {
  return (
    <FocusStudy
      id={id}
      aspect={frame}
      duration={duration}
      title="Contrast → one clear priority"
      note="Lower the surroundings. Raise the target. Restore context."
    >
      {(h, tall) => {
        const p = settingLayout(h, tall);
        return (
          <>
            <Box h={h} />
            <AppHeader section="Reading preferences" />
            <SettingPanel
              x={p.x1}
              y={p.y1}
              w={p.w}
              h={p.h}
              title="SPACING"
              value="Comfortable"
              changeAt={110}
            />
            <SettingPanel
              x={p.x2}
              y={p.y2}
              w={p.w}
              h={p.h}
              title="TYPE SIZE"
              value="Large"
              changeAt={40}
            />
            <g style={motion("fci-isolate", duration)}>
              <rect width="720" height={h} rx="14" fill="#192132" opacity=".44" />
              <SettingPanel
                x={p.x2}
                y={p.y2}
                w={p.w}
                h={p.h}
                title="TYPE SIZE"
                value="Large"
                changeAt={40}
                active
              />
            </g>
            <style>{`@keyframes fci-isolate {0%,21%{opacity:0;animation-timing-function:ease-in-out}29%,73%{opacity:1;animation-timing-function:ease-in-out}83%,100%{opacity:0}}`}</style>
          </>
        );
      }}
    </FocusStudy>
  );
}
