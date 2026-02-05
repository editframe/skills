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
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#0a0a0a] text-[#1a1a1a] dark:text-[#e5e5e5]">
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap');
        
        :root {
          /* Swissted-inspired palette - bold but purposeful */
          --poster-red: #E53935;
          --poster-blue: #1565C0;
          --poster-gold: #FFB300;
          --poster-green: #2E7D32;
          --poster-pink: #EC407A;
          --ink-black: #1a1a1a;
          --paper-cream: #FAF8F5;
          --warm-gray: #6B6B6B;
        }
        
        .dark {
          --poster-red: #EF5350;
          --poster-blue: #42A5F5;
          --poster-gold: #FFCA28;
          --poster-green: #66BB6A;
          --poster-pink: #F06292;
          --paper-cream: #0a0a0a;
          --ink-black: #FAFAFA;
        }
        
        body {
          font-family: 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif;
        }
        
        .font-mono {
          font-family: 'JetBrains Mono', monospace;
        }
        
        /* Geometric pattern - radiating lines (Television poster) */
        .pattern-radiate {
          background-image: repeating-conic-gradient(
            from 0deg,
            var(--poster-red) 0deg 5deg,
            transparent 5deg 10deg
          );
        }
        
        /* Geometric pattern - concentric circles (Public Enemy poster) */
        .pattern-concentric {
          background: 
            radial-gradient(circle, transparent 20%, var(--poster-gold) 20%, var(--poster-gold) 25%, transparent 25%),
            radial-gradient(circle, transparent 40%, var(--poster-gold) 40%, var(--poster-gold) 45%, transparent 45%),
            radial-gradient(circle, transparent 60%, var(--poster-gold) 60%, var(--poster-gold) 65%, transparent 65%),
            radial-gradient(circle, transparent 80%, var(--poster-gold) 80%, var(--poster-gold) 85%, transparent 85%);
        }
        
        /* Paper texture */
        .texture-paper {
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E");
        }
        
        /* Bold shadows for poster effect */
        .shadow-poster {
          box-shadow: 
            8px 8px 0 rgba(0,0,0,0.1);
        }
        .shadow-poster-hard {
          box-shadow: 
            6px 6px 0 var(--ink-black);
        }
        
        /* Accent backgrounds - solid, bold */
        .bg-poster-red { background-color: var(--poster-red); }
        .bg-poster-blue { background-color: var(--poster-blue); }
        .bg-poster-gold { background-color: var(--poster-gold); }
        .bg-poster-green { background-color: var(--poster-green); }
        
        /* Border that looks like printed rule lines */
        .border-rule {
          border-color: rgba(0,0,0,0.15);
        }
        .dark .border-rule {
          border-color: rgba(255,255,255,0.15);
        }

        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}} />

      {/* Navigation - Bold, confident */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[var(--paper-cream)]/95 dark:bg-[#0a0a0a]/95 backdrop-blur-sm border-b-2 border-[var(--ink-black)] dark:border-white">
        <div className="max-w-7xl mx-auto flex items-center justify-between h-16 px-6">
          <Link to="/" className="flex items-center">
            <span className="text-xl font-black tracking-tighter uppercase">editframe</span>
          </Link>
          <div className="hidden md:flex items-center gap-1">
            <Link to="/docs" className="px-4 py-2 text-sm font-bold uppercase tracking-wider hover:bg-[var(--poster-gold)] transition-colors">
              Docs
            </Link>
            <Link to="/examples" className="px-4 py-2 text-sm font-bold uppercase tracking-wider hover:bg-[var(--poster-gold)] transition-colors">
              Examples
            </Link>
            <Link to="/pricing" className="px-4 py-2 text-sm font-bold uppercase tracking-wider hover:bg-[var(--poster-gold)] transition-colors">
              Pricing
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            {isLoggedIn ? (
              <Link
                to="/dashboard"
                className="px-5 py-2 bg-[var(--ink-black)] dark:bg-white text-white dark:text-black text-sm font-bold uppercase tracking-wider hover:bg-[var(--poster-blue)] transition-colors"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link to="/login" className="px-4 py-2 text-sm font-bold uppercase tracking-wider hover:bg-[var(--poster-gold)] transition-colors">
                  Sign in
                </Link>
                <Link
                  to="/welcome"
                  className="px-5 py-2 bg-[var(--poster-red)] text-white text-sm font-bold uppercase tracking-wider hover:bg-[var(--poster-blue)] transition-colors"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section - Bold geometric composition like Swissted posters */}
      <section className="relative pt-32 pb-24 bg-[var(--paper-cream)] dark:bg-[#0a0a0a] texture-paper overflow-hidden">
        {/* Geometric accent - bold radiating pattern (like Television poster) */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] -translate-y-1/4 translate-x-1/4">
          <svg viewBox="0 0 400 400" className="w-full h-full opacity-[0.12] dark:opacity-[0.08]">
            {/* Radiating lines pattern */}
            {Array.from({ length: 36 }).map((_, i) => (
              <line
                key={i}
                x1="200"
                y1="200"
                x2={200 + 200 * Math.cos((i * 10 * Math.PI) / 180)}
                y2={200 + 200 * Math.sin((i * 10 * Math.PI) / 180)}
                stroke="var(--poster-red)"
                strokeWidth={i % 2 === 0 ? "3" : "1"}
              />
            ))}
          </svg>
        </div>

        <div className="relative max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left - Typography as design element */}
            <div>
              <SocialProofBar />

              {/* Bold type treatment - stacked with color accent */}
              <h1 className="text-6xl md:text-7xl lg:text-8xl font-black leading-[0.9] tracking-tighter mb-6">
                <span className="block">Build</span>
                <span className="block">video</span>
                <span className="block text-[var(--poster-red)]">with code</span>
              </h1>
              
              {/* Bold geometric divider */}
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-3 bg-[var(--poster-gold)]" />
                <div className="w-6 h-3 bg-[var(--poster-blue)]" />
                <div className="w-3 h-3 bg-[var(--poster-red)]" />
              </div>
              
              <p className="text-xl text-[var(--warm-gray)] mb-10 max-w-md leading-relaxed">
                React components that render to video. Instant preview. Parallel rendering at scale.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  to="/welcome"
                  className="inline-flex items-center justify-center px-8 py-4 bg-[var(--ink-black)] dark:bg-white text-white dark:text-black font-bold text-sm uppercase tracking-wider shadow-poster-hard hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
                >
                  Start building
                  <svg className="ml-3 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
                <Link
                  to="/docs"
                  className="inline-flex items-center justify-center px-8 py-4 border-2 border-[var(--ink-black)] dark:border-white font-bold text-sm uppercase tracking-wider hover:bg-[var(--ink-black)] hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
                >
                  Documentation
                </Link>
              </div>
            </div>

            {/* Right - Demo with bold frame */}
            <div className="relative">
              {/* Geometric composition behind demo */}
              <div className="absolute -top-6 -right-6 w-full h-full bg-[var(--poster-blue)] dark:bg-[var(--poster-blue)]" />
              <div className="absolute -top-3 -right-3 w-full h-full bg-[var(--poster-gold)]" />
              <div className="relative bg-white dark:bg-[#111] border-4 border-[var(--ink-black)] dark:border-white overflow-hidden">
                <HeroDemo />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Before/After Section - Bold contrast */}
      <section className="relative py-24 border-t-4 border-[var(--ink-black)] dark:border-white overflow-hidden">
        {/* Geometric pattern - repeating arrows (like Velvet Underground poster) */}
        <div className="absolute bottom-0 left-0 w-64 h-64 opacity-[0.06] dark:opacity-[0.04]">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            {Array.from({ length: 5 }).map((_, row) =>
              Array.from({ length: 5 }).map((_, col) => (
                <polygon
                  key={`${row}-${col}`}
                  points={`${col * 20 + 10},${row * 20 + 5} ${col * 20 + 5},${row * 20 + 15} ${col * 20 + 15},${row * 20 + 15}`}
                  fill="var(--poster-green)"
                />
              ))
            )}
          </svg>
        </div>

        <div className="relative max-w-7xl mx-auto px-6">
          <div className="flex items-start gap-6 mb-16">
            {/* Bold color block accent */}
            <div className="hidden md:block w-4 h-32 bg-[var(--poster-red)] flex-shrink-0" />
            <div>
              <h2 className="text-5xl md:text-6xl font-black tracking-tighter uppercase mb-4">
                Before & After
              </h2>
              <p className="text-xl text-[var(--warm-gray)] max-w-xl">
                FFmpeg scripts and frame counting vs. React components and instant preview.
              </p>
            </div>
          </div>
          
          <BeforeAfterComparison />
        </div>
      </section>

      {/* Interactive Playground Section - Full bleed with bold color */}
      <section className="relative py-24 bg-[var(--poster-blue)] text-white overflow-hidden">
        {/* Concentric circles pattern (like Public Enemy poster) */}
        <div className="absolute top-1/2 right-0 w-[500px] h-[500px] -translate-y-1/2 translate-x-1/4 opacity-10">
          <svg viewBox="0 0 200 200" className="w-full h-full">
            <circle cx="100" cy="100" r="90" fill="none" stroke="white" strokeWidth="4" />
            <circle cx="100" cy="100" r="70" fill="none" stroke="white" strokeWidth="4" />
            <circle cx="100" cy="100" r="50" fill="none" stroke="white" strokeWidth="4" />
            <circle cx="100" cy="100" r="30" fill="none" stroke="white" strokeWidth="4" />
            <circle cx="100" cy="100" r="10" fill="white" />
          </svg>
        </div>

        <div className="relative max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-5xl md:text-6xl font-black tracking-tighter uppercase mb-6">
              Edit code,<br />see video
            </h2>
            <p className="text-xl text-white/80">
              Experience instant preview. No account required.
            </p>
          </div>
          
          <div className="relative">
            <div className="absolute -top-4 -left-4 w-full h-full bg-[var(--poster-gold)]" />
            <div className="relative border-4 border-[var(--ink-black)] overflow-hidden">
              <InteractivePlayground />
            </div>
          </div>
        </div>
      </section>

      {/* Architecture Section - Technical credibility with geometric accent */}
      <section className="relative py-24 bg-[var(--paper-cream)] dark:bg-[#0a0a0a] border-t-4 border-[var(--ink-black)] dark:border-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-3 gap-16">
            <div>
              {/* Bold number as design element */}
              <div className="text-[120px] font-black leading-none text-[var(--poster-gold)] opacity-30 -mb-8">
                02
              </div>
              <h2 className="text-4xl md:text-5xl font-black tracking-tighter uppercase mb-6">
                Production<br />Grade
              </h2>
              <p className="text-lg text-[var(--warm-gray)] leading-relaxed mb-8">
                Dual pipeline architecture: instant preview for development, parallel rendering for production.
              </p>
              <PerformanceMetrics />
            </div>
            
            <div className="lg:col-span-2">
              <div className="relative">
                <div className="absolute -bottom-4 -right-4 w-full h-full bg-[var(--poster-green)] dark:bg-[var(--poster-green)]" />
                <div className="relative bg-white dark:bg-[#111] border-4 border-[var(--ink-black)] dark:border-white p-6">
                  <ArchitectureDiagram />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Code Examples Section - Dark with geometric pattern */}
      <section className="relative py-24 bg-[var(--ink-black)] text-white overflow-hidden">
        {/* Diagonal stripes pattern */}
        <div className="absolute inset-0 opacity-[0.03]">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="diagonals" patternUnits="userSpaceOnUse" width="40" height="40" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="40" stroke="white" strokeWidth="20"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#diagonals)"/>
          </svg>
        </div>

        <div className="relative max-w-7xl mx-auto px-6">
          <div className="flex items-start gap-8 mb-16">
            {/* Stacked color blocks */}
            <div className="hidden md:flex flex-col gap-2 flex-shrink-0">
              <div className="w-8 h-8 bg-[var(--poster-red)]" />
              <div className="w-8 h-8 bg-[var(--poster-gold)]" />
              <div className="w-8 h-8 bg-[var(--poster-blue)]" />
            </div>
            <div>
              <h2 className="text-5xl md:text-6xl font-black tracking-tighter uppercase mb-4">
                Code<br />Examples
              </h2>
              <p className="text-xl text-white/70 max-w-xl">
                If you know React, you know Editframe. Familiar patterns, predictable behavior.
              </p>
            </div>
          </div>
          
          <CodeExamples />
        </div>
      </section>

      {/* Video Showcase Section */}
      <section className="relative py-24 bg-[var(--paper-cream)] dark:bg-[#0a0a0a] border-t-4 border-[var(--ink-black)] dark:border-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-end justify-between mb-16">
            <div className="flex items-start gap-6">
              {/* Bold number accent */}
              <div className="hidden md:block text-[100px] font-black leading-none text-[var(--poster-pink)] opacity-30 -mt-4">
                03
              </div>
              <h2 className="text-5xl md:text-6xl font-black tracking-tighter uppercase">
                Built with<br />Editframe
              </h2>
            </div>
            <Link 
              to="/examples" 
              className="hidden md:flex items-center px-6 py-3 bg-[var(--ink-black)] dark:bg-white text-white dark:text-black font-bold text-sm uppercase tracking-wider hover:bg-[var(--poster-red)] transition-colors"
            >
              View all
              <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
          
          <VideoShowcase />
        </div>
      </section>

      {/* Comparison Section */}
      <section className="py-24 bg-white dark:bg-[#111] border-t-4 border-[var(--ink-black)] dark:border-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-5xl md:text-6xl font-black tracking-tighter uppercase mb-6">
              How we compare
            </h2>
            <div className="flex justify-center gap-2 mb-6">
              <div className="w-16 h-2 bg-[var(--poster-blue)]" />
              <div className="w-8 h-2 bg-[var(--poster-red)]" />
              <div className="w-4 h-2 bg-[var(--poster-gold)]" />
            </div>
            <p className="text-lg text-[var(--warm-gray)]">
              An honest comparison to help you decide.
            </p>
          </div>
          
          <ComparisonTable />
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="relative py-24 bg-[var(--paper-cream)] dark:bg-[#0a0a0a] border-t-4 border-[var(--ink-black)] dark:border-white overflow-hidden">
        {/* Large geometric accent */}
        <div className="absolute -top-32 -left-32 w-64 h-64 border-[32px] border-[var(--poster-gold)] opacity-10 rounded-full" />
        
        <div className="relative max-w-7xl mx-auto px-6">
          <CustomerLogos />
          <div className="mt-20">
            <Testimonials />
          </div>
        </div>
      </section>

      {/* Getting Started Section */}
      <section className="py-24 bg-white dark:bg-[#111] border-t-4 border-[var(--ink-black)] dark:border-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-5xl md:text-6xl font-black tracking-tighter uppercase mb-2">
                Zero to video
              </h2>
              <h2 className="text-5xl md:text-6xl font-black tracking-tighter uppercase text-[var(--poster-red)] mb-8">
                in 2 minutes
              </h2>
              
              <p className="text-lg text-[var(--warm-gray)] mb-10">
                One command to scaffold. One command to develop. Hot reload that works.
              </p>
              
              <div className="space-y-0 mb-10 border-l-4 border-[var(--poster-gold)]">
                {[
                  { num: '01', title: 'Create project', desc: 'CLI scaffolds TypeScript, ESLint, and your chosen template.' },
                  { num: '02', title: 'Start developing', desc: 'Dev server with instant preview. Edit code, see video update.' },
                  { num: '03', title: 'Render & deploy', desc: 'Render locally or push to cloud. Scale to ten thousand.' },
                ].map((step, i) => (
                  <div key={i} className="flex gap-4 pl-6 py-4 border-b border-rule last:border-b-0">
                    <div className="flex-shrink-0 text-2xl font-black text-[var(--poster-gold)]">
                      {step.num}
                    </div>
                    <div>
                      <h3 className="font-bold uppercase tracking-wider text-sm mb-1">{step.title}</h3>
                      <p className="text-sm text-[var(--warm-gray)]">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <Link
                to="/docs/quickstart"
                className="inline-flex items-center px-6 py-3 border-2 border-[var(--ink-black)] dark:border-white font-bold text-sm uppercase tracking-wider hover:bg-[var(--ink-black)] hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
              >
                Read quickstart guide
                <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>

            <div className="relative">
              <div className="absolute -bottom-4 -right-4 w-full h-full bg-[var(--poster-red)]" />
              <div className="relative border-4 border-[var(--ink-black)] dark:border-white overflow-hidden">
                <TerminalDemo />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section - Bold poster-style composition */}
      <section className="relative py-32 bg-[var(--poster-red)] text-white overflow-hidden">
        {/* Bold geometric shapes */}
        <div className="absolute top-0 right-0 w-1/3 h-full bg-[var(--poster-blue)]" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-[var(--poster-gold)] -translate-x-1/2 translate-y-1/2" />
        <div className="absolute top-1/4 right-1/4 w-32 h-32 border-8 border-white opacity-20" />
        
        <div className="relative max-w-7xl mx-auto px-6 text-center">
          <h2 className="text-6xl md:text-8xl font-black tracking-tighter uppercase mb-6">
            Ready to<br />build?
          </h2>
          
          <p className="text-xl text-white/90 mb-10 max-w-lg mx-auto">
            Start free with generous limits. No credit card. Upgrade when you scale.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/welcome"
              className="inline-flex items-center justify-center px-10 py-4 bg-white text-[var(--ink-black)] font-bold uppercase tracking-wider shadow-poster-hard hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none transition-all"
            >
              Start building free
              <svg className="ml-3 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
            <Link
              to="/docs"
              className="inline-flex items-center justify-center px-10 py-4 border-2 border-white text-white font-bold uppercase tracking-wider hover:bg-white hover:text-[var(--poster-red)] transition-colors"
            >
              Read docs
            </Link>
          </div>

          <p className="mt-10 text-sm text-white/70">
            Need enterprise features?{' '}
            <Link to="/contact" className="underline hover:text-white font-bold">
              Talk to sales
            </Link>
          </p>
        </div>
      </section>

      {/* Footer - Bold, confident */}
      <footer className="py-16 bg-[var(--ink-black)] dark:bg-[#111] text-white border-t-4 border-[var(--poster-gold)]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-5 gap-12 mb-12">
            {/* Logo column */}
            <div className="md:col-span-2">
              <Link to="/" className="text-2xl font-black tracking-tighter uppercase">editframe</Link>
              <p className="mt-4 text-sm text-white/60 max-w-xs">
                Build video with code. React components, instant preview, hyperscale rendering.
              </p>
              {/* Color bar accent */}
              <div className="flex gap-1 mt-6">
                <div className="w-8 h-2 bg-[var(--poster-red)]" />
                <div className="w-8 h-2 bg-[var(--poster-gold)]" />
                <div className="w-8 h-2 bg-[var(--poster-blue)]" />
                <div className="w-8 h-2 bg-[var(--poster-green)]" />
              </div>
            </div>
            
            {/* Links */}
            <div>
              <h3 className="font-bold text-sm uppercase tracking-wider mb-4">Product</h3>
              <ul className="space-y-3">
                <li><Link to="/docs" className="text-sm text-white/60 hover:text-white transition-colors">Documentation</Link></li>
                <li><Link to="/examples" className="text-sm text-white/60 hover:text-white transition-colors">Examples</Link></li>
                <li><Link to="/pricing" className="text-sm text-white/60 hover:text-white transition-colors">Pricing</Link></li>
                <li><Link to="/changelog" className="text-sm text-white/60 hover:text-white transition-colors">Changelog</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-sm uppercase tracking-wider mb-4">Resources</h3>
              <ul className="space-y-3">
                <li><a href="https://discord.gg/editframe" target="_blank" rel="noopener noreferrer" className="text-sm text-white/60 hover:text-white transition-colors">Discord</a></li>
                <li><Link to="/blog" className="text-sm text-white/60 hover:text-white transition-colors">Blog</Link></li>
                <li><Link to="/contact" className="text-sm text-white/60 hover:text-white transition-colors">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-sm uppercase tracking-wider mb-4">Legal</h3>
              <ul className="space-y-3">
                <li><Link to="/privacy" className="text-sm text-white/60 hover:text-white transition-colors">Privacy</Link></li>
                <li><Link to="/terms" className="text-sm text-white/60 hover:text-white transition-colors">Terms</Link></li>
              </ul>
            </div>
          </div>
          
          {/* Bottom bar */}
          <div className="pt-8 border-t border-white/20 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-white/40">
              © 2026 Editframe, Inc.
            </p>
            <div className="flex items-center gap-6">
              <a href="https://twitter.com/editframe" target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-white transition-colors" aria-label="Twitter">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a href="https://discord.gg/editframe" target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-white transition-colors" aria-label="Discord">
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
