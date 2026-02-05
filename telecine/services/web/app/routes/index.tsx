import { useState, useEffect, useRef, useCallback } from "react";
import {
  type LoaderFunctionArgs,
  type MetaFunction,
  useLoaderData,
} from "react-router";
import { parseRequestSession } from "@/util/session";
import { Link } from "react-router";
import { useTheme } from "~/hooks/useTheme";
import { ThemeToggle } from "~/components/ThemeToggle";
import InteractivePlayground from "~/components/landing-v5/InteractivePlayground";
import { CustomerLogos, Testimonials } from "~/components/landing-v5";

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
   COMPONENT: SocialProofBar
   
   Purpose: Small trust signal at the top of the hero. Establishes credibility
   before asking for attention.
   
   Implementation notes:
   - Show real metrics: GitHub stars, npm downloads, videos rendered
   - Fetch from API or use static fallback
   - Update periodically (not real-time, too distracting)
   ============================================================================== */
function SocialProofBar() {
  // TODO: Fetch real metrics from API
  // For now, use static placeholders that should be replaced with real data
  return (
    <div className="flex items-center justify-center gap-6 mb-8 text-sm text-slate-500 dark:text-slate-400">
      <div className="flex items-center gap-2">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
        </svg>
        <span className="font-medium text-slate-700 dark:text-slate-300">2.4k</span> stars
      </div>
      <div className="w-px h-4 bg-slate-300 dark:bg-slate-700" />
      <div className="flex items-center gap-2">
        <span className="font-medium text-slate-700 dark:text-slate-300">50k+</span> videos rendered
      </div>
      <div className="w-px h-4 bg-slate-300 dark:bg-slate-700" />
      <div className="flex items-center gap-2">
        <span className="font-medium text-slate-700 dark:text-slate-300">Open source</span>
      </div>
    </div>
  );
}


/* ==============================================================================
   COMPONENT: HeroDemo
   
   Purpose: The centerpiece of the hero. Shows the product in action.
   This is NOT a placeholder image - it should be an actual working demo
   or at minimum an autoplay video.
   
   Implementation requirements:
   - Option A (ideal): Embedded mini-editor with live preview
     - Simplified code editor (read-only or limited editing)
     - Video preview that plays automatically
     - Timeline scrubbing interaction
   
   - Option B (acceptable): High-quality product video
     - Autoplay, muted, looped
     - Shows: code editing → instant preview → timeline scrubbing
     - 10-15 seconds, professionally produced
   
   - Option C (fallback): Animated mockup
     - CSS/JS animation showing the workflow
     - Better than a static screenshot
   
   Technical notes:
   - Must be performant - don't block page load
   - Lazy load video content
   - Provide poster image for initial paint
   ============================================================================== */
function HeroDemo() {
  const codeLines = [
    { num: 1, content: <><span className="text-purple-400">import</span> {'{'} Timegroup, Video, Text {'}'} <span className="text-purple-400">from</span> <span className="text-emerald-400">'@editframe/react'</span>;</> },
    { num: 2, content: '' },
    { num: 3, content: <><span className="text-purple-400">export function</span> <span className="text-yellow-300">SocialClip</span>() {'{'}</> },
    { num: 4, content: <>&nbsp;&nbsp;<span className="text-purple-400">return</span> (</> },
    { num: 5, content: <>&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-blue-400">{'<Timegroup'}</span> <span className="text-sky-300">className</span>=<span className="text-emerald-400">"w-[1080px] h-[1920px]"</span><span className="text-blue-400">{'>'}</span></> },
    { num: 6, content: <>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-blue-400">{'<Video'}</span></> },
    { num: 7, content: <>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-sky-300">src</span>=<span className="text-emerald-400">"interview.mp4"</span></> },
    { num: 8, content: <>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-sky-300">className</span>=<span className="text-emerald-400">"absolute inset-0 object-cover"</span></> },
    { num: 9, content: <>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-blue-400">{'/>'}</span></> },
    { num: 10, content: <>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-blue-400">{'<Text'}</span></> },
    { num: 11, content: <>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-sky-300">className</span>=<span className="text-emerald-400">"absolute bottom-20 left-8 right-8</span></> },
    { num: 12, content: <><span className="text-emerald-400">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;text-white text-4xl font-bold"</span></> },
    { num: 13, content: <>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-sky-300">style</span>={'{{'}</> },
    { num: 14, content: <>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-sky-300">animation</span>: <span className="text-emerald-400">'fadeIn 0.5s ease-out'</span></> },
    { num: 15, content: <>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{'}}'}</> },
    { num: 16, content: <>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-blue-400">{'>'}</span></> },
    { num: 17, content: <>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{'{'}<span className="text-slate-300">data.headline</span>{'}'}</> },
    { num: 18, content: <>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-blue-400">{'</Text>'}</span></> },
    { num: 19, content: <>&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-blue-400">{'</Timegroup>'}</span></> },
    { num: 20, content: <>&nbsp;&nbsp;);</> },
    { num: 21, content: <>{'}'}<span className="animate-blink-cursor text-emerald-400">|</span></> },
  ];

  return (
    <div className="relative max-w-5xl mx-auto">
      {/* Glow effect */}
      <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500/20 via-blue-500/20 to-purple-500/20 rounded-3xl blur-2xl opacity-50 dark:opacity-30 animate-gradient" />
      
      {/* Demo container */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl shadow-slate-900/10 dark:shadow-none">
        {/* Window chrome */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-amber-400" />
            <div className="w-3 h-3 rounded-full bg-emerald-400" />
          </div>
          <div className="flex-1 text-center">
            <span className="text-xs text-slate-500 font-mono">editframe dev server</span>
          </div>
        </div>
        
        {/* Demo content */}
        <div className="grid md:grid-cols-2 divide-x divide-slate-200 dark:divide-slate-800">
          {/* Code panel */}
          <div className="bg-slate-950 font-mono text-sm overflow-hidden">
            {/* File tabs */}
            <div className="flex items-center border-b border-slate-800 bg-slate-900/50">
              <div className="flex items-center gap-2 px-4 py-2 border-b-2 border-emerald-500 bg-slate-950">
                <svg className="w-4 h-4 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M14.23 12.004a2.236 2.236 0 0 1-2.235 2.236 2.236 2.236 0 0 1-2.236-2.236 2.236 2.236 0 0 1 2.235-2.236 2.236 2.236 0 0 1 2.236 2.236zm2.648-10.69c-1.346 0-3.107.96-4.888 2.622-1.78-1.653-3.542-2.602-4.887-2.602-.41 0-.783.093-1.106.278-1.375.793-1.683 3.264-.973 6.365C1.98 8.917 0 10.42 0 12.004c0 1.59 1.99 3.097 5.043 4.03-.704 3.113-.39 5.588.988 6.38.32.187.69.275 1.102.275 1.345 0 3.107-.96 4.888-2.624 1.78 1.654 3.542 2.603 4.887 2.603.41 0 .783-.09 1.106-.275 1.374-.792 1.683-3.263.973-6.365C22.02 15.096 24 13.59 24 12.004c0-1.59-1.99-3.097-5.043-4.032.704-3.11.39-5.587-.988-6.38a2.167 2.167 0 0 0-1.092-.278zm-.005 1.09v.006c.225 0 .406.044.558.127.666.382.955 1.835.73 3.704-.054.46-.142.945-.25 1.44a23.476 23.476 0 0 0-3.107-.534A23.892 23.892 0 0 0 12.769 4.7c1.592-1.48 3.087-2.292 4.105-2.295zm-9.77.02c1.012 0 2.514.808 4.11 2.28-.686.72-1.37 1.537-2.02 2.442a22.73 22.73 0 0 0-3.113.538 15.02 15.02 0 0 1-.254-1.42c-.23-1.868.054-3.32.714-3.707.19-.09.4-.127.563-.132zm4.882 3.05c.455.468.91.992 1.36 1.564-.44-.02-.89-.034-1.345-.034-.46 0-.915.01-1.36.034.44-.572.895-1.096 1.345-1.565zM12 8.1c.74 0 1.477.034 2.202.093.406.582.802 1.203 1.183 1.86.372.64.71 1.29 1.018 1.946-.308.655-.646 1.31-1.013 1.95-.38.66-.773 1.288-1.18 1.87a25.64 25.64 0 0 1-4.412.005 26.64 26.64 0 0 1-1.183-1.86c-.372-.64-.71-1.29-1.018-1.946a25.17 25.17 0 0 1 1.013-1.954c.38-.66.773-1.286 1.18-1.868A25.245 25.245 0 0 1 12 8.098zm-3.635.254c-.24.377-.48.763-.704 1.16-.225.39-.435.782-.635 1.174-.265-.656-.49-1.31-.676-1.947.64-.15 1.315-.283 2.015-.386zm7.26 0c.695.103 1.365.23 2.006.387-.18.632-.405 1.282-.66 1.933a25.952 25.952 0 0 0-1.345-2.32zm3.063.675c.484.15.944.317 1.375.498 1.732.74 2.852 1.708 2.852 2.476-.005.768-1.125 1.74-2.857 2.475-.42.18-.88.342-1.355.493a23.966 23.966 0 0 0-1.1-2.98c.45-1.017.81-2.01 1.085-2.964zm-13.395.004c.278.96.645 1.957 1.1 2.98-.45 1.017-.812 2.01-1.086 2.964-.484-.15-.944-.318-1.37-.5-1.732-.737-2.852-1.706-2.852-2.474 0-.768 1.12-1.742 2.852-2.476.42-.18.88-.342 1.356-.494zm11.678 4.28c.265.657.49 1.312.676 1.948-.64.157-1.316.29-2.016.39a25.819 25.819 0 0 0 1.341-2.338zm-9.945.02c.24.377.48.763.705 1.16.225.39.435.788.636 1.18-.7.103-1.37.23-2.006.386.18-.63.406-1.282.66-1.93l.005-.798zm4.355 5.956c-.455-.468-.91-.993-1.36-1.565.44.02.89.034 1.345.034.46 0 .915-.01 1.36-.034-.44.572-.895 1.097-1.345 1.565z" />
                </svg>
                <span className="text-xs text-slate-300">composition.tsx</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 text-slate-500 hover:text-slate-300 cursor-pointer transition-colors">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-xs">styles.css</span>
              </div>
            </div>
            
            {/* Code content with line numbers */}
            <div className="flex text-[13px] leading-[1.6] overflow-x-auto">
              {/* Line numbers gutter */}
              <div className="flex-shrink-0 select-none border-r border-slate-800 bg-slate-900/30 pr-2 pl-4 py-4">
                {codeLines.map((line) => (
                  <div key={line.num} className="text-right text-slate-600 h-[1.6em]">
                    {line.num}
                  </div>
                ))}
              </div>
              
              {/* Code */}
              <div className="flex-1 py-4 px-4 min-w-0">
                {codeLines.map((line) => (
                  <div key={line.num} className="text-slate-300 h-[1.6em] whitespace-pre">
                    {line.content}
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Preview panel */}
          <div className="aspect-video md:aspect-auto bg-slate-100 dark:bg-slate-950 flex items-center justify-center min-h-[300px] relative overflow-hidden">
            {/* Scan line effect for "live" feel */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent animate-scan-line" />
            </div>
            
            {/* Preview content with pulse */}
            <div className="text-center p-8 animate-preview-pulse rounded-2xl">
              <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center mx-auto mb-4 relative">
                {/* Live indicator dot */}
                <div className="absolute -top-1 -right-1 w-3 h-3">
                  <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-75" />
                  <span className="absolute inset-0 rounded-full bg-emerald-500" />
                </div>
                <svg className="w-8 h-8 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-2 flex items-center justify-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live preview
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500">Video updates as you type</p>
              
              {/* Preview frame mockup */}
              <div className="mt-6 mx-auto w-24 h-40 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-slate-200/50 to-slate-300/50 dark:from-slate-800/50 dark:to-slate-700/50" />
                <span className="text-[10px] text-slate-400 font-mono relative">9:16</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Timeline */}
        <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
          <div className="flex items-center gap-4">
            {/* Play button with hover effect */}
            <button className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-all play-button-hover group">
              <svg className="w-5 h-5 text-slate-600 dark:text-slate-400 group-hover:text-emerald-500 transition-colors play-icon" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>
            
            {/* Timeline track */}
            <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden relative">
              {/* Animated progress bar */}
              <div className="h-full bg-emerald-500 rounded-full animate-playhead" />
              {/* Playhead indicator */}
              <div className="absolute top-1/2 -translate-y-1/2 h-4 w-1 bg-emerald-500 rounded-full shadow-lg animate-playhead" style={{ left: 'calc(var(--progress, 33%) - 2px)' }} />
            </div>
            
            {/* Time display */}
            <span className="text-xs text-slate-500 font-mono tabular-nums">0:04 / 0:12</span>
          </div>
          
          {/* Mini track visualization */}
          <div className="mt-3 flex gap-1">
            <div className="flex-1 h-6 rounded bg-slate-200 dark:bg-slate-800 overflow-hidden relative">
              <div className="absolute inset-y-0 left-0 w-full bg-gradient-to-r from-blue-500/30 via-emerald-500/30 to-purple-500/30" />
              <div className="absolute inset-y-1 left-1 right-1 flex gap-1">
                <div className="h-full flex-[3] rounded-sm bg-blue-500/50" title="Video" />
                <div className="h-full flex-[2] rounded-sm bg-emerald-500/50" title="Text" />
              </div>
              {/* Playhead line */}
              <div className="absolute top-0 bottom-0 w-0.5 bg-white dark:bg-slate-300 shadow animate-playhead" />
            </div>
          </div>
        </div>
      </div>
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
   COMPONENT: ArchitectureDiagram
   
   Purpose: Show technical buyers HOW the system works. Build confidence
   that we've solved real engineering problems.
   
   IMPLEMENTATION REQUIREMENTS:
   
   Visual design:
   - Clean, modern diagram style (not generic Lucidchart look)
   - Show two paths: Preview and Render
   - Animated flow indicators
   - Dark mode support
   
   Content:
   Preview path:
   1. React Components → 2. DOM Rendering → 3. Canvas Capture → 4. Instant Preview
   
   Render path:
   1. Composition → 2. Frame-by-frame capture → 3. WebCodecs/FFmpeg → 4. CDN Delivery
   
   Technical approach:
   - SVG-based for crisp rendering at any size
   - CSS animations for flow indicators
   - Responsive layout (stack vertically on mobile)
   - Interactive: hover states explaining each step
   ============================================================================== */
function ArchitectureDiagram() {
  /*
   * TODO: Implement proper SVG architecture diagram
   * 
   * Requirements:
   * - Two parallel pipelines (Preview / Render)
   * - Animated data flow indicators
   * - Hover tooltips explaining each component
   * - Responsive: horizontal on desktop, vertical on mobile
   */
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 mb-12">
      <div className="grid md:grid-cols-2 gap-8">
        {/* Preview Pipeline */}
        <div>
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-500 rounded-full" />
            Preview Pipeline
          </h3>
          <div className="space-y-4">
            {[
              { label: 'React Components', desc: 'Your JSX code' },
              { label: 'DOM Rendering', desc: 'Browser layout engine' },
              { label: 'JIT Transcoding', desc: 'On-demand media processing' },
              { label: 'Canvas Capture', desc: 'Frame extraction' },
              { label: 'Instant Preview', desc: '< 50ms latency' },
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-mono text-sm font-bold">
                  {i + 1}
                </div>
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">{step.label}</p>
                  <p className="text-sm text-slate-500">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Render Pipeline */}
        <div>
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-500 rounded-full" />
            Render Pipeline
          </h3>
          <div className="space-y-4">
            {[
              { label: 'Composition', desc: 'Serialized timeline' },
              { label: 'Frame Capture', desc: 'Headless browser rendering' },
              { label: 'WebCodecs / FFmpeg', desc: 'Hardware-accelerated encoding' },
              { label: 'CDN Delivery', desc: 'Global edge distribution' },
              { label: 'Webhook', desc: 'Completion notification' },
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 font-mono text-sm font-bold">
                  {i + 1}
                </div>
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">{step.label}</p>
                  <p className="text-sm text-slate-500">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


/* ==============================================================================
   COMPONENT: PerformanceMetrics
   
   Purpose: Back up claims with real numbers. Technical buyers need proof.
   
   IMPLEMENTATION REQUIREMENTS:
   
   Metrics to show (need real data):
   - Preview latency: "< 50ms" average seek-to-display time
   - Render speed: "120 fps" encoding rate
   - Scale: "10,000+ videos/hour" on cloud infrastructure
   
   Each metric should have:
   - Large number (the impressive stat)
   - Label (what it measures)
   - Context (why it matters)
   - Optional: link to methodology/benchmark
   
   These numbers MUST be real and auditable. Don't make them up.
   ============================================================================== */
function PerformanceMetrics() {
  // TODO: Replace with real metrics from benchmarks
  const metrics = [
    {
      value: '< 50ms',
      label: 'Preview latency',
      context: 'Seek-to-display time in browser',
    },
    {
      value: '120 fps',
      label: 'Encoding speed',
      context: '1080p H.264 on modern hardware',
    },
    {
      value: '10,000+',
      label: 'Videos per hour',
      context: 'Cloud rendering at scale',
    },
    {
      value: '99.9%',
      label: 'Uptime SLA',
      context: 'Enterprise tier guarantee',
    },
  ];
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
      {metrics.map((metric, i) => (
        <div key={i} className="text-center">
          <div className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-2">
            {metric.value}
          </div>
          <div className="font-medium text-slate-700 dark:text-slate-300 mb-1">
            {metric.label}
          </div>
          <div className="text-sm text-slate-500">
            {metric.context}
          </div>
        </div>
      ))}
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
   COMPONENT: VideoShowcase
   
   Purpose: Show real outputs. Videos made with Editframe. Proof that the
   tool produces professional results.
   
   IMPLEMENTATION REQUIREMENTS:
   
   Content needed:
   - 6-9 example videos with diverse styles
   - Each video: MP4 file, thumbnail, title, duration, source code link
   - Mix of: social content, data viz, educational, marketing
   
   Technical implementation:
   - Lazy load video thumbnails
   - Click to play in lightbox modal
   - "View code" links to GitHub examples
   - Responsive grid: 1 col mobile, 2 col tablet, 3 col desktop
   
   Video sources:
   - Need to create/curate actual example videos
   - Store in CDN with proper caching
   - Provide poster images for fast initial load
   ============================================================================== */
function VideoShowcase() {
  // TODO: Replace with real video examples
  const videos = [
    { id: 1, title: 'Product Launch', category: 'Marketing', duration: '0:30' },
    { id: 2, title: 'Podcast Clip', category: 'Social', duration: '0:45' },
    { id: 3, title: 'Q3 Results', category: 'Data', duration: '1:15' },
    { id: 4, title: 'Tutorial Intro', category: 'Education', duration: '0:20' },
    { id: 5, title: 'Event Recap', category: 'Marketing', duration: '0:55' },
    { id: 6, title: 'Quote Card', category: 'Social', duration: '0:10' },
  ];
  
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {videos.map((video) => (
        <div key={video.id} className="group cursor-pointer">
          <div className="relative aspect-video bg-slate-200 dark:bg-slate-800 rounded-xl overflow-hidden mb-3">
            {/* Thumbnail placeholder */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-white/90 dark:bg-slate-900/90 flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5 text-slate-900 dark:text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
            
            {/* Duration badge */}
            <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 rounded text-xs text-white font-mono">
              {video.duration}
            </div>
          </div>
          
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-medium text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                {video.title}
              </h3>
              <p className="text-sm text-slate-500">{video.category}</p>
            </div>
            <a href="#" className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline">
              Code
            </a>
          </div>
        </div>
      ))}
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


/* ==============================================================================
   COMPONENT: TerminalDemo
   
   Purpose: Show the getting started flow. Make it feel fast and easy.
   
   Animation sequence:
   1. Type: npm create @editframe@latest
   2. Show prompts and answers appearing
   3. Show success messages
   4. Type: cd my-video-app && npm run dev
   5. Show server ready message
   6. Loop after 5 second pause
   
   Technical approach:
   - CSS transitions for fade-in effects
   - requestAnimationFrame for smooth typing
   - Respects prefers-reduced-motion
   ============================================================================== */

type AnimationStep = 
  | { type: 'type'; text: string; speed?: number }
  | { type: 'output'; lines: OutputLine[]; delay?: number }
  | { type: 'pause'; duration: number };

type OutputLine = {
  text: string;
  className?: string;
  delay?: number;
};

const ANIMATION_STEPS: AnimationStep[] = [
  { type: 'type', text: 'npm create @editframe@latest', speed: 40 },
  { type: 'pause', duration: 400 },
  { 
    type: 'output', 
    lines: [
      { text: '? Project name: my-video-app', className: 'text-slate-500', delay: 0 },
      { text: '? Template: Social Clip', className: 'text-slate-500', delay: 300 },
    ],
    delay: 200
  },
  { type: 'pause', duration: 600 },
  {
    type: 'output',
    lines: [
      { text: '', className: 'h-2', delay: 0 },
      { text: 'Creating project...', className: 'text-slate-400', delay: 0 },
    ],
    delay: 100
  },
  { type: 'pause', duration: 800 },
  {
    type: 'output',
    lines: [
      { text: '✓ Created my-video-app/', className: 'text-slate-400 [&>span:first-child]:text-emerald-400', delay: 0 },
      { text: '✓ Installed dependencies', className: 'text-slate-400 [&>span:first-child]:text-emerald-400', delay: 400 },
    ],
    delay: 100
  },
  { type: 'pause', duration: 800 },
  { type: 'type', text: 'cd my-video-app && npm run dev', speed: 35 },
  { type: 'pause', duration: 600 },
  {
    type: 'output',
    lines: [
      { text: '', className: 'h-2', delay: 0 },
      { text: '✓ Dev server ready', className: 'text-emerald-400', delay: 0 },
      { text: '', className: 'h-1', delay: 200 },
      { text: 'Local:   http://localhost:3000', className: 'text-slate-500', delay: 400 },
      { text: 'Preview: http://localhost:3000/preview', className: 'text-slate-500', delay: 200 },
    ],
    delay: 300
  },
  { type: 'pause', duration: 5000 },
];

function TerminalDemo() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [typedText, setTypedText] = useState('');
  const [visibleOutputs, setVisibleOutputs] = useState<{ stepIndex: number; lineIndex: number }[]>([]);
  const [commands, setCommands] = useState<{ text: string; complete: boolean }[]>([]);
  
  const animationRef = useRef<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  // Check for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  const resetAnimation = useCallback(() => {
    setCurrentStepIndex(0);
    setTypedText('');
    setVisibleOutputs([]);
    setCommands([]);
    isTypingRef.current = false;
  }, []);

  // Main animation loop
  useEffect(() => {
    if (prefersReducedMotion) {
      // Show everything immediately for reduced motion
      const allCommands: { text: string; complete: boolean }[] = [];
      const allOutputs: { stepIndex: number; lineIndex: number }[] = [];
      
      ANIMATION_STEPS.forEach((step, stepIndex) => {
        if (step.type === 'type') {
          allCommands.push({ text: step.text, complete: true });
        } else if (step.type === 'output') {
          step.lines.forEach((_, lineIndex) => {
            allOutputs.push({ stepIndex, lineIndex });
          });
        }
      });
      
      setCommands(allCommands);
      setVisibleOutputs(allOutputs);
      return;
    }

    const step = ANIMATION_STEPS[currentStepIndex];
    if (!step) {
      // Animation complete, restart after brief pause
      timeoutRef.current = setTimeout(resetAnimation, 100);
      return;
    }

    if (step.type === 'type') {
      if (!isTypingRef.current) {
        isTypingRef.current = true;
        setCommands(prev => [...prev, { text: '', complete: false }]);
      }

      const targetText = step.text;
      const speed = step.speed ?? 50;
      
      if (typedText.length < targetText.length) {
        timeoutRef.current = setTimeout(() => {
          setTypedText(targetText.slice(0, typedText.length + 1));
          setCommands(prev => {
            const newCommands = [...prev];
            if (newCommands.length > 0) {
              newCommands[newCommands.length - 1] = {
                text: targetText.slice(0, typedText.length + 1),
                complete: false
              };
            }
            return newCommands;
          });
        }, speed);
      } else {
        // Typing complete for this command
        setCommands(prev => {
          const newCommands = [...prev];
          const lastCommand = newCommands[newCommands.length - 1];
          if (lastCommand) {
            lastCommand.complete = true;
          }
          return newCommands;
        });
        setTypedText('');
        isTypingRef.current = false;
        setCurrentStepIndex(prev => prev + 1);
      }
    } else if (step.type === 'output') {
      const stepOutputs = visibleOutputs.filter(o => o.stepIndex === currentStepIndex);
      const nextLineIndex = stepOutputs.length;
      
      if (nextLineIndex < step.lines.length) {
        const line = step.lines[nextLineIndex];
        const delay = nextLineIndex === 0 ? (step.delay ?? 0) : (line?.delay ?? 100);
        
        timeoutRef.current = setTimeout(() => {
          setVisibleOutputs(prev => [...prev, { stepIndex: currentStepIndex, lineIndex: nextLineIndex }]);
        }, delay);
      } else {
        setCurrentStepIndex(prev => prev + 1);
      }
    } else if (step.type === 'pause') {
      timeoutRef.current = setTimeout(() => {
        setCurrentStepIndex(prev => prev + 1);
      }, step.duration);
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [currentStepIndex, typedText, visibleOutputs, prefersReducedMotion, resetAnimation]);

  // Build the rendered content
  const renderContent = () => {
    const elements: React.ReactNode[] = [];
    let commandIndex = 0;

    ANIMATION_STEPS.forEach((step, stepIndex) => {
      if (step.type === 'type') {
        const command = commands[commandIndex];
        if (command) {
          elements.push(
            <div key={`cmd-${stepIndex}`} className="flex items-center">
              <span className="text-emerald-400">$</span>
              <span className="text-slate-300 ml-2">
                {command.text}
                {!command.complete && (
                  <span className="inline-block w-2 h-4 bg-slate-300 ml-0.5 animate-[blink_1s_step-end_infinite]" />
                )}
              </span>
            </div>
          );
          commandIndex++;
        }
      } else if (step.type === 'output') {
        const stepOutputs = visibleOutputs.filter(o => o.stepIndex === stepIndex);
        if (stepOutputs.length > 0) {
          elements.push(
            <div key={`output-${stepIndex}`} className="space-y-1">
              {stepOutputs.map(({ lineIndex }) => {
                const line = step.lines[lineIndex];
                if (!line) return null;
                
                if (!line.text) {
                  return <div key={lineIndex} className={line.className} />;
                }
                
                // Handle checkmark prefix specially
                if (line.text.startsWith('✓')) {
                  return (
                    <p 
                      key={lineIndex} 
                      className={`${line.className ?? ''} animate-[fadeIn_0.2s_ease-out]`}
                    >
                      <span className="text-emerald-400">✓</span>
                      {line.text.slice(1)}
                    </p>
                  );
                }
                
                // Handle URLs
                if (line.text.includes('http://')) {
                  const parts = line.text.split(/(http:\/\/[^\s]+)/);
                  return (
                    <p 
                      key={lineIndex} 
                      className={`${line.className ?? ''} animate-[fadeIn_0.2s_ease-out]`}
                    >
                      {parts.map((part, i) => 
                        part.startsWith('http://') 
                          ? <span key={i} className="text-blue-400">{part}</span>
                          : part
                      )}
                    </p>
                  );
                }
                
                // Handle prompt lines with answers
                if (line.text.startsWith('?')) {
                  const colonIndex = line.text.indexOf(':');
                  if (colonIndex > -1) {
                    return (
                      <p 
                        key={lineIndex} 
                        className={`${line.className ?? ''} animate-[fadeIn_0.2s_ease-out]`}
                      >
                        {line.text.slice(0, colonIndex + 1)}
                        <span className="text-white">{line.text.slice(colonIndex + 1)}</span>
                      </p>
                    );
                  }
                }
                
                return (
                  <p 
                    key={lineIndex} 
                    className={`${line.className ?? ''} animate-[fadeIn_0.2s_ease-out]`}
                  >
                    {line.text}
                  </p>
                );
              })}
            </div>
          );
        }
      }
    });

    return elements;
  };

  return (
    <div className="relative">
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(2px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-\\[blink_1s_step-end_infinite\\] {
            animation: none;
            opacity: 1;
          }
          .animate-\\[fadeIn_0\\.2s_ease-out\\] {
            animation: none;
          }
        }
      `}} />
      <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500/10 to-blue-500/10 rounded-2xl blur-xl" />
      <div className="relative bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        {/* Window chrome */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-800 bg-slate-900">
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-amber-400" />
            <div className="w-3 h-3 rounded-full bg-emerald-400" />
          </div>
          <span className="text-xs text-slate-500 font-mono ml-2">Terminal</span>
        </div>
        
        {/* Terminal content */}
        <div className="p-6 font-mono text-sm space-y-3 min-h-[280px]">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
