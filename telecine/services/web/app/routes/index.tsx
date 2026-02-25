import { lazy, Suspense } from "react";
import { type MetaFunction, type HeadersFunction } from "react-router";
import { useTheme } from "~/hooks/useTheme";
import { Navigation } from "~/components/landing-v5/Navigation";
import "~/styles/landing.css";

import { HeroSection } from "~/components/landing-v5/sections/HeroSection";
import { CodeExamplesSection } from "~/components/landing-v5/sections/CodeExamplesSection";
import { PromptToToolSection } from "~/components/landing-v5/sections/PromptToToolSection";
import { RenderAnywhereSection } from "~/components/landing-v5/sections/RenderAnywhereSection";
import { GettingStartedSection } from "~/components/landing-v5/sections/GettingStartedSection";
import { FooterSection } from "~/components/landing-v5/sections/FooterSection";

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
import {
  RenderQueueProvider,
  RenderQueuePanel,
} from "~/components/landing-v5/RenderQueue";

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
          <CodeExamplesSection />
          <PromptToToolSection />
          <RenderAnywhereSection />
          <Suspense><ArchitectureSection /></Suspense>
          <Suspense><TemplatedRenderingSection /></Suspense>
          <GettingStartedSection />
        </main>

        <FooterSection />
        <RenderQueuePanel />
      </div>
    </RenderQueueProvider>
  );
}
