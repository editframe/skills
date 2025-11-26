import { type LoaderFunctionArgs, type MetaFunction, useLoaderData } from "react-router";
import { parseRequestSession } from "@/util/session";
import "~/styles/marketing.css";
import { MarketingLayout } from "~/components/layouts/MarketingLayout";
import { HeroSection } from "~/components/marketing/landing-page-3/HeroSection";
import { FeatureSection } from "~/components/marketing/landing-page-3/FeatureSection";
import { FormatsSection } from "~/components/marketing/landing-page-3/FormatsSection";
import { PerformanceSection } from "~/components/marketing/landing-page-3/PerformanceSection";
import { TechStackSection } from "~/components/marketing/landing-page-3/TechStackSection";
import { CTASection } from "~/components/marketing/landing-page-3/CTASection";

export const loader = async (args: LoaderFunctionArgs) => {
  const session = await parseRequestSession(args.request);
  return {
    isLoggedIn: !!session,
  };
};

export const meta: MetaFunction = () => {
  return [
    {
      title: "Editframe | Complete Video Toolkit for Developers",
      description: "A TypeScript library for creating, rendering, and transforming videos programmatically. Directly in the cloud, faster than anything else.",
    },
  ];
};

export default function LandingPage3() {
  const { isLoggedIn } = useLoaderData<typeof loader>();

  return (
    <MarketingLayout isLoggedIn={isLoggedIn}>
      <div className="px-4 sm:px-6 lg:px-8">
        <HeroSection
          headline="Complete video toolkit"
          subheadline="A TypeScript library for creating, rendering, and transforming videos programmatically. Directly in the cloud, and faster than anything else."
          installCommand="npm install @editframe/react"
          primaryCTA={{ label: "Get Started", href: "/welcome" }}
          secondaryCTAs={[
            { label: "API Reference", href: "/docs" },
            { label: "Examples", href: "/docs/examples" },
          ]}
          badges={[
            "TypeScript native",
            "React components",
            "Cloud rendering",
          ]}
        />

        <FeatureSection
          headline="Create videos with React, effortlessly"
          description="Define your video layout with React components. Use the same tools you already know—JSX, CSS, and JavaScript. No video editing experience required. Your components become frames, your animations become motion."
          layout="left"
          codeExample={`import { Composition, Text, Video } from '@editframe/react';

export default function MyVideo({ title, bgVideo }) {
  return (
    <Composition width={1920} height={1080} fps={30}>
      <Video src={bgVideo} />
      <Text
        style={{
          fontSize: 72,
          fontWeight: 'bold',
          color: 'white',
          textShadow: '0 4px 12px rgba(0,0,0,0.5)',
        }}
      >
        {title}
      </Text>
    </Composition>
  );
}`}
          learnMoreHref="/docs"
          badges={["React", "TypeScript", "JSX"]}
        />

        <FeatureSection
          headline="Render thousands of videos, programmatically"
          description="Generate personalized videos at scale. Pass dynamic data to your components—names, products, metrics—and render unique videos for each user. One template, infinite variations. Perfect for marketing, notifications, and reports."
          layout="right"
          codeExample={`import { Editframe } from '@editframe/api';

const client = new Editframe({ token: process.env.TOKEN });

// Render videos for each user
for (const user of users) {
  const video = await client.videos.create({
    template: 'welcome-video',
    props: {
      name: user.name,
      avatar: user.avatarUrl,
      joinDate: user.createdAt,
    },
  });

  await sendEmail(user.email, video.url);
}`}
          learnMoreHref="/docs/api"
          badges={["Batch rendering", "Personalization", "API"]}
        />

        <FeatureSection
          headline="Lightning-fast cloud rendering"
          description="Render videos in seconds, not hours. Our distributed cloud infrastructure processes your videos in parallel across multiple nodes. A 20-minute 4K video renders in ~30 seconds. Scale from 1 to 10,000 videos instantly."
          layout="left"
          codeExample={`// Submit render job
const job = await client.render({
  template: 'quarterly-report',
  props: reportData,
  output: {
    format: 'mp4',
    resolution: '4k',
    quality: 'high',
  },
});

// Track progress
job.on('progress', (percent) => {
  console.log(\`Rendering: \${percent}%\`);
});

// Get result
const video = await job.completed();
console.log(\`Done: \${video.url}\`);`}
          learnMoreHref="/docs/rendering"
        />

        <FormatsSection
          headline="Wide format & codec support"
          description="Export to any format your users need. We support the most commonly used video, audio, and image formats. Hardware-accelerated encoding ensures fast, high-quality output."
          formats={[
            { name: "MP4", category: "video" },
            { name: "WebM", category: "video" },
            { name: "MOV", category: "video" },
            { name: "AVI", category: "video" },
            { name: "GIF", category: "image" },
            { name: "PNG sequence", category: "image" },
            { name: "JPEG sequence", category: "image" },
            { name: "WebP", category: "image" },
            { name: "MP3", category: "audio" },
            { name: "WAV", category: "audio" },
            { name: "AAC", category: "audio" },
            { name: "H.264", category: "other" },
            { name: "H.265/HEVC", category: "other" },
            { name: "VP9", category: "other" },
            { name: "AV1", category: "other" },
            { name: "ProRes", category: "other" },
          ]}
          learnMoreHref="/docs/formats"
        />

        <PerformanceSection
          headline="High performance, by design"
          description="By rendering only what you need, utilizing hardware-accelerated encoding and decoding, and using a distributed cloud architecture, Editframe is able to get the job done fast."
          metrics={[
            { value: "~30s", label: "4K render", description: "20-min video" },
            { value: "1000s", label: "Parallel jobs", description: "Simultaneous" },
            { value: "99.9%", label: "Uptime SLA", description: "Enterprise-grade" },
            { value: "<100ms", label: "API latency", description: "P95 response" },
            { value: "50+", label: "Edge nodes", description: "Global CDN" },
            { value: "∞", label: "Scale", description: "Auto-scaling" },
          ]}
        />

        <TechStackSection
          headline="Built for developers, by developers"
          description="Editframe is 100% TypeScript with full type safety. The API was designed to be intuitive—meaning you only write what you need."
          technologies={[
            { name: "Full TypeScript support", description: "Autocomplete and type safety out of the box" },
            { name: "React components", description: "Build videos with the tools you already know" },
            { name: "Comprehensive documentation", description: "Guides, examples, and API reference" },
            { name: "Open source SDK", description: "Inspect, contribute, and extend" },
          ]}
          codeExample={`// Full type safety
import type { CompositionProps, VideoConfig } from '@editframe/react';

interface MyVideoProps {
  title: string;
  duration: number;
  theme: 'light' | 'dark';
}

export const config: VideoConfig = {
  width: 1920,
  height: 1080,
  fps: 30,
  durationInFrames: 300,
};

export default function MyVideo(props: MyVideoProps) {
  // TypeScript knows the shape of props
  const { title, duration, theme } = props;
  // ...
}`}
        />

        <CTASection
          headline="Start building in minutes"
          description="Join developers who are shipping video features faster with Editframe."
          primaryCTA={{ label: "Get Started Free", href: "/welcome" }}
          secondaryCTA={{ label: "Read the Docs", href: "/docs" }}
        />
      </div>
    </MarketingLayout>
  );
}



