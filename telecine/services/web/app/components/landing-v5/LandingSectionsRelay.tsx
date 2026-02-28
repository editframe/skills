import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from "react";

function LazySection({ children, minHeight = "600px" }: { children: ReactNode; minHeight?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} style={visible ? undefined : { minHeight }}>
      {visible && children}
    </div>
  );
}

const CodeExamplesSection = lazy(() =>
  import("./sections/CodeExamplesSection").then((m) => ({ default: m.CodeExamplesSection }))
);
const PromptToToolSection = lazy(() =>
  import("./sections/PromptToToolSection").then((m) => ({ default: m.PromptToToolSection }))
);
const RenderAnywhereSection = lazy(() =>
  import("./sections/RenderAnywhereSection").then((m) => ({ default: m.RenderAnywhereSection }))
);
const ArchitectureSection = lazy(() =>
  import("./sections/ArchitectureSection").then((m) => ({ default: m.ArchitectureSection }))
);
const TemplatedRenderingSection = lazy(() =>
  import("./sections/TemplatedRenderingSection").then((m) => ({ default: m.TemplatedRenderingSection }))
);
const GettingStartedSection = lazy(() =>
  import("./sections/GettingStartedSection").then((m) => ({ default: m.GettingStartedSection }))
);
const FooterSection = lazy(() =>
  import("./sections/FooterSection").then((m) => ({ default: m.FooterSection }))
);
const RenderQueuePanel = lazy(() =>
  import("./RenderQueue").then((m) => ({ default: m.RenderQueuePanel }))
);

export default function LandingSectionsRelay() {
  return (
    <>
      <LazySection>
        <Suspense>
          <CodeExamplesSection />
        </Suspense>
      </LazySection>
      <LazySection>
        <Suspense>
          <PromptToToolSection />
        </Suspense>
      </LazySection>
      <LazySection>
        <Suspense>
          <RenderAnywhereSection />
        </Suspense>
      </LazySection>
      <LazySection>
        <Suspense>
          <ArchitectureSection />
        </Suspense>
      </LazySection>
      <LazySection>
        <Suspense>
          <TemplatedRenderingSection />
        </Suspense>
      </LazySection>
      <LazySection>
        <Suspense>
          <GettingStartedSection />
        </Suspense>
      </LazySection>
      <LazySection minHeight="300px">
        <Suspense>
          <FooterSection />
        </Suspense>
      </LazySection>
      <Suspense>
        <RenderQueuePanel />
      </Suspense>
    </>
  );
}
