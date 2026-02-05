import {
  type LoaderFunctionArgs,
  type MetaFunction,
  useLoaderData,
} from "react-router";
import { parseRequestSession } from "@/util/session";
import { Link } from "react-router";
import { useTheme } from "~/hooks/useTheme";
import { ThemeToggle } from "~/components/ThemeToggle";
import {
  SocialProofBar,
  HeroDemo,
  BeforeAfterComparison,
  InteractivePlayground,
  ArchitectureDiagram,
  PerformanceMetrics,
  CodeExamples,
  VideoShowcase,
  ComparisonTable,
  CustomerLogos,
  Testimonials,
  TerminalDemo,
} from "~/components/landing-v5/index.ts";

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
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a] text-black dark:text-white texture-paper">
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap');
        
        :root {
          --destijl-red: #E53935;
          --destijl-blue: #1565C0;
          --destijl-yellow: #FFD600;
          --destijl-black: #000000;
          --destijl-white: #FFFFFF;
        }
        
        .dark {
          --destijl-red: #EF5350;
          --destijl-blue: #42A5F5;
          --destijl-yellow: #FFEE58;
        }
        
        body {
          font-family: 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif;
        }
        
        .font-mono {
          font-family: 'JetBrains Mono', monospace;
        }
        
        .destijl-red { color: var(--destijl-red); }
        .destijl-blue { color: var(--destijl-blue); }
        .destijl-yellow { color: var(--destijl-yellow); }
        .bg-destijl-red { background-color: var(--destijl-red); }
        .bg-destijl-blue { background-color: var(--destijl-blue); }
        .bg-destijl-yellow { background-color: var(--destijl-yellow); }
        .border-destijl-red { border-color: var(--destijl-red); }
        .border-destijl-blue { border-color: var(--destijl-blue); }
        .border-destijl-yellow { border-color: var(--destijl-yellow); }
        
        /* === ANALOG PRINT TEXTURES === */
        
        /* Paper grain texture for backgrounds */
        .texture-paper {
          position: relative;
        }
        .texture-paper::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          opacity: 0.035;
          pointer-events: none;
          mix-blend-mode: multiply;
        }
        .dark .texture-paper::before {
          mix-blend-mode: soft-light;
          opacity: 0.08;
        }
        
        /* Ink spread texture for colored blocks */
        .texture-ink {
          box-shadow: inset 0 0 60px rgba(0,0,0,0.08);
        }
        .texture-ink-heavy {
          box-shadow: inset 0 0 80px rgba(0,0,0,0.12);
        }
        
        /* Letterpress effect for headlines */
        .text-letterpress {
          text-shadow: 
            0 1px 0 rgba(255,255,255,0.2),
            0 -1px 0 rgba(0,0,0,0.15);
        }
        .dark .text-letterpress {
          text-shadow: 
            0 1px 0 rgba(255,255,255,0.08),
            0 -1px 0 rgba(0,0,0,0.3);
        }
        
        /* Slight misregistration for print feel */
        .text-misregister {
          text-shadow: 
            -0.5px -0.5px 0 rgba(229, 57, 53, 0.12),
            0.5px 0.5px 0 rgba(21, 101, 192, 0.08);
        }
        
        /* Halftone pattern overlay */
        .texture-halftone::after {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(circle, transparent 45%, currentColor 46%);
          background-size: 3px 3px;
          opacity: 0.02;
          pointer-events: none;
        }
        
        /* Print ink bleed on text */
        .text-ink {
          text-shadow: 0 0 0.5px currentColor;
        }
        
        /* Worn/rough border effect */
        .border-worn {
          border-image: repeating-linear-gradient(
            90deg,
            currentColor 0px,
            currentColor 4px,
            transparent 4px,
            transparent 5px,
            currentColor 5px
          ) 1;
        }
        
        /* Subtle grain overlay for sections */
        .texture-grain {
          position: relative;
        }
        .texture-grain::after {
          content: '';
          position: absolute;
          inset: 0;
          background: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E");
          opacity: 0.025;
          pointer-events: none;
          mix-blend-mode: multiply;
        }
        
        /* Color block with slight variation (screen print) */
        .color-block-red {
          background: linear-gradient(
            165deg,
            var(--destijl-red) 0%,
            color-mix(in srgb, var(--destijl-red), black 4%) 50%,
            var(--destijl-red) 100%
          );
        }
        .color-block-blue {
          background: linear-gradient(
            165deg,
            var(--destijl-blue) 0%,
            color-mix(in srgb, var(--destijl-blue), black 5%) 50%,
            var(--destijl-blue) 100%
          );
        }
        .color-block-yellow {
          background: linear-gradient(
            165deg,
            var(--destijl-yellow) 0%,
            color-mix(in srgb, var(--destijl-yellow), black 3%) 50%,
            var(--destijl-yellow) 100%
          );
        }
        
        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }

        @keyframes blink-cursor {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }

        .animate-blink-cursor {
          animation: blink-cursor 1s step-end infinite;
        }
      `}} />

      {/* Navigation - Bauhaus geometric style */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b-4 border-black dark:border-white bg-white dark:bg-[#0a0a0a]">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center h-full border-r-4 border-black dark:border-white px-8">
            <span className="text-2xl font-black tracking-tighter uppercase">editframe</span>
          </Link>
          <div className="hidden md:flex items-center h-full">
            <Link to="/docs" className="h-full flex items-center px-6 border-l-4 border-black dark:border-white text-sm font-bold uppercase tracking-wider hover:bg-destijl-yellow hover:text-black transition-colors">
              Docs
            </Link>
            <Link to="/examples" className="h-full flex items-center px-6 border-l-4 border-black dark:border-white text-sm font-bold uppercase tracking-wider hover:bg-destijl-yellow hover:text-black transition-colors">
              Examples
            </Link>
            <Link to="/pricing" className="h-full flex items-center px-6 border-l-4 border-black dark:border-white text-sm font-bold uppercase tracking-wider hover:bg-destijl-yellow hover:text-black transition-colors">
              Pricing
            </Link>
          </div>
          <div className="flex items-center h-full">
            <div className="h-full flex items-center px-4 border-l-4 border-black dark:border-white">
              <ThemeToggle />
            </div>
            {isLoggedIn ? (
              <Link
                to="/dashboard"
                className="h-full flex items-center px-8 bg-black dark:bg-white text-white dark:text-black text-sm font-bold uppercase tracking-wider hover:bg-destijl-blue hover:text-white transition-colors"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link to="/login" className="h-full flex items-center px-6 border-l-4 border-black dark:border-white text-sm font-bold uppercase tracking-wider hover:bg-destijl-yellow hover:text-black transition-colors">
                  Sign in
                </Link>
                <Link
                  to="/welcome"
                  className="h-full flex items-center px-8 bg-destijl-red text-white text-sm font-bold uppercase tracking-wider hover:bg-destijl-blue transition-colors"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section - De Stijl / Mondrian composition */}
      <section className="relative min-h-screen pt-16">
        <div className="grid grid-cols-12 min-h-[calc(100vh-4rem)]">
          {/* Left geometric accent */}
          <div className="hidden lg:block col-span-1 color-block-blue texture-ink border-r-4 border-black dark:border-white" />
          
          {/* Main hero content */}
          <div className="col-span-12 lg:col-span-7 flex flex-col justify-center px-8 lg:px-16 py-24 border-r-0 lg:border-r-4 border-black dark:border-white">
            <SocialProofBar />

            <h1 className="text-6xl md:text-8xl lg:text-9xl font-black leading-[0.85] tracking-tighter uppercase mb-8 text-letterpress text-misregister">
              Build<br />
              <span className="destijl-red">video</span><br />
              with code
            </h1>
            
            <div className="w-24 h-2 bg-black dark:bg-white mb-8" />
            
            <p className="text-xl md:text-2xl mb-12 max-w-xl font-medium leading-relaxed">
              React components that render to video. Instant preview. Parallel rendering at scale.
            </p>

            <div className="flex flex-col sm:flex-row gap-0">
              <Link
                to="/welcome"
                className="inline-flex items-center justify-center px-10 py-5 bg-black dark:bg-white text-white dark:text-black font-bold uppercase tracking-wider text-sm hover:bg-destijl-red hover:text-white transition-colors border-4 border-black dark:border-white"
              >
                Start building
                <svg className="ml-3 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
              <Link
                to="/docs"
                className="inline-flex items-center justify-center px-10 py-5 bg-white dark:bg-[#0a0a0a] text-black dark:text-white font-bold uppercase tracking-wider text-sm hover:bg-destijl-yellow hover:text-black transition-colors border-4 border-black dark:border-white border-l-0"
              >
                Documentation
              </Link>
            </div>
          </div>

          {/* Right side - Geometric composition */}
          <div className="hidden lg:grid col-span-4 grid-rows-6">
            <div className="row-span-2 color-block-yellow texture-ink border-b-4 border-black dark:border-white" />
            <div className="row-span-3 bg-white dark:bg-[#0a0a0a] border-b-4 border-black dark:border-white p-8 flex items-center justify-center texture-grain">
              <HeroDemo />
            </div>
            <div className="row-span-1 color-block-red texture-ink-heavy" />
          </div>
        </div>
        
        {/* Mobile hero demo */}
        <div className="lg:hidden border-t-4 border-black dark:border-white p-8 bg-gray-50 dark:bg-[#111]">
          <HeroDemo />
        </div>
      </section>

      {/* Before/After Section - Grid composition */}
      <section className="border-t-4 border-black dark:border-white">
        <div className="grid grid-cols-12">
          {/* Section header */}
          <div className="col-span-12 lg:col-span-4 color-block-blue texture-ink text-white p-12 lg:p-16 border-b-4 lg:border-b-0 lg:border-r-4 border-black dark:border-white">
            <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter leading-[0.9] mb-6 text-letterpress">
              Before<br />& After
            </h2>
            <div className="w-16 h-1 bg-white mb-6" />
            <p className="text-lg font-medium opacity-90 text-ink">
              FFmpeg scripts and frame counting vs. React components and instant preview.
            </p>
          </div>
          
          {/* Comparison content */}
          <div className="col-span-12 lg:col-span-8 p-8 lg:p-16">
            <BeforeAfterComparison />
          </div>
        </div>
      </section>

      {/* Interactive Playground Section */}
      <section className="border-t-4 border-black dark:border-white">
        <div className="grid grid-cols-12">
          <div className="col-span-12 lg:col-span-3 color-block-yellow texture-ink border-b-4 lg:border-b-0 lg:border-r-4 border-black dark:border-white p-12">
            <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter leading-[0.9] text-black mb-6 text-letterpress">
              Try it<br />yourself
            </h2>
            <div className="w-16 h-1 bg-black mb-6" />
            <p className="text-lg font-medium text-black/80 text-ink">
              Edit code. Watch video update instantly.
            </p>
          </div>
          
          <div className="col-span-12 lg:col-span-9 p-8 lg:p-12 bg-gray-50 dark:bg-[#111]">
            <InteractivePlayground />
          </div>
        </div>
      </section>

      {/* Architecture Section */}
      <section className="border-t-4 border-black dark:border-white">
        <div className="grid grid-cols-12">
          <div className="col-span-12 border-b-4 border-black dark:border-white">
            <div className="grid grid-cols-12">
              <div className="col-span-2 lg:col-span-1 color-block-red texture-ink-heavy h-32" />
              <div className="col-span-10 lg:col-span-11 p-8 flex items-center texture-grain">
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.2em] destijl-blue mb-2 text-ink">Infrastructure</p>
                  <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tighter text-letterpress">
                    Production-Grade
                  </h2>
                </div>
              </div>
            </div>
          </div>
          
          <div className="col-span-12 lg:col-span-8 p-8 lg:p-12 border-r-0 lg:border-r-4 border-black dark:border-white">
            <ArchitectureDiagram />
          </div>
          
          <div className="col-span-12 lg:col-span-4 p-8 lg:p-12 bg-gray-50 dark:bg-[#111]">
            <PerformanceMetrics />
          </div>
        </div>
      </section>

      {/* Code Examples Section */}
      <section className="border-t-4 border-black dark:border-white">
        <div className="grid grid-cols-12">
          <div className="col-span-12 lg:col-span-2 bg-black dark:bg-white texture-ink border-b-4 lg:border-b-0 lg:border-r-4 border-black dark:border-white p-8 lg:p-12 flex flex-col justify-center">
            <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tighter leading-[0.9] text-white dark:text-black [writing-mode:horizontal-tb] lg:[writing-mode:vertical-rl] lg:rotate-180 text-letterpress">
              Code<br />Examples
            </h2>
          </div>
          
          <div className="col-span-12 lg:col-span-10 p-8 lg:p-12">
            <p className="text-xl font-medium mb-8 max-w-2xl">
              If you know React, you know Editframe. Familiar patterns, predictable behavior, excellent TypeScript support.
            </p>
            <CodeExamples />
          </div>
        </div>
      </section>

      {/* Video Showcase Section */}
      <section className="border-t-4 border-black dark:border-white bg-gray-50 dark:bg-[#111]">
        <div className="grid grid-cols-12">
          <div className="col-span-12 border-b-4 border-black dark:border-white p-8 lg:p-12 texture-grain">
            <div className="flex items-center gap-6">
              <div className="w-4 h-4 color-block-red texture-ink" />
              <div className="w-4 h-4 color-block-yellow texture-ink" />
              <div className="w-4 h-4 color-block-blue texture-ink" />
              <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tighter text-letterpress">
                Built with Editframe
              </h2>
            </div>
          </div>
          
          <div className="col-span-12 p-8 lg:p-12">
            <VideoShowcase />
          </div>
        </div>
      </section>

      {/* Comparison Section */}
      <section className="border-t-4 border-black dark:border-white">
        <div className="grid grid-cols-12">
          <div className="col-span-12 lg:col-span-3 color-block-blue texture-ink text-white border-b-4 lg:border-b-0 lg:border-r-4 border-black dark:border-white p-8 lg:p-12 flex flex-col justify-center">
            <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tighter leading-[0.9] mb-6 text-letterpress">
              How we<br />compare
            </h2>
            <div className="w-16 h-1 bg-white mb-6" />
            <p className="text-lg font-medium opacity-90 text-ink">
              An honest comparison to help you decide.
            </p>
          </div>
          
          <div className="col-span-12 lg:col-span-9 p-8 lg:p-12">
            <ComparisonTable />
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="border-t-4 border-black dark:border-white bg-gray-50 dark:bg-[#111]">
        <div className="p-8 lg:p-16">
          <CustomerLogos />
          <div className="mt-16">
            <Testimonials />
          </div>
        </div>
      </section>

      {/* Getting Started Section */}
      <section className="border-t-4 border-black dark:border-white">
        <div className="grid grid-cols-12">
          <div className="col-span-12 lg:col-span-5 p-8 lg:p-16 border-b-4 lg:border-b-0 lg:border-r-4 border-black dark:border-white texture-grain">
            <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter leading-[0.9] mb-8 text-letterpress text-misregister">
              Zero to video<br />
              <span className="destijl-red">2 minutes</span>
            </h2>
            
            <div className="w-24 h-2 bg-black dark:bg-white mb-8" />
            
            <p className="text-xl font-medium mb-10 text-ink">
              One command to scaffold. One command to develop. Hot reload that works.
            </p>
            
            <div className="space-y-6">
              <div className="flex items-start gap-6">
                <div className="flex-shrink-0 w-12 h-12 color-block-yellow texture-ink flex items-center justify-center text-black font-black text-xl">
                  1
                </div>
                <div>
                  <h3 className="font-bold uppercase tracking-wider mb-1 text-ink">Create project</h3>
                  <p className="text-sm opacity-70">
                    CLI scaffolds TypeScript, ESLint, and your chosen template.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-6">
                <div className="flex-shrink-0 w-12 h-12 color-block-blue texture-ink text-white flex items-center justify-center font-black text-xl">
                  2
                </div>
                <div>
                  <h3 className="font-bold uppercase tracking-wider mb-1 text-ink">Start developing</h3>
                  <p className="text-sm opacity-70">
                    Dev server with instant preview. Edit code, see video update.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-6">
                <div className="flex-shrink-0 w-12 h-12 color-block-red texture-ink text-white flex items-center justify-center font-black text-xl">
                  3
                </div>
                <div>
                  <h3 className="font-bold uppercase tracking-wider mb-1 text-ink">Render & deploy</h3>
                  <p className="text-sm opacity-70">
                    Render locally or push to cloud. Scale to ten thousand.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-10">
              <Link
                to="/docs/quickstart"
                className="inline-flex items-center font-bold uppercase tracking-wider text-sm hover:destijl-red transition-colors"
              >
                Read quickstart guide
                <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-7 p-8 lg:p-12 bg-gray-50 dark:bg-[#111] flex items-center">
            <TerminalDemo />
          </div>
        </div>
      </section>

      {/* Final CTA Section - Bold geometric */}
      <section className="border-t-4 border-black dark:border-white">
        <div className="grid grid-cols-12">
          <div className="col-span-2 lg:col-span-1 color-block-red texture-ink-heavy" />
          <div className="col-span-10 lg:col-span-7 p-12 lg:p-24 border-r-0 lg:border-r-4 border-black dark:border-white texture-grain">
            <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-[0.85] mb-8 text-letterpress text-misregister">
              Ready to<br />
              <span className="destijl-blue">build?</span>
            </h2>
            
            <p className="text-xl font-medium mb-12 max-w-lg">
              Start free with generous limits. No credit card. Upgrade when you scale.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-0">
              <Link
                to="/welcome"
                className="inline-flex items-center justify-center px-12 py-6 bg-black dark:bg-white text-white dark:text-black font-bold uppercase tracking-wider hover:bg-destijl-red hover:text-white transition-colors border-4 border-black dark:border-white"
              >
                Start building free
                <svg className="ml-3 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
              <Link
                to="/docs"
                className="inline-flex items-center justify-center px-12 py-6 bg-transparent font-bold uppercase tracking-wider hover:bg-destijl-yellow hover:text-black transition-colors border-4 border-black dark:border-white border-l-0"
              >
                Read docs
              </Link>
            </div>

            <p className="mt-8 text-sm font-medium opacity-70">
              Need enterprise features?{' '}
              <Link to="/contact" className="underline hover:destijl-blue">
                Talk to sales
              </Link>
            </p>
          </div>
          
          <div className="hidden lg:grid col-span-4 grid-rows-3">
            <div className="color-block-yellow texture-ink" />
            <div className="color-block-blue texture-ink" />
            <div className="bg-white dark:bg-[#0a0a0a] texture-grain" />
          </div>
        </div>
      </section>

      {/* Footer - Minimal Swiss style */}
      <footer className="border-t-4 border-black dark:border-white">
        <div className="grid grid-cols-12">
          {/* Logo column */}
          <div className="col-span-12 lg:col-span-3 p-8 lg:p-12 border-b-4 lg:border-b-0 lg:border-r-4 border-black dark:border-white">
            <Link to="/" className="text-2xl font-black uppercase tracking-tighter">editframe</Link>
            <p className="mt-4 text-sm font-medium opacity-70 max-w-xs">
              Build video with code. React components, instant preview, hyperscale rendering.
            </p>
          </div>
          
          {/* Links */}
          <div className="col-span-6 lg:col-span-2 p-8 lg:p-12 border-b-4 lg:border-b-0 lg:border-r-4 border-black dark:border-white">
            <h3 className="font-bold uppercase tracking-wider text-xs mb-6">Product</h3>
            <ul className="space-y-3">
              <li><Link to="/docs" className="text-sm font-medium hover:destijl-red transition-colors">Documentation</Link></li>
              <li><Link to="/examples" className="text-sm font-medium hover:destijl-red transition-colors">Examples</Link></li>
              <li><Link to="/pricing" className="text-sm font-medium hover:destijl-red transition-colors">Pricing</Link></li>
              <li><Link to="/changelog" className="text-sm font-medium hover:destijl-red transition-colors">Changelog</Link></li>
            </ul>
          </div>
          <div className="col-span-6 lg:col-span-2 p-8 lg:p-12 border-b-4 lg:border-b-0 lg:border-r-4 border-black dark:border-white">
            <h3 className="font-bold uppercase tracking-wider text-xs mb-6">Resources</h3>
            <ul className="space-y-3">
              <li><a href="https://discord.gg/editframe" target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:destijl-red transition-colors">Discord</a></li>
              <li><Link to="/blog" className="text-sm font-medium hover:destijl-red transition-colors">Blog</Link></li>
              <li><Link to="/contact" className="text-sm font-medium hover:destijl-red transition-colors">Contact</Link></li>
            </ul>
          </div>
          <div className="col-span-6 lg:col-span-2 p-8 lg:p-12 border-b-4 lg:border-b-0 lg:border-r-4 border-black dark:border-white">
            <h3 className="font-bold uppercase tracking-wider text-xs mb-6">Legal</h3>
            <ul className="space-y-3">
              <li><Link to="/privacy" className="text-sm font-medium hover:destijl-red transition-colors">Privacy</Link></li>
              <li><Link to="/terms" className="text-sm font-medium hover:destijl-red transition-colors">Terms</Link></li>
            </ul>
          </div>
          
          {/* Geometric accent */}
          <div className="col-span-6 lg:col-span-3 grid grid-cols-2">
            <div className="color-block-red texture-ink-heavy" />
            <div className="color-block-blue texture-ink-heavy" />
          </div>
        </div>
        
        {/* Bottom bar */}
        <div className="border-t-4 border-black dark:border-white p-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs font-bold uppercase tracking-wider">
            © 2026 Editframe, Inc.
          </p>
          <div className="flex items-center gap-6">
            <a href="https://twitter.com/editframe" target="_blank" rel="noopener noreferrer" className="hover:destijl-red transition-colors" aria-label="Twitter">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
            <a href="https://discord.gg/editframe" target="_blank" rel="noopener noreferrer" className="hover:destijl-red transition-colors" aria-label="Discord">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
              </svg>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
