import { useState } from "react";
import {
  type LoaderFunctionArgs,
  type MetaFunction,
  useLoaderData,
} from "react-router";
import { parseRequestSession } from "@/util/session";
import { Link } from "react-router";
import { useTheme } from "~/hooks/useTheme";
import { ThemeToggle } from "~/components/ThemeToggle";
import { SocialProofBar } from "~/components/landing-v5/SocialProofBar";
import { HeroDemo } from "~/components/landing-v5/HeroDemo";
import { CustomerLogos, Testimonials } from "~/components/landing-v5";
import { ArchitectureDiagram } from "~/components/landing-v5/ArchitectureDiagram";
import { PerformanceMetrics } from "~/components/landing-v5/PerformanceMetrics";
import { VideoShowcase } from "~/components/landing-v5/VideoShowcase";
import { TerminalDemo } from "~/components/landing-v5/TerminalDemo";

export const loader = async (args: LoaderFunctionArgs) => {
  const session = await parseRequestSession(args.request);
  return { isLoggedIn: !!session };
};

export const meta: MetaFunction = () => {
  return [
    {
      title: "Editframe | Build Video With Code",
      description:
        "The developer platform for programmatic video. React components, instant preview, and hyperscale rendering. Ship video features in hours, not months.",
    },
  ];
};

export default function IndexPage() {
  const { isLoggedIn } = useLoaderData<typeof loader>();
  useTheme();

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-white">
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap');
        
        body {
          font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
        }
        
        .font-mono {
          font-family: 'JetBrains Mono', monospace;
        }
        
        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }

        @keyframes gradient-shift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        @keyframes pulse-glow {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }

        @keyframes typing {
          from { width: 0; }
          to { width: 100%; }
        }

        @keyframes blink-cursor {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }

        @keyframes playhead-progress {
          0% { width: 0%; }
          100% { width: 100%; }
        }

        @keyframes typing-cursor-move {
          0%, 100% { transform: translateX(0); }
          10% { transform: translateX(2px); }
          20% { transform: translateX(4px); }
          30% { transform: translateX(6px); }
          40% { transform: translateX(8px); }
          50% { transform: translateX(10px); }
          60% { transform: translateX(8px); }
          70% { transform: translateX(6px); }
          80% { transform: translateX(4px); }
          90% { transform: translateX(2px); }
        }

        @keyframes preview-pulse {
          0%, 100% { 
            opacity: 1;
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
          }
          50% { 
            opacity: 0.9;
            box-shadow: 0 0 20px 4px rgba(16, 185, 129, 0.15);
          }
        }

        @keyframes code-highlight {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        @keyframes scan-line {
          0% { transform: translateY(-100%); opacity: 0; }
          10% { opacity: 0.5; }
          90% { opacity: 0.5; }
          100% { transform: translateY(100%); opacity: 0; }
        }

        @keyframes play-button-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }

        .animate-blink-cursor {
          animation: blink-cursor 1s step-end infinite;
        }

        .animate-playhead {
          animation: playhead-progress 12s linear infinite;
        }

        .animate-preview-pulse {
          animation: preview-pulse 3s ease-in-out infinite;
        }

        .animate-scan-line {
          animation: scan-line 4s linear infinite;
        }

        .play-button-hover:hover {
          animation: play-button-pulse 0.6s ease-in-out infinite;
        }

        .play-button-hover:hover .play-icon {
          transform: scale(1.1);
        }

        .play-button-hover:active .play-icon {
          transform: scale(0.95);
        }

        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient-shift 8s ease infinite;
        }

        .animate-pulse-glow {
          animation: pulse-glow 3s ease-in-out infinite;
        }

        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
      `}} />

      {/* ========================================================================
          NAVIGATION
          
          Design decisions:
          - Floating nav with backdrop blur for modern feel
          - Minimal links - only essentials
          - Clear visual hierarchy: logo > links > CTAs
          ======================================================================== */}
      <nav className="fixed top-4 left-4 right-4 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl shadow-lg shadow-slate-900/5 dark:shadow-none">
          <div className="flex items-center justify-between">
            <Link to="/" className="text-xl font-bold tracking-tight">
              editframe
            </Link>
            <div className="hidden md:flex items-center gap-8">
              <Link to="/docs" className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                Docs
              </Link>
              <Link to="/examples" className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                Examples
              </Link>
              <Link to="/pricing" className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                Pricing
              </Link>
              <a href="https://github.com/editframe" target="_blank" rel="noopener noreferrer" className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                GitHub
              </a>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              {isLoggedIn ? (
                <Link
                  to="/dashboard"
                  className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg text-sm font-medium hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors"
                >
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link to="/login" className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                    Sign in
                  </Link>
                  <Link
                    to="/welcome"
                    className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg text-sm font-medium hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* ========================================================================
          HERO SECTION
          
          Psychology: The hero has ONE job - make the visitor understand what this
          is and want to learn more. Every pixel must serve this goal.
          
          Structure:
          1. Social proof anchor (small, builds trust before the ask)
          2. Headline (the promise)
          3. Sub-headline (the mechanism)
          4. Interactive demo (the proof) - PLACEHOLDER
          5. Single primary CTA
          
          Design decisions:
          - No badge/pill - those scream "template"
          - Headline is specific: "Build video with code" not "The infrastructure for..."
          - Demo is the centerpiece, not decoration
          ======================================================================== */}
      <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden pt-24 pb-16">
        {/* Background - subtle, not distracting */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse-glow" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: '1.5s' }} />
        </div>

        <div className="relative max-w-6xl mx-auto px-6 text-center">
          {/* Social proof - small, credible */}
          <SocialProofBar />

          {/* Headline */}
          <h1 className="text-5xl md:text-7xl font-extrabold mb-6 leading-[1.1] tracking-tight">
            Build video with code
          </h1>
          
          {/* Sub-headline - the mechanism, not more poetry */}
          <p className="text-xl md:text-2xl mb-12 max-w-2xl mx-auto text-slate-600 dark:text-slate-400 leading-relaxed">
            React components that render to video. Instant preview in your browser. 
            Render thousands in parallel. Ship video features in hours.
          </p>

          {/* Primary CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link
              to="/welcome"
              className="inline-flex items-center px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-semibold hover:bg-slate-800 dark:hover:bg-slate-100 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Start building free
              <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <a
              href="https://github.com/editframe/elements"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-8 py-4 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl font-semibold hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
            >
              <svg className="mr-2 w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
              </svg>
              View on GitHub
            </a>
          </div>

          {/* Hero Demo */}
          <HeroDemo />
        </div>
      </section>

      {/* ========================================================================
          BEFORE/AFTER SECTION
          
          Psychology: Don't list features. Show the contrast. Make the old way
          feel painful and the new way feel inevitable.
          
          This section answers: "Why does this exist? What problem does it solve?"
          ======================================================================== */}
      <section className="relative py-24 bg-slate-50 dark:bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Video development, before and after
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Building video used to mean FFmpeg scripts, frame counting, and prayer. Now it's React.
            </p>
          </div>

          <BeforeAfterComparison />
        </div>
      </section>

      {/* ========================================================================
          INTERACTIVE PLAYGROUND SECTION
          
          Psychology: This is THE differentiator. Let visitors experience the
          instant feedback loop. Don't describe it - let them feel it.
          
          Requirements for implementation:
          - Embedded Monaco editor with Editframe React code
          - Live preview panel that updates on code change (debounced 300ms)
          - Template selector: "Social Clip", "Podcast Video", "Data Story"
          - Mobile: show video with "Try on desktop" prompt
          - Error boundary with helpful messages
          
          Technical considerations:
          - Use iframe sandbox for code execution isolation
          - Subset of elements package compiled for browser
          - WebContainer or similar for node-like environment
          - Consider Sandpack if custom solution too complex
          ======================================================================== */}
      <section className="relative py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Try it yourself
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Edit the code. Watch the video update instantly. This is the Editframe development experience.
            </p>
          </div>

          <InteractivePlayground />
        </div>
      </section>

      {/* ========================================================================
          ARCHITECTURE SECTION
          
          Psychology: Technical buyers need to understand HOW it works, not just
          WHAT it does. This section builds confidence that we've solved real
          engineering problems.
          
          Show the dual-pipeline architecture:
          1. Preview path: Browser → JIT Transcoding → Canvas → Instant feedback
          2. Render path: Composition → WebCodecs/FFmpeg → CDN → Delivery
          
          Include real performance numbers with methodology links.
          ======================================================================== */}
      <section className="relative py-24 bg-slate-50 dark:bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-emerald-600 dark:text-emerald-400 font-semibold mb-4 uppercase tracking-wider text-sm">
              Under the hood
            </p>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Production-grade infrastructure
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              We solved the hard problems so you don't have to. JIT transcoding, frame-accurate seeking, 
              and distributed rendering at scale.
            </p>
          </div>

          <ArchitectureDiagram />
          
          <PerformanceMetrics />
        </div>
      </section>

      {/* ========================================================================
          CODE EXAMPLES SECTION
          
          Psychology: Developers evaluate tools by reading code. Show real,
          non-trivial examples that demonstrate actual capabilities.
          
          Examples should show:
          1. The basics (composition, timing)
          2. The impressive (animations, data binding)
          3. The practical (common use cases)
          ======================================================================== */}
      <section className="relative py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Code that makes sense
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              If you know React, you know Editframe. Familiar patterns, predictable behavior, 
              excellent TypeScript support.
            </p>
          </div>

          <CodeExamples />
        </div>
      </section>

      {/* ========================================================================
          USE CASES / SHOWCASE SECTION
          
          Psychology: Move from "what is this" to "what can I build with it".
          Show real outputs, not descriptions. Videos made with Editframe.
          
          Requirements for implementation:
          - Grid of actual video thumbnails (need real content)
          - Each video: thumbnail, title, "View code" link, duration badge
          - Mix of categories: social, education, data viz, marketing
          - Lazy loading for performance
          - Click to play in modal or inline
          
          Content needed:
          - 6-9 example videos with source code
          - Mix of simple and complex
          - Diverse visual styles
          ======================================================================== */}
      <section className="relative py-24 bg-slate-50 dark:bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Built with Editframe
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              From AI-generated clips to enterprise video pipelines. See what's possible.
            </p>
          </div>

          <VideoShowcase />
        </div>
      </section>

      {/* ========================================================================
          COMPARISON SECTION
          
          Psychology: Technical evaluators will compare us to alternatives.
          Be honest, specific, and confident. Acknowledge trade-offs.
          
          Compare against:
          - Remotion (closest competitor - React-based)
          - FFmpeg directly (DIY approach)
          - Cloudinary/Mux (media APIs, different abstraction)
          
          Columns: Feature, Editframe, Remotion, FFmpeg, Cloudinary
          Be factual, link to sources where possible.
          ======================================================================== */}
      <section className="relative py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              How we compare
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              We're not the only option. Here's an honest comparison to help you decide.
            </p>
          </div>

          <ComparisonTable />
        </div>
      </section>

      {/* ========================================================================
          SOCIAL PROOF SECTION
          
          Psychology: Third-party validation is more credible than first-party
          claims. Show who uses this, what they say, and measurable outcomes.
          
          Requirements for implementation:
          - Customer logos (need real logos and permission)
          - Testimonial quotes with photos, names, titles
          - Metrics: videos rendered, GitHub stars, npm downloads
          
          Content needed:
          - 4-8 customer logos
          - 2-3 substantive quotes
          - Real metrics from API/GitHub
          ======================================================================== */}
      <section className="relative py-24 bg-slate-50 dark:bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-6">
          <CustomerLogos />
          
          <Testimonials />
        </div>
      </section>

      {/* ========================================================================
          GETTING STARTED SECTION
          
          Psychology: Reduce friction to first success. Show the exact path
          from "interested" to "working demo". Make it feel fast and easy.
          
          Steps:
          1. npm create @editframe@latest
          2. Choose template
          3. npm run dev
          4. See live preview
          
          Animated terminal showing the flow is more compelling than static code.
          ======================================================================== */}
      <section className="relative py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Zero to video in 2 minutes
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-400 mb-8">
                One command to scaffold. One command to develop. Built-in templates 
                for common use cases. Hot reload that actually works.
              </p>
              
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-semibold text-sm">
                    1
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Create your project</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Interactive CLI scaffolds your project with TypeScript, ESLint, and your chosen template.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-semibold text-sm">
                    2
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Start developing</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Dev server with instant preview. Edit code, see video update in milliseconds.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-semibold text-sm">
                    3
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Render and deploy</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Render locally or push to cloud. Scale from one video to ten thousand.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <Link
                  to="/docs/quickstart"
                  className="inline-flex items-center text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
                >
                  Read the quickstart guide
                  <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
              </div>
            </div>

            <TerminalDemo />
          </div>
        </div>
      </section>

      {/* ========================================================================
          FINAL CTA SECTION
          
          Psychology: The visitor has scrolled this far - they're interested.
          Give them clear paths based on their intent level.
          
          Three paths:
          - Low commitment: Read docs (curious, not ready)
          - Medium commitment: Start free (ready to try)
          - High commitment: Talk to sales (enterprise buyer)
          ======================================================================== */}
      <section className="relative py-24">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to build?
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 mb-12 max-w-xl mx-auto">
            Start free with generous limits. No credit card required. 
            Upgrade when you're ready to scale.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <Link
              to="/welcome"
              className="inline-flex items-center px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-semibold hover:bg-slate-800 dark:hover:bg-slate-100 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Start building free
              <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <Link
              to="/docs"
              className="inline-flex items-center px-8 py-4 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl font-semibold hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
            >
              Read the docs
            </Link>
          </div>

          <p className="text-sm text-slate-500">
            Need enterprise features?{' '}
            <Link to="/contact" className="text-emerald-600 dark:text-emerald-400 hover:underline">
              Talk to sales
            </Link>
          </p>
        </div>
      </section>

      {/* ========================================================================
          FOOTER
          
          Keep it clean. Essential links only. Don't overwhelm.
          ======================================================================== */}
      <footer className="relative py-16 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-5 gap-8 mb-12">
            <div className="md:col-span-2">
              <Link to="/" className="text-xl font-bold">editframe</Link>
              <p className="mt-4 text-slate-600 dark:text-slate-400 text-sm max-w-xs">
                Build video with code. React components, instant preview, hyperscale rendering.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4 text-sm">Product</h3>
              <ul className="space-y-3">
                <li><Link to="/docs" className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">Documentation</Link></li>
                <li><Link to="/examples" className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">Examples</Link></li>
                <li><Link to="/pricing" className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">Pricing</Link></li>
                <li><Link to="/changelog" className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">Changelog</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4 text-sm">Resources</h3>
              <ul className="space-y-3">
                <li><a href="https://github.com/editframe" target="_blank" rel="noopener noreferrer" className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">GitHub</a></li>
                <li><a href="https://discord.gg/editframe" target="_blank" rel="noopener noreferrer" className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">Discord</a></li>
                <li><Link to="/blog" className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">Blog</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4 text-sm">Legal</h3>
              <ul className="space-y-3">
                <li><Link to="/privacy" className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">Privacy</Link></li>
                <li><Link to="/terms" className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">Terms</Link></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-slate-200 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-slate-500">
              © 2026 Editframe, Inc.
            </p>
            <div className="flex items-center gap-6">
              <a href="https://github.com/editframe" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors" aria-label="GitHub">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
              </a>
              <a href="https://twitter.com/editframe" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors" aria-label="Twitter">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a href="https://discord.gg/editframe" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors" aria-label="Discord">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}


/* ==============================================================================
   COMPONENT: BeforeAfterComparison
   
   Purpose: Show the contrast between traditional video development and
   Editframe. Make the old way feel painful, the new way feel obvious.
   
   Implementation notes:
   - Side-by-side panels
   - "Before" shows: complex pipeline, multiple tools, manual processes
   - "After" shows: simple code, instant feedback, one tool
   - Use visual weight to make "After" feel lighter/better
   ============================================================================== */
function BeforeAfterComparison() {
  return (
    <div className="grid md:grid-cols-2 gap-8">
      {/* Before */}
      <div className="relative">
        <div className="absolute -top-3 left-6 px-3 py-1 bg-slate-200 dark:bg-slate-800 rounded-full text-xs font-semibold text-slate-600 dark:text-slate-400">
          Traditional approach
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 h-full">
          <div className="space-y-4">
            <div className="flex items-start gap-3 text-slate-600 dark:text-slate-400">
              <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <div>
                <p className="font-medium text-slate-900 dark:text-white">Write FFmpeg scripts</p>
                <p className="text-sm">Learn arcane flags. Debug cryptic errors. Pray it works.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 text-slate-600 dark:text-slate-400">
              <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <div>
                <p className="font-medium text-slate-900 dark:text-white">Wait for renders</p>
                <p className="text-sm">Change one parameter. Render for 5 minutes. Repeat forever.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 text-slate-600 dark:text-slate-400">
              <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <div>
                <p className="font-medium text-slate-900 dark:text-white">Manage infrastructure</p>
                <p className="text-sm">Provision GPU servers. Handle encoding queues. Monitor everything.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 text-slate-600 dark:text-slate-400">
              <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <div>
                <p className="font-medium text-slate-900 dark:text-white">Count frames manually</p>
                <p className="text-sm">Calculate timestamps. Convert between formats. Make math errors.</p>
              </div>
            </div>
          </div>
          
          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
            <p className="text-sm text-slate-500">Typical timeline: <span className="font-semibold text-red-500">2-4 weeks</span></p>
          </div>
        </div>
      </div>
      
      {/* After */}
      <div className="relative">
        <div className="absolute -top-3 left-6 px-3 py-1 bg-emerald-100 dark:bg-emerald-500/20 rounded-full text-xs font-semibold text-emerald-700 dark:text-emerald-400">
          With Editframe
        </div>
        <div className="bg-white dark:bg-slate-900 border-2 border-emerald-200 dark:border-emerald-500/30 rounded-2xl p-8 h-full">
          <div className="space-y-4">
            <div className="flex items-start gap-3 text-slate-600 dark:text-slate-400">
              <svg className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <div>
                <p className="font-medium text-slate-900 dark:text-white">Write React components</p>
                <p className="text-sm">Use the skills you already have. JSX, CSS, any animation library.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 text-slate-600 dark:text-slate-400">
              <svg className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <div>
                <p className="font-medium text-slate-900 dark:text-white">Preview instantly</p>
                <p className="text-sm">Edit code, see video update in milliseconds. Scrub the timeline freely.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 text-slate-600 dark:text-slate-400">
              <svg className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <div>
                <p className="font-medium text-slate-900 dark:text-white">Render on our infrastructure</p>
                <p className="text-sm">Push to cloud. We handle scaling, encoding, and delivery.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 text-slate-600 dark:text-slate-400">
              <svg className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <div>
                <p className="font-medium text-slate-900 dark:text-white">Time is just a prop</p>
                <p className="text-sm">start, duration, offset. Declarative timing that makes sense.</p>
              </div>
            </div>
          </div>
          
          <div className="mt-8 pt-6 border-t border-emerald-200 dark:border-emerald-500/30">
            <p className="text-sm text-slate-500">Typical timeline: <span className="font-semibold text-emerald-600 dark:text-emerald-400">2-4 hours</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}


/* ==============================================================================
   COMPONENT: InteractivePlayground
   
   Purpose: Let visitors experience the development flow. This is THE
   differentiator - instant feedback that you can't get elsewhere.
   ============================================================================== */
function InteractivePlayground() {
  const [selectedTemplate, setSelectedTemplate] = useState<'social' | 'podcast' | 'data'>('social');
  const [copied, setCopied] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  const templates = {
    social: {
      name: 'Social Clip',
      dimensions: '1080 × 1920',
      aspectRatio: 'w-32 h-56',
      description: '9:16 vertical for TikTok, Reels, Shorts',
      duration: '0:15',
      code: `import { Timegroup, Video, Text, Captions } from '@editframe/react';
import { motion } from 'framer-motion';

export function SocialClip({ data }) {
  return (
    <Timegroup 
      className="w-[1080px] h-[1920px] bg-black"
      duration={15}
    >
      {/* Background video */}
      <Video 
        src={data.videoUrl}
        className="absolute inset-0 object-cover"
        volume={0.3}
      />
      
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent" />
      
      {/* Auto-generated captions */}
      <Captions 
        target="video"
        className="absolute bottom-32 left-6 right-6
                   text-white text-2xl font-bold
                   drop-shadow-lg"
      />
      
      {/* Animated headline */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute top-20 left-6 right-6"
      >
        <Text className="text-white text-5xl font-black">
          {data.headline}
        </Text>
      </motion.div>
    </Timegroup>
  );
}`,
    },
    podcast: {
      name: 'Podcast Video',
      dimensions: '1920 × 1080',
      aspectRatio: 'w-56 h-32',
      description: '16:9 landscape for YouTube',
      duration: '2:30',
      code: `import { Timegroup, Audio, Image, Waveform, Text } from '@editframe/react';

export function PodcastClip({ episode }) {
  return (
    <Timegroup 
      className="w-[1920px] h-[1080px] bg-gradient-to-br from-slate-900 to-slate-800"
      duration={150}
    >
      {/* Audio track */}
      <Audio 
        src={episode.audioUrl} 
        name="podcast"
      />
      
      {/* Speaker avatar */}
      <Image 
        src={episode.speakerAvatar}
        className="absolute left-20 top-1/2 -translate-y-1/2
                   w-64 h-64 rounded-full object-cover
                   ring-4 ring-emerald-500/50"
      />
      
      {/* Audio waveform visualization */}
      <Waveform 
        target="podcast"
        className="absolute right-20 top-1/2 -translate-y-1/2
                   w-[600px] h-48"
        barColor="#10b981"
        barWidth={4}
        barGap={3}
      />
      
      {/* Episode info */}
      <div className="absolute bottom-16 left-20 right-20">
        <Text className="text-slate-400 text-2xl mb-2">
          Episode {episode.number}
        </Text>
        <Text className="text-white text-5xl font-bold">
          {episode.title}
        </Text>
      </div>
      
      {/* Show logo */}
      <Image 
        src={episode.showLogo}
        className="absolute top-12 right-12 w-24 h-24"
      />
    </Timegroup>
  );
}`,
    },
    data: {
      name: 'Data Story',
      dimensions: '1080 × 1080',
      aspectRatio: 'w-44 h-44',
      description: '1:1 square for Instagram',
      duration: '0:30',
      code: `import { Timegroup, Sequence, Text } from '@editframe/react';
import { BarChart, AnimatedNumber } from '@editframe/charts';

export function DataStory({ metrics }) {
  return (
    <Timegroup 
      className="w-[1080px] h-[1080px] bg-white"
      duration={30}
    >
      <Sequence>
        {/* Intro slide */}
        <div duration={3} className="flex flex-col items-center justify-center h-full">
          <Text className="text-slate-900 text-6xl font-bold text-center">
            Q4 2025 Results
          </Text>
          <Text className="text-slate-500 text-3xl mt-4">
            Year in Review
          </Text>
        </div>
        
        {/* Revenue chart */}
        <div duration={8} className="p-16">
          <Text className="text-slate-900 text-4xl font-bold mb-8">
            Revenue Growth
          </Text>
          <BarChart 
            data={metrics.revenue}
            animateIn="slideUp"
            className="h-[600px]"
            colors={['#10b981', '#3b82f6', '#8b5cf6']}
          />
        </div>
        
        {/* Key metric */}
        <div duration={5} className="flex flex-col items-center justify-center h-full">
          <AnimatedNumber 
            value={metrics.growth}
            suffix="%"
            className="text-emerald-500 text-[200px] font-black"
            duration={2}
          />
          <Text className="text-slate-900 text-4xl mt-4">
            Year-over-Year Growth
          </Text>
        </div>
        
        {/* Closing */}
        <div duration={4} className="flex items-center justify-center h-full bg-slate-900">
          <Text className="text-white text-5xl font-bold">
            {metrics.companyName}
          </Text>
        </div>
      </Sequence>
    </Timegroup>
  );
}`,
    },
  };
  
  const currentTemplate = templates[selectedTemplate];
  
  const handleTemplateChange = (templateId: 'social' | 'podcast' | 'data') => {
    if (templateId === selectedTemplate) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setSelectedTemplate(templateId);
      setTimeout(() => setIsTransitioning(false), 50);
    }, 150);
  };
  
  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(currentTemplate.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = currentTemplate.code;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  
  return (
    <div className="relative">
      {/* Template selector */}
      <div className="flex items-center justify-center gap-2 mb-6">
        {(Object.keys(templates) as Array<keyof typeof templates>).map((templateId) => (
          <button
            key={templateId}
            onClick={() => handleTemplateChange(templateId)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              selectedTemplate === templateId
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 scale-105'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {templates[templateId].name}
          </button>
        ))}
      </div>
      
      {/* Playground container */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl">
        {/* Window chrome */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-amber-400" />
            <div className="w-3 h-3 rounded-full bg-emerald-400" />
          </div>
          <div className="flex-1 flex items-center justify-center gap-4">
            <span className="text-xs text-slate-500 font-mono">composition.tsx</span>
            <span className="text-xs text-slate-400">|</span>
            <span className="text-xs text-slate-500 font-mono">preview</span>
          </div>
          <Link
            to={`/editor?template=${selectedTemplate}`}
            className="px-3 py-1 text-xs bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-md font-medium hover:bg-emerald-200 dark:hover:bg-emerald-500/30 transition-colors"
          >
            Open in editor
          </Link>
        </div>
        
        {/* Editor + Preview */}
        <div className="grid md:grid-cols-2 divide-x divide-slate-200 dark:divide-slate-800 min-h-[400px]">
          {/* Code editor */}
          <div className="relative p-4 bg-slate-950 font-mono text-sm overflow-auto">
            {/* Copy button */}
            <button
              onClick={handleCopyCode}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors z-10"
              title="Copy code"
            >
              {copied ? (
                <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </button>
            
            <pre 
              className={`text-slate-300 leading-relaxed transition-opacity duration-150 ${
                isTransitioning ? 'opacity-0' : 'opacity-100'
              }`}
            >
              <code>{currentTemplate.code}</code>
            </pre>
          </div>
          
          {/* Preview */}
          <div 
            className={`bg-slate-100 dark:bg-slate-950 flex items-center justify-center transition-opacity duration-150 ${
              isTransitioning ? 'opacity-0' : 'opacity-100'
            }`}
          >
            <div className="text-center p-8">
              <div className={`${currentTemplate.aspectRatio} bg-slate-200 dark:bg-slate-800 rounded-xl mx-auto mb-4 flex items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-700 transition-all duration-300`}>
                <svg className="w-12 h-12 text-slate-400 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-1 font-medium">
                {currentTemplate.dimensions}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                {currentTemplate.description}
              </p>
            </div>
          </div>
        </div>
        
        {/* Timeline */}
        <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
          <div className="flex items-center gap-4">
            <button className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors">
              <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>
            <div className="flex-1 relative h-8">
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1 bg-slate-200 dark:bg-slate-800 rounded-full" />
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1/4 h-1 bg-emerald-500 rounded-full" />
              <div className="absolute left-1/4 top-1/2 -translate-y-1/2 w-3 h-3 bg-emerald-500 rounded-full -ml-1.5 shadow" />
            </div>
            <span className="text-xs text-slate-500 font-mono w-24 text-right">
              0:03.75 / {currentTemplate.duration}
            </span>
          </div>
        </div>
      </div>
      
      {/* Mobile fallback message */}
      <div className="md:hidden mt-4 text-center">
        <p className="text-sm text-slate-500">
          For the full interactive experience,{' '}
          <Link to={`/editor?template=${selectedTemplate}`} className="text-emerald-600 dark:text-emerald-400 hover:underline">
            open in editor
          </Link>
        </p>
      </div>
    </div>
  );
}


/* ==============================================================================
   COMPONENT: CodeExamples
   
   Purpose: Show real, non-trivial code that demonstrates actual capabilities.
   Developers evaluate tools by reading code.
   
   Implementation notes:
   - Tabbed interface with 3-4 examples
   - Syntax highlighting (use Prism or highlight.js)
   - Copy button on each example
   - Examples should show progressively complex features
   ============================================================================== */
function CodeExamples() {
  const [activeTab, setActiveTab] = useState('basic');
  const [copied, setCopied] = useState(false);

  const examples = [
    {
      id: 'basic',
      name: 'Basic Composition',
      code: `import { Timegroup, Video, Text } from '@editframe/react';

export function Welcome() {
  return (
    <Timegroup className="w-[1920px] h-[1080px] bg-slate-900">
      <Video 
        src="background.mp4" 
        className="absolute inset-0 opacity-50" 
      />
      <Text className="text-white text-6xl font-bold text-center">
        Welcome to the future
      </Text>
    </Timegroup>
  );
}`,
    },
    {
      id: 'captions',
      name: 'Auto Captions',
      code: `import { Timegroup, Video, Captions } from '@editframe/react';

export function Interview() {
  return (
    <Timegroup className="w-[1080px] h-[1920px]">
      <Video src="interview.mp4" name="speaker" />
      
      {/* Auto-generated, word-level captions */}
      <Captions 
        target="speaker"
        className="absolute bottom-20 inset-x-8
                   text-white text-2xl font-semibold
                   [&_.active]:text-yellow-400"
      />
    </Timegroup>
  );
}`,
    },
    {
      id: 'animations',
      name: 'CSS Animations',
      code: `import { Timegroup, Sequence, Text } from '@editframe/react';

export function Intro() {
  return (
    <Timegroup className="w-[1920px] h-[1080px] bg-black">
      <Sequence>
        <Text 
          duration={2}
          className="text-white text-8xl animate-[fadeIn_0.5s_ease-out]"
        >
          First
        </Text>
        <Text 
          duration={2}
          className="text-emerald-400 text-8xl animate-[slideUp_0.3s_ease-out]"
        >
          Then this
        </Text>
        <Text 
          duration={2}
          className="text-white text-8xl animate-[scale_0.4s_ease-out]"
        >
          Finally
        </Text>
      </Sequence>
    </Timegroup>
  );
}`,
    },
    {
      id: 'data',
      name: 'Data-Driven',
      code: `import { Timegroup, Image, Text } from '@editframe/react';

// Generate thousands of unique videos from data
export function ProductAd({ product }) {
  return (
    <Timegroup className="w-[1080px] h-[1080px] bg-white">
      <Image 
        src={product.imageUrl}
        className="absolute inset-0 object-cover"
      />
      <div className="absolute bottom-0 inset-x-0 p-8 bg-gradient-to-t from-black">
        <Text className="text-white text-4xl font-bold">
          {product.name}
        </Text>
        <Text className="text-emerald-400 text-2xl mt-2">
          \${product.price}
        </Text>
      </div>
    </Timegroup>
  );
}`,
    },
  ];

  const activeIndex = examples.findIndex(e => e.id === activeTab);
  const activeExample = examples[activeIndex >= 0 ? activeIndex : 0]!;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(activeExample.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = activeExample.code;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Simple syntax highlighting using regex patterns
  const highlightCode = (code: string) => {
    let highlighted = code;
    
    // Process string patterns first to avoid highlighting inside strings
    const stringPlaceholders: string[] = [];
    highlighted = highlighted.replace(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/g, (match) => {
      const placeholder = `__STRING_${stringPlaceholders.length}__`;
      stringPlaceholders.push(`<span class="text-emerald-400">${match}</span>`);
      return placeholder;
    });

    // Process comments
    const commentPlaceholders: string[] = [];
    highlighted = highlighted.replace(/(\/\/[^\n]*|\/\*[\s\S]*?\*\/|\{\/\*[\s\S]*?\*\/\})/g, (match) => {
      const placeholder = `__COMMENT_${commentPlaceholders.length}__`;
      commentPlaceholders.push(`<span class="text-slate-500">${match}</span>`);
      return placeholder;
    });

    // Keywords
    highlighted = highlighted.replace(
      /\b(import|export|from|function|return|const|let|var|if|else|for|while|class|extends|new|this|typeof|instanceof)\b/g,
      '<span class="text-purple-400">$1</span>'
    );

    // JSX tags
    highlighted = highlighted.replace(
      /(<\/?)([\w.]+)/g,
      '<span class="text-slate-500">$1</span><span class="text-blue-400">$2</span>'
    );

    // JSX attributes
    highlighted = highlighted.replace(
      /\s(className|src|name|target|duration|style|volume)=/g,
      ' <span class="text-amber-400">$1</span>='
    );

    // Numbers
    highlighted = highlighted.replace(
      /\b(\d+)\b/g,
      '<span class="text-orange-400">$1</span>'
    );

    // Restore strings and comments
    stringPlaceholders.forEach((str, i) => {
      highlighted = highlighted.replace(`__STRING_${i}__`, str);
    });
    commentPlaceholders.forEach((comment, i) => {
      highlighted = highlighted.replace(`__COMMENT_${i}__`, comment);
    });

    return highlighted;
  };
  
  return (
    <div className="bg-slate-900 rounded-2xl overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-slate-800">
        {examples.map((example) => (
          <button
            key={example.id}
            onClick={() => setActiveTab(example.id)}
            className={`px-6 py-4 text-sm font-medium transition-colors ${
              example.id === activeTab
                ? 'text-white bg-slate-800 border-b-2 border-emerald-500'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            {example.name}
          </button>
        ))}
      </div>
      
      {/* Code */}
      <div className="relative">
        <button 
          onClick={handleCopy}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-2"
          title="Copy to clipboard"
        >
          {copied ? (
            <>
              <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-xs text-emerald-400">Copied!</span>
            </>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          )}
        </button>
        <pre className="p-6 overflow-x-auto text-sm">
          <code 
            className="text-slate-300"
            dangerouslySetInnerHTML={{ __html: highlightCode(activeExample.code) }}
          />
        </pre>
      </div>
    </div>
  );
}


/* ==============================================================================
   COMPONENT: ComparisonTable
   
   Purpose: Honest comparison with alternatives. Technical evaluators will
   compare anyway - better we control the narrative with facts.
   
   Implementation notes:
   - Be factual, not promotional
   - Acknowledge where alternatives are stronger
   - Link to sources where possible
   - Mobile: transform to cards, not horizontal scroll
   ============================================================================== */
function ComparisonTable() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-800">
            <th className="text-left py-4 px-4 font-semibold text-slate-900 dark:text-white">Feature</th>
            <th className="text-center py-4 px-4 font-semibold text-emerald-600 dark:text-emerald-400">Editframe</th>
            <th className="text-center py-4 px-4 font-semibold text-slate-500">Remotion</th>
            <th className="text-center py-4 px-4 font-semibold text-slate-500">FFmpeg</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
          {[
            { feature: 'React components', editframe: true, remotion: true, ffmpeg: false },
            { feature: 'Web Components', editframe: true, remotion: false, ffmpeg: false },
            { feature: 'Instant preview', editframe: true, remotion: 'Partial', ffmpeg: false },
            { feature: 'Cloud rendering', editframe: true, remotion: 'Self-host', ffmpeg: 'Self-host' },
            { feature: 'Auto captions', editframe: true, remotion: false, ffmpeg: false },
            { feature: 'Timeline GUI', editframe: true, remotion: false, ffmpeg: false },
            { feature: 'Open source', editframe: true, remotion: true, ffmpeg: true },
          ].map((row, i) => (
            <tr key={i}>
              <td className="py-4 px-4 text-slate-600 dark:text-slate-400">{row.feature}</td>
              <td className="py-4 px-4 text-center">
                {row.editframe === true ? (
                  <svg className="w-5 h-5 text-emerald-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : row.editframe === false ? (
                  <svg className="w-5 h-5 text-slate-300 dark:text-slate-600 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <span className="text-sm text-slate-500">{row.editframe}</span>
                )}
              </td>
              <td className="py-4 px-4 text-center">
                {row.remotion === true ? (
                  <svg className="w-5 h-5 text-emerald-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : row.remotion === false ? (
                  <svg className="w-5 h-5 text-slate-300 dark:text-slate-600 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <span className="text-sm text-slate-500">{row.remotion}</span>
                )}
              </td>
              <td className="py-4 px-4 text-center">
                {row.ffmpeg === true ? (
                  <svg className="w-5 h-5 text-emerald-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : row.ffmpeg === false ? (
                  <svg className="w-5 h-5 text-slate-300 dark:text-slate-600 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <span className="text-sm text-slate-500">{row.ffmpeg}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
