import {
  type LoaderFunctionArgs,
  type MetaFunction,
  useLoaderData,
} from "react-router";
import { parseRequestSession } from "@/util/session";
import { useTheme } from "~/hooks/useTheme";
import { Navigation } from "~/components/landing-v5/Navigation";
import "~/styles/landing.css";
import {
  HeroSection,
  SkillsSection,
  ToolsGridSection,
  BeforeAfterSection,
  PlaygroundSection,
  ClientRenderSection,
  ArchitectureSection,
  TemplatedRenderingSection,
  CodeExamplesSection,
  GettingStartedSection,
  FinalCtaSection,
  FooterSection,
  DogfoodCallout,
  WorksWithSection,
  CompositionModelSection,
} from "~/components/landing-v5/sections";
import {
  RenderQueueProvider,
  RenderQueuePanel,
} from "~/components/landing-v5/index.ts";

export const loader = async (args: LoaderFunctionArgs) => {
  const session = await parseRequestSession(args.request);
  return { isLoggedIn: !!session };
};

export const meta: MetaFunction = () => {
  return [
    { title: "Editframe | Build Video With Code" },
    {
      name: "description",
      content: "The developer platform for programmatic video. React components, instant preview, and hyperscale rendering. Ship video features in hours, not months.",
    },
    { property: "og:title", content: "Editframe | Build Video With Code" },
    { property: "og:description", content: "The developer platform for programmatic video. React components, instant preview, and hyperscale rendering." },
    { property: "og:type", content: "website" },
    { property: "og:url", content: "https://editframe.com" },
    { property: "og:image", content: "https://editframe.com/og-image.png" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: "Editframe | Build Video With Code" },
    { name: "twitter:description", content: "The developer platform for programmatic video. React components, instant preview, and hyperscale rendering." },
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
          <WorksWithSection />
          <SkillsSection />
          <ToolsGridSection />
          <DogfoodCallout />
          <BeforeAfterSection />
          <PlaygroundSection />
          <ClientRenderSection />
          <ArchitectureSection />
          <CompositionModelSection />
          <TemplatedRenderingSection />
          <CodeExamplesSection />
          <GettingStartedSection />
          <FinalCtaSection />
        </main>

        <FooterSection />
        <RenderQueuePanel />
      </div>
    </RenderQueueProvider>
  );
}
