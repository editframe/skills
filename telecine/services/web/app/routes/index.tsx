import {
  type LoaderFunctionArgs,
  type MetaFunction,
  useLoaderData,
} from "react-router";
import { parseRequestSession } from "@/util/session";
import "~/styles/marketing.css";
import { MarketingLayout } from "~/components/layouts/MarketingLayout";
import {
  HeroSection,
  FeatureShowcase,
  FeatureGridSection,
  UseCasesSection,
  DemoSection,
} from "~/components/landing";
import { Timegroup, Video, Text } from "@editframe/react";
import { Demonstration } from "~/components/docs/Demonstration/Demonstration";

export const loader = async (args: LoaderFunctionArgs) => {
  const session = await parseRequestSession(args.request);
  return { isLoggedIn: !!session };
};

export const meta: MetaFunction = () => {
  return [
    {
      title: "Editframe | Make videos programmatically",
      description:
        "The easiest and fastest way to render videos programmatically. No backend servers, no complex DevOps, no Lambdas. Just a simple HTTP request.",
    },
  ];
};

/**
 * Landing Page
 *
 * Sections can be reordered by simply moving them in the JSX below.
 * Each section is self-contained and accepts props for customization.
 */
export default function IndexPage() {
  const { isLoggedIn } = useLoaderData<typeof loader>();

  return (
    <MarketingLayout
      isLoggedIn={isLoggedIn}
      containerClassName="!px-0 !max-w-none"
    >
      {/* ═══════════════════════════════════════════════════════════════════
          HERO - Bold statement with immediate action
          ═══════════════════════════════════════════════════════════════════ */}
      <HeroSection
        headline="Make videos programmatically."
        description="The easiest and fastest way to render videos with code. No backend servers, no complex DevOps, no Lambdas—just a simple HTTP request."
        installCommand="npm create @editframe@latest"
        primaryCTA={{ label: "Get Started", href: "/welcome" }}
        secondaryCTA={{ label: "Documentation", href: "/docs" }}
        quickLinks={[
          { label: "What is Editframe?", href: "/docs/introduction" },
          { label: "Examples", href: "/docs/examples" },
          { label: "GitHub", href: "https://github.com/editframe" },
          { label: "Discord", href: "https://discord.gg/editframe" },
        ]}
      />

      {/* ═══════════════════════════════════════════════════════════════════
          FEATURE SHOWCASE 1: Compose with Code
          ═══════════════════════════════════════════════════════════════════ */}
      <FeatureShowcase
        eyebrow="Developer Experience"
        headline="Compose with code"
        description="Use React, HTML, CSS, and JavaScript to create videos. Leverage any animation library—GSAP, Framer Motion, Three.js—it just works."
        codeExample={`import { Timegroup, Video, Audio, Text } from '@editframe/react';

export const MyVideo = () => (
  <Timegroup mode="contain" className="w-[1920px] h-[1080px] bg-black relative">
    <Video src="background.mp4" className="absolute inset-0 w-full h-full object-cover" />
    <Audio src="music.mp3" />
    <Text className="absolute inset-0 flex items-center justify-center text-white text-6xl font-bold">
      Hello, World!
    </Text>
  </Timegroup>
);`}
        codeLanguage="tsx"
        links={[
          { label: "View React docs", href: "/docs/react" },
          { label: "See examples", href: "/docs/examples" },
        ]}
      />

      {/* ═══════════════════════════════════════════════════════════════════
          FEATURE SHOWCASE 2: Edit dynamically
          ═══════════════════════════════════════════════════════════════════ */}
      <FeatureShowcase
        eyebrow="Real-time Preview"
        headline="Edit dynamically"
        description="See changes instantly with our real-time preview system. Scrub the timeline, adjust properties, and iterate rapidly—all in your browser."
        visualComponent={
          <Demonstration layout="horizontal" hideSource alwaysShowSource>
            <Timegroup 
              mode="contain" 
              className="w-[720px] h-[480px] bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center relative overflow-hidden"
            >
              <Video 
                src="https://assets.editframe.com/bars-n-tone.mp4" 
                className="absolute inset-0 w-full h-full object-cover"
              />
              <Text className="absolute inset-0 flex items-center justify-center text-white text-4xl font-bold z-10">
                Real-time Preview
              </Text>
            </Timegroup>
          </Demonstration>
        }
        links={[
          { label: "Preview API", href: "/docs/preview" },
          { label: "Timeline controls", href: "/docs/timeline" },
        ]}
        reversed
      />

      {/* ═══════════════════════════════════════════════════════════════════
          FEATURE SHOWCASE 3: Scalable rendering
          ═══════════════════════════════════════════════════════════════════ */}
      <FeatureShowcase
        eyebrow="Production Ready"
        headline="Scalable rendering"
        description="Render a 20-minute 4K video in ~30 seconds. Generate thousands of videos in parallel. Our infrastructure scales with your needs."
        codeExample={`// Render with a simple API call
const response = await fetch('https://api.editframe.com/render', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer YOUR_API_KEY' },
  body: JSON.stringify({
    composition: 'my-video',
    output: { format: 'mp4', quality: '4k' }
  })
});

// Get your video URL
const { url } = await response.json();`}
        codeLanguage="typescript"
        links={[
          { label: "Render API", href: "/docs/api" },
          { label: "Parallel rendering", href: "/docs/parallel" },
        ]}
      />

      {/* ═══════════════════════════════════════════════════════════════════
          USE CASES
          ═══════════════════════════════════════════════════════════════════ */}
      <UseCasesSection
        eyebrow="Use Cases"
        headline="What can you build?"
        useCases={[
          {
            title: "Personalized Social Videos",
            description:
              "Generate unique videos for each user with dynamic data, images, and text overlays.",
            link: { label: "See example", href: "/docs/examples/social" },
          },
          {
            title: "Automated Reports",
            description:
              "Transform data into visual stories with charts, graphs, and narration.",
            link: { label: "See example", href: "/docs/examples/reports" },
          },
          {
            title: "E-Learning Content",
            description:
              "Create course videos with synchronized slides, animations, and transcripts.",
            link: { label: "See example", href: "/docs/examples/education" },
          },
        ]}
      />

      {/* ═══════════════════════════════════════════════════════════════════
          INTERACTIVE DEMO
          ═══════════════════════════════════════════════════════════════════ */}
      <DemoSection
        headline="Demo"
        description="Try the editor and see your changes in real-time"
      />

      {/* ═══════════════════════════════════════════════════════════════════
          FEATURE GRID: Core capabilities
          ═══════════════════════════════════════════════════════════════════ */}
      <FeatureGridSection
        eyebrow="Capabilities"
        headline="Everything you need"
        description="Build video applications with confidence using our complete toolkit"
        features={[
          {
            title: "Real Code, Real Control",
            description:
              "Use React, GSAP, Anime.js, or any web technology. No template limitations.",
            icon: (
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                />
              </svg>
            ),
          },
          {
            title: "Zero Infrastructure",
            description:
              "No servers to manage, no lambdas, no complex DevOps. Scale from 1 to 10,000 videos instantly.",
            icon: (
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"
                />
              </svg>
            ),
          },
          {
            title: "Fast Rendering",
            description:
              "Render a 20-minute 4K video in ~30 seconds. Generate thousands of videos in parallel.",
            icon: (
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            ),
          },
        ]}
      />

    </MarketingLayout>
  );
}
