import { type MetaFunction, useLoaderData } from "react-router";
import { maybeIdentityContext } from "~/middleware/context";
import "~/styles/marketing.css";
import { MarketingLayout } from "~/components/layouts/MarketingLayout";
import { HeroSection } from "~/components/marketing/landing-page-4/HeroSection";
import { ValuePropSection } from "~/components/marketing/landing-page-4/ValuePropSection";
import { ArchitectureSection } from "~/components/marketing/landing-page-4/ArchitectureSection";
import { FeatureListSection } from "~/components/marketing/landing-page-4/FeatureListSection";
import { TestimonialSection } from "~/components/marketing/landing-page-4/TestimonialSection";
import { DeveloperSection } from "~/components/marketing/landing-page-4/DeveloperSection";
import { FinalCTASection } from "~/components/marketing/landing-page-4/FinalCTASection";

import type { Route } from "./+types/landing-page-4";

export const loader = async ({ context }: Route.LoaderArgs) => {
  const session = context.get(maybeIdentityContext);
  return {
    isLoggedIn: !!session,
  };
};

export const meta: MetaFunction = () => {
  return [
    {
      title: "Editframe | Video Generation Platform for Next-Gen Apps",
      description: "The fastest and simplest way to build, run, and scale video generation. High-quality video API layer on all your data.",
    },
  ];
};

export default function LandingPage4() {
  const { isLoggedIn } = useLoaderData<typeof loader>();

  return (
    <MarketingLayout isLoggedIn={isLoggedIn}>
      <div className="px-4 sm:px-6 lg:px-8">
        <HeroSection
          headline="Video generation layer for next-gen apps and AI"
          subheadline="The fastest and simplest way to build, run, govern, and evolve a high-quality video API layer on all your data."
          primaryCTA={{ label: "Start Free", href: "/welcome" }}
          secondaryCTA={{ label: "Book a Demo", href: "/docs" }}
          logos={[
            { name: "Acme Corp" },
            { name: "TechStart" },
            { name: "MediaFlow" },
            { name: "DataSync" },
            { name: "CloudScale" },
            { name: "AppWorks" },
          ]}
        />

        <ValuePropSection
          headline="Unblock video generation. Accelerate innovation."
          subheadline="Effortlessly deploy a universal video generation layer that lets your apps create any video they need—quickly and securely—no matter the input or format."
          features={[
            {
              icon: "speed",
              title: "Ship faster",
              description: "Radically cut down the time, cost, and effort needed to build, run, and evolve video generation features.",
              testimonial: {
                company: "Fortune 50 Healthcare",
                quote: "We took our video generation platform from prototype to production in just 30 days.",
              },
            },
            {
              icon: "governance",
              title: "Streamline governance",
              description: "Easily define and enforce video generation policies as a metadata-driven approach to format validation and content security.",
              testimonial: {
                company: "Top 50 US Bank",
                quote: "Editframe's metadata-driven approach allows for consistent governance and security.",
              },
            },
            {
              icon: "scale",
              title: "Unlock modernization",
              description: "Eliminate API development roadblocks and empower business-critical initiatives like AI and digital transformation.",
              testimonial: {
                company: "Global Media Company",
                quote: "Editframe is a game changer for our entire video infrastructure, enabling AI-driven content.",
              },
            },
          ]}
        />

        <ArchitectureSection
          headline="One API to generate any video"
          description="Connect your data sources and templates, and let Editframe handle the complexity of video generation, transcoding, and delivery."
          centerLabel="Editframe"
          leftItems={[
            { label: "React Components" },
            { label: "HTML Templates" },
            { label: "JSON Data" },
            { label: "Media Assets" },
            { label: "Dynamic Props" },
          ]}
          rightItems={[
            { label: "MP4 Videos" },
            { label: "WebM Streams" },
            { label: "GIF Animations" },
            { label: "Image Sequences" },
            { label: "Audio Exports" },
          ]}
        />

        <FeatureListSection
          eyebrow="Why Editframe"
          headline="The world's first metadata-driven video generation platform"
          description="Editframe is the only platform with a metadata-powered approach to unified video generation, streamlined developer productivity, effortless governance, and simplified cross-platform aggregation."
          features={[
            {
              icon: "productivity",
              title: "Boost productivity",
              description: "Move your videos to production faster. A developer-friendly API approach lets you instantly deploy video generation without API coding and enables developers to iterate quickly and business users to create content.",
            },
            {
              icon: "automation",
              title: "Automate governance",
              description: "Metadata defines the behavior of the video generation layer, powering API policies, access controls, and output formats—while simplifying audits and reviews.",
            },
            {
              icon: "aggregation",
              title: "Simplify aggregation",
              description: "With a unified rendering engine and a transparent query interface, developers can compose video from any source via a single API, virtually creating one consolidated video layer for their entire stack.",
            },
            {
              icon: "reliability",
              title: "Deliver reliability",
              description: "API is automatically deployed on a global distributed infrastructure, giving you low-latency, scalability and reliability, without any operational burden.",
            },
          ]}
          codePreview={`import { Editframe } from '@editframe/api';

const client = new Editframe({
  token: process.env.EDITFRAME_TOKEN
});

// Generate personalized video
const video = await client.videos.create({
  template: 'welcome-video',
  props: {
    userName: user.name,
    companyLogo: user.company.logo,
    message: 'Welcome to the team!'
  },
  output: {
    format: 'mp4',
    resolution: '1080p'
  }
});

console.log(video.url);
// https://cdn.editframe.com/v/abc123.mp4`}
        />

        <TestimonialSection
          quote="If we had gone the traditional way this process would have taken us 2-3 years. With Editframe we have been able to crunch it to just under a year. Achieving this timeframe in a highly regulated environment like video production is phenomenal!"
          author="Sarah Johnson"
          role="VP of Engineering"
          company="MediaTech Inc."
          metric={{
            value: "50%",
            label: "reduction in team size per project",
          }}
          logos={[
            { name: "TechCorp" },
            { name: "MediaFlow" },
            { name: "DataSync" },
            { name: "CloudScale" },
          ]}
        />

        <DeveloperSection
          headline="Built by developers, for developers"
          subheadline="We're obsessed with creating a platform that developers truly love—one that empowers them and delivers huge value. Ask the team's lawyer for 'themselves'."
          testimonials={[
            {
              author: "Alex Chen",
              role: "Senior Engineer @ StartupX",
              quote: "We needed that 'instant GraphQL APIs built in' for video generation and Editframe has the solution for fast content creation.",
            },
            {
              author: "Maria Garcia",
              role: "CTO @ VideoAI",
              quote: "I'm very excited that Editframe's GraphQL APIs built in as our entire video pipeline. It's keeping a whole lot of it in sync with data!",
            },
            {
              author: "James Wilson",
              role: "Lead Developer @ ContentFlow",
              quote: "Editframe API is the ultimate solution to build massive video catalogs. It just works and solves hard problems by hand takes a whole lot of time to get right.",
            },
            {
              author: "Lisa Park",
              role: "Engineering Manager @ ScaleUp",
              quote: "You can set it! The data is always in sync! It takes 5 minutes to set up, seriously. It's the best video API I've ever used.",
            },
          ]}
          communityCTA={{
            label: "Join the Community",
            href: "/docs",
          }}
        />

        <FinalCTASection
          headline="Ship production-ready video generation – in minutes!"
          primaryCTA={{ label: "Start for Free", href: "/welcome" }}
          secondaryCTA={{ label: "Contact Sales", href: "/docs" }}
        />
      </div>
    </MarketingLayout>
  );
}








