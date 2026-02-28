import { lazy, Suspense, useEffect, useState } from "react";

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

// Wait for the browser to go idle after the above-fold content settles before
// starting to load below-fold sections. This keeps section chunks out of the
// critical path without hiding them behind scroll events.
function useIdleReady(timeoutMs = 300) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (typeof requestIdleCallback !== "undefined") {
      const id = requestIdleCallback(() => setReady(true), { timeout: timeoutMs });
      return () => cancelIdleCallback(id);
    } else {
      const id = setTimeout(() => setReady(true), 0);
      return () => clearTimeout(id);
    }
  }, [timeoutMs]);
  return ready;
}

export default function LandingSectionsRelay() {
  const ready = useIdleReady(300);

  if (!ready) return null;

  return (
    <>
      <Suspense>
        <CodeExamplesSection />
        <PromptToToolSection />
        <RenderAnywhereSection />
        <ArchitectureSection />
        <TemplatedRenderingSection />
        <GettingStartedSection />
        <FooterSection />
      </Suspense>
      <Suspense>
        <RenderQueuePanel />
      </Suspense>
    </>
  );
}
