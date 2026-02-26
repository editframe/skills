import { lazy, Suspense } from "react";
import { type MetaFunction, type HeadersFunction } from "react-router";
import { useTheme } from "~/hooks/useTheme";
import { Navigation } from "~/components/landing-v5/Navigation";
import { ClientOnly } from "~/components/ClientOnly";
import "~/styles/landing.css";

import { HeroSection } from "~/components/landing-v5/sections/HeroSection";

const FooterSection = lazy(() =>
  import("~/components/landing-v5/sections/FooterSection").then((m) => ({
    default: m.FooterSection,
  }))
);

const CodeExamplesSection = lazy(() =>
  import("~/components/landing-v5/sections/CodeExamplesSection").then((m) => ({
    default: m.CodeExamplesSection,
  }))
);
const PromptToToolSection = lazy(() =>
  import("~/components/landing-v5/sections/PromptToToolSection").then((m) => ({
    default: m.PromptToToolSection,
  }))
);
const RenderAnywhereSection = lazy(() =>
  import("~/components/landing-v5/sections/RenderAnywhereSection").then((m) => ({
    default: m.RenderAnywhereSection,
  }))
);
const ArchitectureSection = lazy(() =>
  import("~/components/landing-v5/sections/ArchitectureSection").then((m) => ({
    default: m.ArchitectureSection,
  }))
);
const TemplatedRenderingSection = lazy(() =>
  import("~/components/landing-v5/sections/TemplatedRenderingSection").then((m) => ({
    default: m.TemplatedRenderingSection,
  }))
);
const GettingStartedSection = lazy(() =>
  import("~/components/landing-v5/sections/GettingStartedSection").then((m) => ({
    default: m.GettingStartedSection,
  }))
);
import {
  RenderQueueProvider,
} from "~/components/landing-v5/RenderQueue";
const RenderQueuePanel = lazy(() =>
  import("~/components/landing-v5/RenderQueue").then((m) => ({
    default: m.RenderQueuePanel,
  }))
);

export const headers: HeadersFunction = () => ({
  "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=3600",
});

export const meta: MetaFunction = () => {
  return [
    { title: "Build Video With Code | Editframe" },
    {
      name: "description",
      content: "The developer platform for programmatic video. Declarative HTML + CSS compositions with scripting and React support. Instant preview and hyperscale rendering.",
    },
    { property: "og:title", content: "Build Video With Code | Editframe" },
    { property: "og:description", content: "The developer platform for programmatic video. HTML + CSS compositions with scripting and React support. Instant preview and hyperscale rendering." },
    { property: "og:type", content: "website" },
    { property: "og:url", content: "https://editframe.com" },
    { property: "og:image", content: "https://editframe.com/og-image.png" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: "Build Video With Code | Editframe" },
    { name: "twitter:description", content: "The developer platform for programmatic video. HTML + CSS compositions with scripting and React support. Instant preview and hyperscale rendering." },
    { name: "twitter:image", content: "https://editframe.com/og-image.png" },
  ];
};

export default function IndexPage() {
  useTheme();

  return (
    <RenderQueueProvider>
      <div className="min-h-screen bg-[var(--paper-cream)] text-[var(--ink-black)]">
        <a href="#main-content" className="skip-to-content">
          Skip to content
        </a>
        <Navigation />

        <main id="main-content">
          <HeroSection />
          <ClientOnly><Suspense><CodeExamplesSection /></Suspense></ClientOnly>
          <ClientOnly><Suspense><PromptToToolSection /></Suspense></ClientOnly>
          <ClientOnly><Suspense><RenderAnywhereSection /></Suspense></ClientOnly>
          <ClientOnly><Suspense><ArchitectureSection /></Suspense></ClientOnly>
          <ClientOnly><Suspense><TemplatedRenderingSection /></Suspense></ClientOnly>
          <ClientOnly><Suspense><GettingStartedSection /></Suspense></ClientOnly>
        </main>

        <ClientOnly><Suspense><FooterSection /></Suspense></ClientOnly>
        <ClientOnly><Suspense><RenderQueuePanel /></Suspense></ClientOnly>
      </div>
    </RenderQueueProvider>
  );
}
