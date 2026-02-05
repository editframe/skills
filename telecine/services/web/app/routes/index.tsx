import {
  type LoaderFunctionArgs,
  type MetaFunction,
  useLoaderData,
} from "react-router";
import { useRef, useEffect, useState, type ReactNode } from "react";
import { parseRequestSession } from "@/util/session";
import { Link } from "react-router";
import { useTheme } from "~/hooks/useTheme";
import { ThemeToggle } from "~/components/ThemeToggle";

function FadeInSection({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`${className} ${isVisible ? "animate-fadeInUp" : "opacity-0 translate-y-8"}`}
    >
      {children}
    </div>
  );
}
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
  TrimTool,
  CaptionEditor,
  ThumbnailPicker,
  TextOverlayTool,
  ClientRenderDemo,
  TemplatedRenderingDemo,
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  useTheme();

  return (
    <div className="min-h-screen bg-[var(--paper-cream)] text-[var(--ink-black)]">
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
          --card-bg: #ffffff;
          --card-dark-bg: #1a1a1a;
        }
        
        .dark {
          --poster-red: #EF5350;
          --poster-blue: #42A5F5;
          --poster-gold: #FFCA28;
          --poster-green: #4CAF50;
          --poster-pink: #F06292;
          --paper-cream: #0a0a0a;
          --ink-black: #FAFAFA;
          --warm-gray: #9CA3AF;
          --card-bg: #111111;
          --card-dark-bg: #0a0a0a;
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
            6px 6px 0 #1a1a1a;
        }
        .dark .shadow-poster-hard {
          box-shadow: 
            6px 6px 0 rgba(255,255,255,0.3);
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

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(2rem);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeInUp {
          animation: fadeInUp 0.6s ease-out forwards;
        }

        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}} />

      {/* Navigation - Bold, confident */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[var(--paper-cream)] border-b-2 border-[var(--ink-black)] dark:border-white">
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
                <Link to="/login" className="hidden md:inline-flex px-4 py-2 text-sm font-bold uppercase tracking-wider hover:bg-[var(--poster-gold)] transition-colors">
                  Sign in
                </Link>
                <Link
                  to="/welcome"
                  className="hidden md:inline-flex px-5 py-2 bg-[var(--poster-red)] text-white text-sm font-bold uppercase tracking-wider hover:bg-[var(--poster-blue)] transition-colors"
                >
                  Get Started
                </Link>
              </>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden flex flex-col gap-1.5 p-2"
              aria-label="Toggle menu"
            >
              <div className={`w-5 h-0.5 bg-[var(--ink-black)] dark:bg-white transition-transform ${mobileMenuOpen ? "translate-y-[4px] rotate-45" : ""}`} />
              <div className={`w-5 h-0.5 bg-[var(--ink-black)] dark:bg-white transition-opacity ${mobileMenuOpen ? "opacity-0" : ""}`} />
              <div className={`w-5 h-0.5 bg-[var(--ink-black)] dark:bg-white transition-transform ${mobileMenuOpen ? "-translate-y-[4px] -rotate-45" : ""}`} />
            </button>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden border-t-2 border-[var(--ink-black)] dark:border-white bg-[var(--paper-cream)]">
            <div className="px-6 py-4 flex flex-col gap-2">
              <Link to="/docs" onClick={() => setMobileMenuOpen(false)} className="px-4 py-3 text-sm font-bold uppercase tracking-wider hover:bg-[var(--poster-gold)] transition-colors">
                Docs
              </Link>
              <Link to="/examples" onClick={() => setMobileMenuOpen(false)} className="px-4 py-3 text-sm font-bold uppercase tracking-wider hover:bg-[var(--poster-gold)] transition-colors">
                Examples
              </Link>
              <Link to="/pricing" onClick={() => setMobileMenuOpen(false)} className="px-4 py-3 text-sm font-bold uppercase tracking-wider hover:bg-[var(--poster-gold)] transition-colors">
                Pricing
              </Link>
              {!isLoggedIn && (
                <>
                  <div className="border-t-2 border-[var(--ink-black)]/10 dark:border-white/10 mt-2 pt-2" />
                  <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="px-4 py-3 text-sm font-bold uppercase tracking-wider hover:bg-[var(--poster-gold)] transition-colors">
                    Sign in
                  </Link>
                  <Link
                    to="/welcome"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-4 py-3 bg-[var(--poster-red)] text-white text-sm font-bold uppercase tracking-wider text-center hover:bg-[var(--poster-blue)] transition-colors"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section - PLAY BUTTON as the bold choice (we make video) */}
      <section className="relative pt-32 pb-24 bg-[var(--paper-cream)] texture-paper overflow-hidden">
        {/* Giant play button triangle - THE motivated shape (we make video play) */}
        <div className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/3 w-[700px] h-[700px] opacity-[0.07] dark:opacity-[0.05]">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <polygon points="20,10 20,90 85,50" fill="var(--poster-red)" />
          </svg>
        </div>

        <div className="relative max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left - Typography */}
            <FadeInSection>
              <SocialProofBar />

              <h1 className="text-6xl md:text-7xl lg:text-8xl font-black leading-[0.9] tracking-tighter mb-6">
                <span className="block">Build</span>
                <span className="block">video</span>
                <span className="block text-[var(--poster-red)]">with code</span>
              </h1>
              
              {/* Play button echo as divider - reinforces the concept */}
              <div className="flex items-center gap-4 mb-8">
                <div className="w-0 h-0 border-l-[16px] border-l-[var(--poster-red)] border-y-[10px] border-y-transparent" />
                <div className="w-0 h-0 border-l-[12px] border-l-[var(--poster-gold)] border-y-[7px] border-y-transparent" />
                <div className="w-0 h-0 border-l-[8px] border-l-[var(--poster-blue)] border-y-[5px] border-y-transparent" />
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
            </FadeInSection>

            {/* Right - Demo framed like a screen/monitor */}
            <div className="relative">
              {/* Stacked frames like film/video layers */}
              <div className="absolute -top-4 -right-4 w-full h-full bg-[var(--poster-blue)]" />
              <div className="absolute -top-2 -right-2 w-full h-full bg-[var(--poster-gold)]" />
              <div className="relative bg-[var(--card-bg)] border-4 border-[var(--ink-black)] dark:border-white overflow-hidden">
                <HeroDemo />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI Skills Section - STACKING BLOCKS (lego-brick composable skills) - THE CORE PITCH */}
      <section className="relative py-24 bg-[var(--poster-green)] text-white overflow-hidden">
        {/* Stacked blocks pattern - composable, modular, building */}
        <div className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/4 w-[500px] h-[500px] opacity-[0.08]">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <rect x="10" y="70" width="80" height="15" fill="white" />
            <rect x="20" y="55" width="60" height="15" fill="white" />
            <rect x="15" y="40" width="50" height="15" fill="white" />
            <rect x="25" y="25" width="40" height="15" fill="white" />
            <rect x="30" y="10" width="30" height="15" fill="white" />
          </svg>
        </div>

        <div className="relative max-w-7xl mx-auto px-6">
          {/* Header */}
          <div className="text-center mb-16">
            <h2 className="text-5xl md:text-7xl font-black tracking-tighter uppercase mb-4">
              Prompt it
            </h2>
            <div className="flex justify-center items-center gap-2 mb-6">
              <div className="w-16 h-2 bg-white" />
              <div className="w-12 h-2 bg-white/70" />
              <div className="w-8 h-2 bg-white/40" />
            </div>
            <p className="text-xl text-white/80 max-w-2xl mx-auto">
              Agent skills turn natural language into production-ready video tools.
              Describe what you want. Get working code.
            </p>
          </div>

          {/* Single Prompt Example - Cleaner, Focused */}
          <FadeInSection className="max-w-3xl mx-auto">
            <div className="relative">
              <div className="absolute -bottom-4 -right-4 w-full h-full bg-[var(--poster-gold)]" />
              <div className="relative bg-[var(--card-dark-bg)] border-4 border-white overflow-hidden">
                {/* Terminal Header */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-white/20">
                  <div className="w-3 h-3 rounded-full bg-[var(--poster-red)]" />
                  <div className="w-3 h-3 rounded-full bg-[var(--poster-gold)]" />
                  <div className="w-3 h-3 rounded-full bg-[var(--poster-green)]" />
                  <span className="ml-3 text-white/40 text-xs font-mono uppercase tracking-wider">prompt</span>
                </div>
                
                {/* Prompt Content */}
                <div className="p-6 font-mono text-sm">
                  <div className="text-[var(--poster-gold)] mb-4">@editor-gui</div>
                  <div className="text-white text-lg leading-relaxed">
                    Build a video trim tool with preview, playback controls, 
                    and draggable in/out markers.
                  </div>
                </div>

                {/* Output Preview */}
                <div className="border-t border-white/20 bg-white/5 p-6">
                  <div className="flex items-center gap-2 text-xs text-white/50 uppercase tracking-wider mb-4">
                    <svg className="w-4 h-4 text-[var(--poster-green)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Generated
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    {['Preview', 'Scrubber', 'TogglePlay', 'TrimHandles'].map((comp) => (
                      <div key={comp} className="bg-white/10 px-3 py-2 text-center font-mono text-white/70">
                        {`<${comp} />`}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </FadeInSection>

          {/* CTA */}
          <div className="text-center mt-12">
            <Link
              to="/docs/skills"
              className="inline-flex items-center px-8 py-4 bg-white text-[var(--poster-green)] font-bold text-sm uppercase tracking-wider hover:bg-[var(--poster-gold)] hover:text-[var(--ink-black)] transition-colors shadow-poster-hard"
            >
              Explore skills
              <svg className="ml-3 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* Tools Built From Prompts - LIVE EXAMPLES */}
      <section className="relative py-24 bg-[var(--paper-cream)] border-t-4 border-[var(--ink-black)] dark:border-white overflow-hidden">
        {/* Grid pattern - modular, component-based */}
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.02]">
          <svg width="100%" height="100%">
            <defs>
              <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M 60 0 L 0 0 0 60" fill="none" stroke="var(--poster-green)" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        <div className="relative max-w-7xl mx-auto px-6">
          {/* Header */}
          <div className="mb-16">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-[var(--poster-green)] flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h2 className="text-4xl md:text-5xl font-black tracking-tighter uppercase">
                Built from prompts
              </h2>
            </div>
            <p className="text-lg text-[var(--warm-gray)] max-w-xl">
              Real tools generated with agent skills. Interactive, production-ready.
            </p>
          </div>

          {/* Tools Grid - 2x2 */}
          <FadeInSection className="grid md:grid-cols-2 gap-8">
            {/* Trim Tool */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-1 bg-[var(--poster-blue)]" />
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--warm-gray)]">
                  Video Trimmer
                </span>
              </div>
              <TrimTool />
            </div>

            {/* Text Overlay */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-1 bg-[var(--poster-gold)]" />
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--warm-gray)]">
                  Text Overlay
                </span>
              </div>
              <TextOverlayTool />
            </div>

            {/* Thumbnail Picker */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-1 bg-[var(--poster-red)]" />
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--warm-gray)]">
                  Thumbnail Picker
                </span>
              </div>
              <ThumbnailPicker />
            </div>

            {/* Caption Editor */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-1 bg-[var(--poster-green)]" />
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--warm-gray)]">
                  Caption Editor
                </span>
              </div>
              <CaptionEditor />
            </div>
          </FadeInSection>

          {/* Footer note */}
          <div className="mt-12 pt-8 border-t-2 border-[var(--ink-black)]/10 dark:border-white/10">
            <p className="text-sm text-[var(--warm-gray)] flex items-center gap-2">
              <svg className="w-4 h-4 text-[var(--poster-green)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Each tool above was generated from a single prompt using Editframe agent skills.
            </p>
          </div>
        </div>
      </section>

      {/* Before/After Section - TRANSFORMATION ARROW as the bold choice */}
      <section className="relative py-24 border-t-4 border-[var(--ink-black)] dark:border-white overflow-hidden">
        {/* Giant arrow pointing right - transformation, progress, the change */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] opacity-[0.04] dark:opacity-[0.03] pointer-events-none">
          <svg viewBox="0 0 200 100" className="w-full h-full">
            <polygon points="0,25 140,25 140,0 200,50 140,100 140,75 0,75" fill="var(--poster-green)" />
          </svg>
        </div>

        <FadeInSection className="relative max-w-7xl mx-auto px-6">
          <div className="flex items-center gap-6 mb-16">
            <h2 className="text-5xl md:text-6xl font-black tracking-tighter uppercase">
              Before
            </h2>
            {/* Arrow between words - the transformation */}
            <div className="hidden md:block w-0 h-0 border-l-[24px] border-l-[var(--poster-green)] border-y-[14px] border-y-transparent" />
            <h2 className="text-5xl md:text-6xl font-black tracking-tighter uppercase text-[var(--poster-green)]">
              After
            </h2>
          </div>
          
          <BeforeAfterComparison />
        </FadeInSection>
      </section>

      {/* Interactive Playground Section - REFRESH/LOOP showing instant feedback cycle */}
      <section className="relative py-24 bg-[var(--poster-blue)] text-white overflow-hidden">
        {/* Circular arrows / refresh cycle - edit→preview→edit→preview */}
        <div className="absolute top-1/2 right-0 w-[500px] h-[500px] -translate-y-1/2 translate-x-1/4 opacity-[0.08]">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            {/* Circular arrow suggesting continuous loop */}
            <path 
              d="M50,15 A35,35 0 1,1 15,50" 
              fill="none" 
              stroke="white" 
              strokeWidth="8"
              strokeLinecap="round"
            />
            {/* Arrow head */}
            <polygon points="15,35 15,55 5,50" fill="white" />
            {/* Second partial arc */}
            <path 
              d="M50,85 A35,35 0 0,1 85,50" 
              fill="none" 
              stroke="white" 
              strokeWidth="8"
              strokeLinecap="round"
            />
            {/* Second arrow head */}
            <polygon points="85,45 85,65 95,50" fill="white" />
          </svg>
        </div>

        <FadeInSection className="relative max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-5xl md:text-6xl font-black tracking-tighter uppercase mb-6">
              Edit code,<br />see video
            </h2>
            {/* Small loop icon echoing the concept */}
            <div className="flex justify-center gap-2 mb-6">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M1 4v6h6M23 20v-6h-6" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="text-white/60 text-sm uppercase tracking-wider font-bold">Instant feedback loop</span>
            </div>
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
        </FadeInSection>
      </section>

      {/* Client-Side Rendering Section - DOWNLOAD ARROW (export without upload) */}
      <section className="relative py-24 bg-[var(--poster-red)] text-white overflow-hidden">
        {/* Download arrow pattern - export/download, no upload needed */}
        <div className="absolute top-1/2 left-0 -translate-y-1/2 -translate-x-1/4 w-[500px] h-[500px] opacity-[0.08]">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <path d="M50,10 L50,70 M30,50 L50,70 L70,50" fill="none" stroke="white" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
            <rect x="20" y="80" width="60" height="8" fill="white" rx="2" />
          </svg>
        </div>

        <FadeInSection className="relative max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left - Content */}
            <div>
              <h2 className="text-5xl md:text-6xl font-black tracking-tighter uppercase mb-6">
                Render in<br />the browser
              </h2>
              
              {/* Feature highlights */}
              <div className="flex items-center gap-4 mb-8">
                <div className="w-8 h-1 bg-white" />
                <div className="w-6 h-1 bg-white/70" />
                <div className="w-4 h-1 bg-white/40" />
              </div>
              
              <p className="text-xl text-white/80 mb-8 leading-relaxed">
                Export video directly in the browser. No upload. No server queue. 
                Full quality MP4 rendered on the client using WebCodecs.
              </p>
              
              {/* Benefits */}
              <div className="space-y-4 mb-10">
                {[
                  { icon: '⚡', title: 'Instant', desc: 'No upload wait. Start rendering immediately.' },
                  { icon: '🔒', title: 'Private', desc: 'Video never leaves the browser. Complete privacy.' },
                  { icon: '💰', title: 'Free', desc: 'No server costs for rendering. Scale infinitely.' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-white text-black flex items-center justify-center font-bold shrink-0">
                      {item.icon}
                    </div>
                    <div>
                      <h3 className="font-bold uppercase tracking-wider text-sm">{item.title}</h3>
                      <p className="text-sm text-white/70">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[var(--poster-green)]" />
                  <span className="text-white/70">H.264, H.265, VP9, AV1</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[var(--poster-green)]" />
                  <span className="text-white/70">Up to 4K</span>
                </div>
              </div>
            </div>
            
            {/* Right - Demo */}
            <div className="relative">
              <ClientRenderDemo />
            </div>
          </div>
        </FadeInSection>
      </section>

      {/* Architecture Section - PARALLEL LINES for parallel processing */}
      <section className="relative py-24 bg-[var(--paper-cream)] border-t-4 border-[var(--ink-black)] dark:border-white overflow-hidden">
        {/* Parallel horizontal lines - representing parallel rendering/processing */}
        <div className="absolute top-0 left-0 w-full h-full opacity-[0.04] dark:opacity-[0.03] pointer-events-none">
          <svg className="w-full h-full" preserveAspectRatio="none">
            {Array.from({ length: 12 }).map((_, i) => (
              <rect 
                key={i} 
                x="0" 
                y={`${i * 8.33}%`} 
                width="100%" 
                height="2%" 
                fill="var(--poster-gold)" 
              />
            ))}
          </svg>
        </div>

        <FadeInSection className="relative max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-3 gap-16">
            <div>
              <h2 className="text-4xl md:text-5xl font-black tracking-tighter uppercase mb-4">
                Parallel
              </h2>
              {/* Small parallel lines echoing the concept */}
              <div className="flex flex-col gap-1 mb-4">
                <div className="w-32 h-1 bg-[var(--poster-gold)]" />
                <div className="w-32 h-1 bg-[var(--poster-gold)]" />
                <div className="w-32 h-1 bg-[var(--poster-gold)]" />
              </div>
              <h2 className="text-4xl md:text-5xl font-black tracking-tighter uppercase text-[var(--poster-gold)] mb-6">
                Processing
              </h2>
              <p className="text-lg text-[var(--warm-gray)] leading-relaxed mb-8">
                Dual pipeline: instant preview for development, parallel rendering for production.
              </p>
              <PerformanceMetrics />
            </div>
            
            <div className="lg:col-span-2">
              <div className="relative">
                <div className="absolute -bottom-4 -right-4 w-full h-full bg-[var(--poster-gold)]" />
                <div className="relative bg-[var(--card-bg)] border-4 border-[var(--ink-black)] dark:border-white p-6">
                  <ArchitectureDiagram />
                </div>
              </div>
            </div>
          </div>
        </FadeInSection>
      </section>

      {/* Templated Rendering Section - MULTIPLY SYMBOL (one template, many outputs) */}
      <section className="relative py-24 bg-[var(--poster-gold)] overflow-hidden">
        {/* Multiplication/repeat pattern - one to many */}
        <div className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/4 w-[500px] h-[500px] opacity-[0.08]">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            {/* One square becoming many */}
            <rect x="10" y="40" width="20" height="20" fill="black" />
            <path d="M40,50 L55,50" stroke="black" strokeWidth="4" />
            <polygon points="55,45 65,50 55,55" fill="black" />
            <rect x="70" y="20" width="15" height="15" fill="black" />
            <rect x="70" y="42" width="15" height="15" fill="black" />
            <rect x="70" y="65" width="15" height="15" fill="black" />
          </svg>
        </div>

        <FadeInSection className="relative max-w-7xl mx-auto px-6">
          {/* Header */}
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-black flex items-center justify-center">
                <span className="text-[var(--poster-gold)] text-2xl font-black">×</span>
              </div>
              <span className="text-sm font-bold uppercase tracking-widest text-black/60">
                Data-Driven
              </span>
            </div>
            
            <h2 className="text-5xl md:text-6xl font-black tracking-tighter uppercase text-black mb-6">
              One template,<br />infinite videos
            </h2>
            
            <p className="text-xl text-black/70 max-w-2xl leading-relaxed">
              Define your video once. Pass different data via CLI or API. 
              Render thousands of personalized videos automatically.
            </p>
          </div>
          
          {/* Use Cases */}
          <div className="grid sm:grid-cols-4 gap-4 mb-12">
            {[
              { icon: '👋', label: 'Welcome videos' },
              { icon: '📊', label: 'Reports & analytics' },
              { icon: '🎯', label: 'Personalized ads' },
              { icon: '📧', label: 'Email campaigns' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 bg-black/10 px-4 py-3">
                <span className="text-xl">{item.icon}</span>
                <span className="text-sm font-bold uppercase tracking-wider text-black">{item.label}</span>
              </div>
            ))}
          </div>
          
          {/* Demo */}
          <TemplatedRenderingDemo />
          
          {/* CTA */}
          <div className="mt-12 text-center">
            <Link
              to="/docs/cli"
              className="inline-flex items-center px-8 py-4 bg-black text-[var(--poster-gold)] font-bold text-sm uppercase tracking-wider hover:bg-[var(--ink-black)] transition-colors shadow-poster-hard"
            >
              CLI documentation
              <svg className="ml-3 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
        </FadeInSection>
      </section>

      {/* Code Examples Section - CURLY BRACES as the bold choice (it's code) */}
      <section className="relative py-24 bg-[var(--card-dark-bg)] text-white overflow-hidden">
        {/* Giant curly braces - THE code symbol */}
        <div className="absolute top-1/2 left-0 -translate-y-1/2 -translate-x-1/4 text-[400px] font-black text-white/[0.03] leading-none select-none pointer-events-none">
          {'{'}
        </div>
        <div className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/4 text-[400px] font-black text-white/[0.03] leading-none select-none pointer-events-none">
          {'}'}
        </div>

        <FadeInSection className="relative max-w-7xl mx-auto px-6">
          <div className="flex items-start gap-6 mb-16">
            {/* Opening brace as accent */}
            <div className="hidden md:block text-8xl font-black text-[var(--poster-gold)] leading-none -mt-4">
              {'{'}
            </div>
            <div>
              <h2 className="text-5xl md:text-6xl font-black tracking-tighter uppercase mb-4">
                Just<br />Code
              </h2>
              <p className="text-xl text-white/70 max-w-xl">
                If you know React, you know Editframe. Familiar patterns, predictable behavior.
              </p>
            </div>
          </div>
          
          <CodeExamples />
        </FadeInSection>
      </section>

      {/* Video Showcase Section - FILM STRIP PERFORATIONS (it's a video gallery) */}
      <section className="relative py-24 bg-[var(--paper-cream)] border-t-4 border-[var(--ink-black)] dark:border-white overflow-hidden">
        {/* Film strip perforations running down the side - this IS video */}
        <div className="absolute top-0 left-8 bottom-0 w-6 opacity-[0.08] dark:opacity-[0.05]">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="w-6 h-8 bg-[var(--poster-pink)] mb-4 rounded-sm" />
          ))}
        </div>

        <div className="relative max-w-7xl mx-auto px-6">
          <div className="flex items-end justify-between mb-16">
            <div>
              {/* Film frame icon */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex gap-1">
                  <div className="w-2 h-3 bg-[var(--poster-pink)]" />
                  <div className="w-2 h-3 bg-[var(--poster-pink)]" />
                  <div className="w-2 h-3 bg-[var(--poster-pink)]" />
                </div>
                <span className="text-sm font-bold uppercase tracking-wider text-[var(--poster-pink)]">Gallery</span>
              </div>
              <h2 className="text-5xl md:text-6xl font-black tracking-tighter uppercase">
                Built with<br />Editframe
              </h2>
            </div>
            <Link 
              to="/examples" 
              className="hidden md:flex items-center px-6 py-3 bg-[var(--ink-black)] dark:bg-white text-white dark:text-black font-bold text-sm uppercase tracking-wider hover:bg-[var(--poster-pink)] transition-colors"
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

      {/* Comparison Section - EQUALS/BALANCE showing fair comparison */}
      <section className="relative py-24 bg-[var(--card-bg)] border-t-4 border-[var(--ink-black)] dark:border-white overflow-hidden">
        {/* Stacked equals signs - comparing, measuring, weighing */}
        <div className="absolute top-1/2 right-12 -translate-y-1/2 opacity-[0.05] dark:opacity-[0.03]">
          <div className="flex flex-col gap-6">
            <div className="w-32 h-4 bg-[var(--poster-blue)]" />
            <div className="w-32 h-4 bg-[var(--poster-blue)]" />
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-5xl md:text-6xl font-black tracking-tighter uppercase mb-6">
              How we compare
            </h2>
            {/* Equals sign as visual metaphor */}
            <div className="flex justify-center items-center gap-4 mb-6">
              <div className="flex flex-col gap-2">
                <div className="w-12 h-2 bg-[var(--poster-blue)]" />
                <div className="w-12 h-2 bg-[var(--poster-blue)]" />
              </div>
              <span className="text-sm font-bold uppercase tracking-wider text-[var(--warm-gray)]">Fair comparison</span>
            </div>
            <p className="text-lg text-[var(--warm-gray)]">
              An honest comparison to help you decide.
            </p>
          </div>
          
          <ComparisonTable />
        </div>
      </section>

      {/* Social Proof Section - QUOTATION MARKS (these are quotes/testimonials) */}
      <section className="relative py-24 bg-[var(--paper-cream)] border-t-4 border-[var(--ink-black)] dark:border-white overflow-hidden">
        {/* Giant quotation mark - these are quotes, people talking */}
        <div className="absolute top-8 left-8 text-[300px] font-black text-[var(--poster-gold)] opacity-[0.08] dark:opacity-[0.05] leading-none select-none pointer-events-none">
          "
        </div>
        
        <div className="relative max-w-7xl mx-auto px-6">
          <CustomerLogos />
          <div className="mt-20">
            <Testimonials />
          </div>
        </div>
      </section>

      {/* Getting Started Section - CLOCK/TIME showing speed (2 minutes) */}
      <section className="relative py-24 bg-[var(--card-bg)] border-t-4 border-[var(--ink-black)] dark:border-white overflow-hidden">
        {/* Clock shape - it's about TIME, speed */}
        <div className="absolute top-1/2 left-0 -translate-y-1/2 -translate-x-1/3 w-[400px] h-[400px] opacity-[0.05] dark:opacity-[0.03]">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <circle cx="50" cy="50" r="45" fill="none" stroke="var(--poster-red)" strokeWidth="4" />
            {/* Clock hands pointing to 2 (minutes) */}
            <line x1="50" y1="50" x2="50" y2="15" stroke="var(--poster-red)" strokeWidth="4" strokeLinecap="round" />
            <line x1="50" y1="50" x2="70" y2="35" stroke="var(--poster-red)" strokeWidth="3" strokeLinecap="round" />
            <circle cx="50" cy="50" r="4" fill="var(--poster-red)" />
          </svg>
        </div>

        <FadeInSection className="relative max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-5xl md:text-6xl font-black tracking-tighter uppercase mb-2">
                Zero to video
              </h2>
              {/* Bold "2" as design element - THE time claim */}
              <div className="flex items-baseline gap-4 mb-8">
                <span className="text-[120px] font-black text-[var(--poster-red)] leading-none">2</span>
                <span className="text-4xl font-black tracking-tighter uppercase text-[var(--poster-red)]">min</span>
              </div>
              
              <p className="text-lg text-[var(--warm-gray)] mb-10">
                One command to scaffold. One command to develop. Hot reload that works.
              </p>
              
              <div className="space-y-0 mb-10">
                {[
                  { num: '1', title: 'Create project', desc: 'CLI scaffolds TypeScript, ESLint, and your chosen template.' },
                  { num: '2', title: 'Start developing', desc: 'Dev server with instant preview. Edit code, see video update.' },
                  { num: '3', title: 'Render & deploy', desc: 'Render locally or push to cloud. Scale to ten thousand.' },
                ].map((step, i) => (
                  <div key={i} className="flex gap-4 py-4 border-b-2 border-[var(--ink-black)]/10 dark:border-white/10 last:border-b-0">
                    <div className="flex-shrink-0 w-10 h-10 bg-[var(--poster-red)] flex items-center justify-center text-white font-black">
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
        </FadeInSection>
      </section>

      {/* Final CTA Section - ARROW/LAUNCH pointing right (start, go, begin) */}
      <section className="relative py-32 bg-[var(--poster-red)] text-white overflow-hidden">
        {/* Giant arrow pointing right - GO, START, LAUNCH */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[500px] opacity-[0.08]">
          <svg viewBox="0 0 200 100" className="w-full h-full">
            <polygon points="0,30 150,30 150,10 200,50 150,90 150,70 0,70" fill="white" />
          </svg>
        </div>
        
        {/* Solid color block accent */}
        <div className="absolute top-0 right-0 w-24 h-full bg-[var(--poster-gold)]" />
        
        <div className="relative max-w-7xl mx-auto px-6 text-center">
          <h2 className="text-6xl md:text-8xl font-black tracking-tighter uppercase mb-4">
            Ready?
          </h2>
          {/* Arrow pointing to action - GO! */}
          <div className="flex justify-center mb-8">
            <div className="w-0 h-0 border-l-[40px] border-l-white border-y-[24px] border-y-transparent" />
          </div>
          
          <p className="text-xl text-white/90 mb-10 max-w-lg mx-auto">
            Start free with generous limits. No credit card. Upgrade when you scale.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/welcome"
              className="inline-flex items-center justify-center px-10 py-4 bg-white text-[var(--ink-black)] font-bold uppercase tracking-wider shadow-poster-hard hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none transition-all"
            >
              Start building
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
      <footer className="py-16 bg-[var(--card-dark-bg)] text-white border-t-4 border-[var(--poster-gold)]">
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
