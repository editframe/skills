import { Timegroup } from "@editframe/react";
import { createContext, useContext, type CSSProperties, type ReactNode } from "react";
import { Grain, Vignette } from "./atmosphere";
import { ASPECT, THEME, themeFor, type Aspect, type ThemeName } from "./tokens";

const AspectContext = createContext<Aspect>("landscape");

export function useAspect() {
  return useContext(AspectContext);
}

export function ExampleRoot({
  id,
  aspect,
  theme,
  children,
  background,
}: {
  id: string;
  aspect: Aspect;
  theme?: ThemeName;
  children: ReactNode;
  background?: string;
}) {
  const t = THEME[theme ?? themeFor(aspect)];
  const [width, height] = ASPECT[aspect];
  return (
    <AspectContext.Provider value={aspect}>
      <Timegroup
        id={id}
        mode="contain"
        loop
        className="relative overflow-hidden"
        style={{
          width,
          height,
          background: background ?? t.background,
          color: t.color,
          fontFamily: t.fontFamily,
        }}
      >
        <div className="frame-root" data-aspect={aspect}>
          <Grain />
          <Vignette strength={t.vignette} />
          {children}
        </div>
      </Timegroup>
    </AspectContext.Provider>
  );
}

export function Scene({
  duration,
  children,
  className,
  style,
}: {
  duration: number;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <Timegroup
      mode="fixed"
      duration={`${duration}s`}
      className={["absolute inset-0 overflow-hidden", className].filter(Boolean).join(" ")}
      style={style}
    >
      {children}
    </Timegroup>
  );
}

export function Solo({
  id,
  aspect,
  duration,
  theme,
  children,
  background,
}: {
  id: string;
  aspect: Aspect;
  duration: number;
  theme?: ThemeName;
  children: ReactNode;
  background?: string;
}) {
  return (
    <ExampleRoot id={id} aspect={aspect} theme={theme} background={background}>
      <Scene duration={duration}>{children}</Scene>
    </ExampleRoot>
  );
}
