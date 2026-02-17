import { type MetaFunction } from "react";
import { useLoaderData } from "react-router";
import { maybeIdentityContext } from "~/middleware/context";
import { useTheme } from "~/hooks/useTheme";
import { Navigation } from "~/components/landing-v5/Navigation";
import "~/styles/landing.css";

import { HeroSection } from "~/components/landing-v5/sections/HeroSection";
import { CodeExamplesSection } from "~/components/landing-v5/sections/CodeExamplesSection";
import { PromptToToolSection } from "~/components/landing-v5/sections/PromptToToolSection";
import { RenderAnywhereSection } from "~/components/landing-v5/sections/RenderAnywhereSection";
import { ArchitectureSection } from "~/components/landing-v5/sections/ArchitectureSection";
import { TemplatedRenderingSection } from "~/components/landing-v5/sections/TemplatedRenderingSection";
import { GettingStartedSection } from "~/components/landing-v5/sections/GettingStartedSection";
import { FooterSection } from "~/components/landing-v5/sections/FooterSection";
import {
  RenderQueueProvider,
  RenderQueuePanel,
} from "~/components/landing-v5/RenderQueue";

import type { Route } from "./+types/index";

export const loader = async ({ context }: Route.LoaderArgs) => {
  const session = context.get(maybeIdentityContext);
  return { isLoggedIn: !!session };
};

export const meta: MetaFunction = () => {
  return [
    { title: "Editframe | Build Video With Code" },
    {
      name: "description",
      content: "The developer platform for programmatic video. Declarative HTML + CSS compositions with scripting and React support. Instant preview and hyperscale rendering.",
    },
    { property: "og:title", content: "Editframe | Build Video With Code" },
    { property: "og:description", content: "The developer platform for programmatic video. HTML + CSS compositions with scripting and React support. Instant preview and hyperscale rendering." },
    { property: "og:type", content: "website" },
    { property: "og:url", content: "https://editframe.com" },
    { property: "og:image", content: "https://editframe.com/og-image.png" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: "Editframe | Build Video With Code" },
    { name: "twitter:description", content: "The developer platform for programmatic video. HTML + CSS compositions with scripting and React support. Instant preview and hyperscale rendering." },
    { name: "twitter:image", content: "https://editframe.com/og-image.png" },
  ];
};

export default function IndexPage() {
  const { isLoggedIn } = useLoaderData<typeof loader>();
  useTheme();

  return (
    <RenderQueueProvider>
      <div className="min-h-screen bg-[var(--paper-cream)] text-[var(--ink-black)]">
        <a href="#main-content" className="skip-to-content">
          Skip to content
        </a>
        <Navigation isLoggedIn={isLoggedIn} />

        <main id="main-content">
          <HeroSection />
          <CodeExamplesSection />
          <PromptToToolSection />
          <RenderAnywhereSection />
          <ArchitectureSection />
          <TemplatedRenderingSection />
          <GettingStartedSection />
        </main>

        <FooterSection />
        <RenderQueuePanel />
      </div>
    </RenderQueueProvider>
  );
}
