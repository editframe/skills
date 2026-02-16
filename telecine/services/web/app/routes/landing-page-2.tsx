import { type MetaFunction, useLoaderData } from "react-router";
import { maybeIdentityContext } from "~/middleware/context";
import "~/styles/marketing.css";
import { MarketingLayout } from "~/components/layouts/MarketingLayout";
import { HeroSection } from "~/components/marketing/landing-page-2/HeroSection";
import { WhyChooseSection } from "~/components/marketing/landing-page-2/WhyChooseSection";
import { CodeControlSection } from "~/components/marketing/landing-page-2/CodeControlSection";
import { InfrastructureSection } from "~/components/marketing/landing-page-2/InfrastructureSection";
import { RenderingSection } from "~/components/marketing/landing-page-2/RenderingSection";
import { DeveloperExperienceSection } from "~/components/marketing/landing-page-2/DeveloperExperienceSection";
import { TrustSection } from "~/components/marketing/landing-page-2/TrustSection";
import { GetStartedSection } from "~/components/marketing/landing-page-2/GetStartedSection";

import type { Route } from "./+types/landing-page-2";

export const loader = async ({ context }: Route.LoaderArgs) => {
  const session = context.get(maybeIdentityContext);

  return {
    isLoggedIn: !!session,
  };
};

export const meta: MetaFunction = () => {
  return [
    {
      title: "Editframe | Ship Video Features That Get You Paid",
      description: "Deploy video generation your team will trust. Production-ready infrastructure, zero DevOps, scale from 1 to 10,000 videos instantly.",
    },
  ];
};

export default function LandingPage2() {
  const { isLoggedIn } = useLoaderData<typeof loader>();

  return (
    <MarketingLayout isLoggedIn={isLoggedIn}>
      <HeroSection
        headline="Ship video features that get you paid"
        subheadline="Deploy video generation your team will trust"
        description="Build and deploy video features at scale without the infrastructure headaches. Production-ready from day one, trusted by teams shipping video to millions of users."
        primaryCTA={{ label: "Start Building", href: "/welcome" }}
        secondaryCTA={{ label: "See How It Works", href: "/docs" }}
        trustSignals={[
          "Built for developers who ship",
          "Production-ready from day one",
          "Trusted by teams shipping video at scale",
        ]}
      />

      <WhyChooseSection
        headline="Why choose Editframe over alternatives?"
        comparison={{
          diy: {
            title: "DIY with FFmpeg",
            points: [
              "Full control over everything",
              "No vendor dependencies",
              "Open source and free",
            ],
            risks: [
              "Months of debugging and optimization",
              "Infrastructure to build and maintain",
              "Scaling challenges at high volume",
              "Video expertise required",
            ],
          },
          competitors: {
            title: "Template-Based Competitors",
            points: [
              "Faster initial setup",
              "Pre-built templates",
              "Managed infrastructure",
            ],
            risks: [
              "Limited creative control",
              "Vendor lock-in concerns",
              "Template limitations",
              "Hard to customize",
            ],
          },
          editframe: {
            title: "Editframe",
            points: [
              "Skip months of FFmpeg debugging",
              "No vendor lock-in, just better APIs",
              "Ship faster than building yourself",
            ],
            benefits: [
              "Use tools you already know",
              "Production-ready scaling",
              "Developer-first API",
              "No infrastructure to manage",
            ],
          },
        }}
      />

      <CodeControlSection
        headline="Real code, real control"
        description="Use the tools you already know. From idea to deployed video in minutes, not months."
        codeExample={`// Define your video with React
import { Composition } from '@editframe/react';

export default function MyVideo({ name }) {
  return (
    <Composition width={1920} height={1080}>
      <div style={{ fontSize: 72, color: 'white' }}>
        Hello, {name}!
      </div>
    </Composition>
  );
}`}
        benefits={[
          {
            title: "No video expertise required",
            description: "Use HTML, CSS, and JavaScript—the same tools you use every day. No need to learn video-specific APIs or formats.",
          },
          {
            title: "Version control your video logic",
            description: "Your video code lives in git. Review changes, test before deploying, and roll back if needed—just like any other feature.",
          },
          {
            title: "Test videos like you test code",
            description: "Write unit tests for your video logic. Ensure quality and prevent regressions with the same testing practices you already use.",
          },
        ]}
      />

      <InfrastructureSection
        headline="Zero infrastructure, infinite scale"
        description="Focus on features, not infrastructure. One API call, video delivered—no servers, queues, or transcoding pipelines to maintain."
        benefits={[
          {
            title: "No DevOps required",
            description: "Skip the infrastructure setup. No servers to provision, no queues to configure, no transcoding pipelines to maintain. Just ship features.",
          },
          {
            title: "Scales automatically",
            description: "Handle traffic spikes without breaking. From 1 video to 10,000 videos, Editframe scales automatically—no capacity planning needed.",
          },
          {
            title: "Enterprise-grade reliability",
            description: "Production-ready infrastructure with 99.9% uptime SLA. Your videos will be there when your users need them, every time.",
          },
        ]}
      />

      <RenderingSection
        headline="Fast rendering, faster shipping"
        description="Render thousands of videos in parallel. Ship video features that scale with your business, not against it."
        metrics={[
          { value: "~30s", label: "20-minute 4K video" },
          { value: "Thousands", label: "Parallel renders" },
          { value: "99.9%", label: "Uptime SLA" },
        ]}
        benefits={[
          {
            title: "Scale without hiring video engineers",
            description: "Handle growth without building a video team. Editframe handles the complexity so you can focus on your product.",
          },
          {
            title: "Handle traffic spikes without breaking",
            description: "Black Friday? Product launch? No problem. Editframe scales automatically to handle whatever traffic you throw at it.",
          },
          {
            title: "Your customers get videos fast",
            description: "Fast rendering means happy customers. Deliver videos in seconds, not minutes—even at scale.",
          },
        ]}
      />

      <DeveloperExperienceSection
        headline="Build with confidence, ship with speed"
        description="TypeScript support, comprehensive docs, and interactive previews—everything you need to build video features faster."
        features={[
          {
            title: "TypeScript support out of the box",
            description: "Full TypeScript support with autocomplete and type safety. Catch errors before they reach production.",
          },
          {
            title: "Documentation that actually helps",
            description: "Comprehensive docs with real examples. Get answers fast, ship features faster.",
          },
          {
            title: "Preview changes instantly",
            description: "See your changes in seconds, not minutes. Iterate fast with instant previews in your browser.",
          },
        ]}
      />

      <TrustSection
        headline="Choose with confidence, deploy without worry"
        description="Trusted by teams shipping video at scale. Production-ready infrastructure you can rely on."
        socialProof="Trusted by teams shipping video at scale"
        metrics={[
          { label: "Uptime SLA", value: "99.9%" },
          { label: "Enterprise Security", value: "SOC 2 Compliant" },
          { label: "Support", value: "24/7 Available" },
        ]}
        trustPoints={[
          "Production-ready infrastructure",
          "Used by companies you know",
          "Support when you need it",
        ]}
      />

      <GetStartedSection
        headline="Start building in minutes"
        description="Deploy your first video today. No credit card required, upgrade when you're ready."
        primaryCTA={{ label: "Get Started Free", href: "/welcome" }}
        secondaryCTA={{ label: "View Documentation", href: "/docs" }}
        benefits={[
          "No credit card required",
          "See results in minutes",
          "Upgrade when you're ready",
        ]}
      />
    </MarketingLayout>
  );
}








