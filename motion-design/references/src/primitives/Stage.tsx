import { Timegroup } from "@editframe/react";
import { createContext, useContext, type CSSProperties, type ReactNode } from "react";
import { Grain, Vignette } from "./atmosphere";
import { ASPECT, THEME, themeFor, type Aspect, type ThemeName } from "./tokens";

export const AspectContext = createContext<Aspect>("landscape");

export function useAspect() {
  return useContext(AspectContext);
}

export function ExampleRoot({
  id,
  aspect,
  theme,
  family,
  children,
  background,
}: {
  id: string;
  aspect: Aspect;
  theme?: ThemeName;
  family?: string;
  children: ReactNode;
  background?: string;
}) {
  const name = theme ?? themeFor(aspect, family);
  const t = THEME[name];
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
          <Vignette strength={name === "social" ? 0.28 : 0.5} />
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
  family,
  children,
  background,
}: {
  id: string;
  aspect: Aspect;
  duration: number;
  theme?: ThemeName;
  family?: string;
  children: ReactNode;
  background?: string;
}) {
  return (
    <ExampleRoot id={id} aspect={aspect} theme={theme} family={family} background={background}>
      <Scene duration={duration}>{children}</Scene>
    </ExampleRoot>
  );
}

export function Frame({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={["frame", className].filter(Boolean).join(" ")}>{children}</div>;
}

export function Rail({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={["rail", className].filter(Boolean).join(" ")}>{children}</div>;
}
