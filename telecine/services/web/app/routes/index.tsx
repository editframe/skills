import {
  type LoaderFunctionArgs,
  type MetaFunction,
  useLoaderData,
  Link,
} from "react-router";
import {
  Timegroup,
  Video,
  Audio,
  Waveform,
  Captions,
  CaptionsSegment,
  FitScale,
} from "@editframe/react";

import { parseRequestSession } from "@/util/session";

import "~/styles/marketing.css";
import { Footer } from "~/components/marketing/Footer";
import { Header } from "~/components/marketing/Header";
import { CodeBlock } from "~/components/CodeBlock";
import { TimelineControls } from "./docs/examples/shared";

export const loader = async (args: LoaderFunctionArgs) => {
  const session = await parseRequestSession(args.request);

  return {
    isLoggedIn: !!session,
  };
};

export const meta: MetaFunction = () => {
  return [
    {
      title: "Editframe | Build Video Experiences at Scale",
      description: "Create dynamic videos with HTML, CSS, and JavaScript. From social media to e-learning, build any video experience imaginable.",
    },
  ];
};

export default function IndexPage() {
  const { isLoggedIn } = useLoaderData<typeof loader>();

  return (
    <div className="bg-white text-slate-900">
      <Header isLoggedIn={isLoggedIn} />

      {/* Worktree Demo Banner */}
      <div className="bg-blue-600 text-white text-center py-2 px-4">
        <p className="text-sm font-medium">Worktree Demo</p>
      </div>

      {/* Hero Section */}
      <section className="relative py-20 bg-gradient-to-b from-white to-gray-50">
        <div className="container mx-auto px-6">
          <div className="max-w-5xl mx-auto text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-slate-900 leading-tight">
              Programmatic video generation
              <br />
              <span className="text-blue-600">built for developers</span>
            </h1>

            <p className="text-xl text-slate-600 mb-8 max-w-3xl mx-auto leading-relaxed">
              Create dynamic videos with HTML, CSS, and JavaScript. From personalized social media content
              to data-driven reports, build production-ready video experiences that scale.
            </p>

            <div className="flex gap-4 justify-center mb-6">
              <Link
                to="/welcome"
                className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-lg shadow-lg hover:shadow-xl transition-all"
              >
                Start Building
              </Link>
              <Link
                to="/docs"
                className="px-8 py-4 bg-white border-2 border-slate-300 hover:border-slate-400 text-slate-700 rounded-lg font-semibold text-lg shadow-sm hover:shadow-md transition-all"
              >
                View Docs
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="relative py-20 bg-white border-t border-gray-200">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold mb-4 text-slate-900">
                Everything you need to build video products
              </h2>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                From development to production, we've built the complete stack for programmatic video.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-8 hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">
                  Interactive Preview
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  See changes instantly with our real-time preview system. Scrub the timeline, adjust properties, and iterate rapidly.
                </p>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-100 rounded-xl p-8 hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">
                  Parallel Rendering
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  Production rendering scales horizontally across our infrastructure. Generate thousands of videos in parallel.
                </p>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100 rounded-xl p-8 hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">
                  Developer-First API
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  Clean REST API, comprehensive docs, and TypeScript support. Built by developers, for developers.
                </p>
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-100 rounded-xl p-8 hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 bg-orange-600 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">
                  Professional Output
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  Industry-standard codecs, optimized encoding, and precise timing control for broadcast-quality results.
                </p>
              </div>

              <div className="bg-gradient-to-br from-cyan-50 to-blue-50 border border-cyan-100 rounded-xl p-8 hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 bg-cyan-600 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">
                  Asset Management
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  Upload once, use everywhere. Intelligent caching and delivery optimized for video workflows.
                </p>
              </div>

            </div>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
