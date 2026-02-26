import { lazy, Suspense } from "react";

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
