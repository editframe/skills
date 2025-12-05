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
  TrustedBySection,
  StatsSection,
  NewsletterSection,
  CTASection,
} from "~/components/landing";

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
        installCommand="npx create-editframe@latest"
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
        codeExample={`import { Composition, Video, Audio } from '@editframe/react';

export const MyVideo = () => (
  <Composition width={1920} height={1080} fps={30}>
    <Video src="background.mp4" />
    <Audio src="music.mp3" />
    
    <motion.h1 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      Hello, World!
    </motion.h1>
  </Composition>
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
        visualPlaceholder="Interactive preview component goes here"
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
          {
            title: "Asset Management",
            description:
              "Upload once, use everywhere. Intelligent caching and delivery optimized for video workflows.",
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
                  d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"
                />
              </svg>
            ),
          },
          {
            title: "TypeScript First",
            description:
              "Full type safety with excellent IDE support. Catch errors before they reach production.",
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
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            ),
          },
          {
            title: "Professional Output",
            description:
              "Industry-standard codecs, optimized encoding, and precise timing control for broadcast-quality results.",
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
                  d="M7 4V20M17 4V20M3 8H7M17 8H21M3 12H21M3 16H7M17 16H21M7 20H17M7 4H17"
                />
              </svg>
            ),
          },
        ]}
      />

      {/* ═══════════════════════════════════════════════════════════════════
          TRUSTED BY
          ═══════════════════════════════════════════════════════════════════ */}
      <TrustedBySection
        logos={[
          { name: "Company A" },
          { name: "Company B" },
          { name: "Company C" },
          { name: "Company D" },
          { name: "Company E" },
        ]}
      />

      {/* ═══════════════════════════════════════════════════════════════════
          STATS
          ═══════════════════════════════════════════════════════════════════ */}
      <StatsSection
        stats={[
          {
            value: "~30s",
            label: "20-min 4K render",
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
          {
            value: "10k+",
            label: "videos in parallel",
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
                  d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
                />
              </svg>
            ),
          },
          {
            value: "99.9%",
            label: "uptime SLA",
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
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            ),
          },
          {
            value: "24/7",
            label: "support",
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
                  d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            ),
          },
        ]}
      />

      {/* ═══════════════════════════════════════════════════════════════════
          NEWSLETTER
          ═══════════════════════════════════════════════════════════════════ */}
      <NewsletterSection
        headline="Newsletter"
        description="Stay up to date with new features, tutorials, and releases."
        placeholder="you@company.com"
        buttonLabel="Subscribe"
      />

      {/* ═══════════════════════════════════════════════════════════════════
          FINAL CTA
          ═══════════════════════════════════════════════════════════════════ */}
      <CTASection
        headline="Ready to build your video product?"
        description="Join developers who are shipping video features faster with Editframe."
        primaryCTA={{ label: "Get Started Free", href: "/welcome" }}
        secondaryCTA={{ label: "Talk to Sales", href: "/contact" }}
      />
    </MarketingLayout>
  );
}
