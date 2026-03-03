import { lazy, Suspense } from "react";
import { type MetaFunction, type HeadersFunction } from "react-router";
import { useTheme } from "~/hooks/useTheme";
import { Navigation } from "~/components/landing-v5/Navigation";
import { ClientOnly } from "~/components/ClientOnly";
import { RenderQueueProvider } from "~/components/landing-v5/RenderQueue";
import "~/styles/landing.css";

import { HeroSection } from "~/components/landing-v5/sections/HeroSection";

const LandingSectionsRelay = lazy(() =>
  import("~/components/landing-v5/LandingSectionsRelay")
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
    <div className="min-h-screen bg-[var(--paper-cream)] text-[var(--ink-black)]">
      <Navigation />

      <main>
        <RenderQueueProvider>
          <HeroSection />
          <ClientOnly>
            <Suspense>
              <LandingSectionsRelay />
            </Suspense>
          </ClientOnly>
        </RenderQueueProvider>
      </main>
    </div>
  );
}
