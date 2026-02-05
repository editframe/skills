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
          /* Richer, more sophisticated palette */
          --accent-red: #C41E3A;
          --accent-blue: #1E3A8A;
          --accent-gold: #B8860B;
          --accent-cream: #F5F5DC;
          --ink-black: #1a1a1a;
          --paper-white: #FAFAFA;
          --warm-gray: #78716C;
        }
        
        .dark {
          --accent-red: #DC2626;
          --accent-blue: #3B82F6;
          --accent-gold: #F59E0B;
          --paper-white: #0a0a0a;
          --ink-black: #e5e5e5;
        }
        
        body {
          font-family: 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif;
        }
        
        .font-mono {
          font-family: 'JetBrains Mono', monospace;
        }
        
        /* Paper texture - subtle */
        .texture-paper {
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.02'/%3E%3C/svg%3E");
        }
        
        /* Ink effect for text - subtle blur */
        .text-ink {
          text-shadow: 0 0 0.3px currentColor;
        }
        
        /* Print-style shadows - soft, like ink bleeding */
        .shadow-print {
          box-shadow: 
            0 1px 2px rgba(0,0,0,0.04),
            0 4px 8px rgba(0,0,0,0.04),
            0 8px 16px rgba(0,0,0,0.02);
        }
        .shadow-print-lg {
          box-shadow: 
            0 2px 4px rgba(0,0,0,0.03),
            0 8px 16px rgba(0,0,0,0.05),
            0 16px 32px rgba(0,0,0,0.03);
        }
        
        /* Subtle gradient for depth */
        .gradient-subtle {
          background: linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.02) 100%);
        }
        
        /* Accent backgrounds with print texture */
        .bg-accent-red {
          background: linear-gradient(135deg, var(--accent-red) 0%, color-mix(in srgb, var(--accent-red), black 15%) 100%);
        }
        .bg-accent-blue {
          background: linear-gradient(135deg, var(--accent-blue) 0%, color-mix(in srgb, var(--accent-blue), black 10%) 100%);
        }
        
        /* Border that looks like printed rule lines */
        .border-rule {
          border-color: rgba(0,0,0,0.12);
        }
        .dark .border-rule {
          border-color: rgba(255,255,255,0.12);
        }

        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}} />

      {/* Navigation - Clean, sophisticated */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 dark:bg-[#0a0a0a]/95 backdrop-blur-sm border-b border-rule">
        <div className="max-w-7xl mx-auto flex items-center justify-between h-16 px-6">
          <Link to="/" className="flex items-center">
            <span className="text-xl font-extrabold tracking-tight">editframe</span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <Link to="/docs" className="text-sm font-medium text-[var(--warm-gray)] hover:text-[var(--ink-black)] dark:hover:text-white transition-colors">
              Docs
            </Link>
            <Link to="/examples" className="text-sm font-medium text-[var(--warm-gray)] hover:text-[var(--ink-black)] dark:hover:text-white transition-colors">
              Examples
            </Link>
            <Link to="/pricing" className="text-sm font-medium text-[var(--warm-gray)] hover:text-[var(--ink-black)] dark:hover:text-white transition-colors">
              Pricing
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            {isLoggedIn ? (
              <Link
                to="/dashboard"
                className="px-5 py-2 bg-[var(--ink-black)] dark:bg-white text-white dark:text-black text-sm font-semibold rounded hover:opacity-90 transition-opacity"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link to="/login" className="text-sm font-medium text-[var(--warm-gray)] hover:text-[var(--ink-black)] dark:hover:text-white transition-colors">
                  Sign in
                </Link>
                <Link
                  to="/welcome"
                  className="px-5 py-2 bg-accent-red text-white text-sm font-semibold rounded hover:opacity-90 transition-opacity"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section - Generous space, dramatic typography */}
      <section className="relative pt-32 pb-24 texture-paper">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left - Typography focused */}
            <div>
              <SocialProofBar />

              <h1 className="text-5xl md:text-6xl lg:text-7xl font-black leading-[0.95] tracking-tight mb-8 text-ink">
                Build video<br />
                <span className="text-[var(--accent-red)]">with code</span>
              </h1>
              
              {/* Accent line - subtle, not overwhelming */}
              <div className="w-16 h-1 bg-[var(--accent-gold)] mb-8" />
              
              <p className="text-xl text-[var(--warm-gray)] mb-10 max-w-md leading-relaxed">
                React components that render to video. Instant preview. Parallel rendering at scale.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  to="/welcome"
                  className="inline-flex items-center justify-center px-8 py-4 bg-[var(--ink-black)] dark:bg-white text-white dark:text-black font-semibold text-sm rounded shadow-print hover:shadow-print-lg transition-shadow"
                >
                  Start building
                  <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
                <Link
                  to="/docs"
                  className="inline-flex items-center justify-center px-8 py-4 border border-rule font-semibold text-sm rounded hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                  Documentation
                </Link>
              </div>
            </div>

            {/* Right - Demo */}
            <div className="relative">
              {/* Subtle geometric accent - not overwhelming */}
              <div className="absolute -top-8 -right-8 w-32 h-32 bg-[var(--accent-gold)] opacity-10 rounded-sm" />
              <div className="relative shadow-print-lg rounded overflow-hidden">
                <HeroDemo />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Before/After Section - Clean comparison */}
      <section className="py-24 border-t border-rule">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-2xl mb-16">
            <p className="text-sm font-semibold text-[var(--accent-red)] uppercase tracking-wider mb-4">
              The difference
            </p>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
              Before & after
            </h2>
            <p className="text-lg text-[var(--warm-gray)] leading-relaxed">
              FFmpeg scripts and frame counting vs. React components and instant preview.
            </p>
          </div>
          
          <BeforeAfterComparison />
        </div>
      </section>

      {/* Interactive Playground Section */}
      <section className="py-24 bg-white dark:bg-[#111] border-t border-rule">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-sm font-semibold text-[var(--accent-blue)] uppercase tracking-wider mb-4">
              Try it now
            </p>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
              Edit code, see video
            </h2>
            <p className="text-lg text-[var(--warm-gray)] leading-relaxed">
              Experience instant preview. No account required.
            </p>
          </div>
          
          <div className="shadow-print-lg rounded overflow-hidden">
            <InteractivePlayground />
          </div>
        </div>
      </section>

      {/* Architecture Section - Technical credibility */}
      <section className="py-24 border-t border-rule">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-3 gap-16">
            <div>
              <p className="text-sm font-semibold text-[var(--accent-gold)] uppercase tracking-wider mb-4">
                Infrastructure
              </p>
              <h2 className="text-4xl font-bold tracking-tight mb-6">
                Production-grade
              </h2>
              <p className="text-lg text-[var(--warm-gray)] leading-relaxed mb-8">
                Dual pipeline architecture: instant preview for development, parallel rendering for production.
              </p>
              <PerformanceMetrics />
            </div>
            
            <div className="lg:col-span-2">
              <ArchitectureDiagram />
            </div>
          </div>
        </div>
      </section>

      {/* Code Examples Section */}
      <section className="py-24 bg-[var(--ink-black)] dark:bg-[#111] text-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-2xl mb-16">
            <p className="text-sm font-semibold text-[var(--accent-gold)] uppercase tracking-wider mb-4">
              Developer experience
            </p>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
              Code examples
            </h2>
            <p className="text-lg text-white/70 leading-relaxed">
              If you know React, you know Editframe. Familiar patterns, predictable behavior, excellent TypeScript support.
            </p>
          </div>
          
          <CodeExamples />
        </div>
      </section>

      {/* Video Showcase Section */}
      <section className="py-24 border-t border-rule">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-end justify-between mb-16">
            <div>
              <p className="text-sm font-semibold text-[var(--accent-red)] uppercase tracking-wider mb-4">
                Gallery
              </p>
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
                Built with Editframe
              </h2>
            </div>
            <Link 
              to="/examples" 
              className="hidden md:flex items-center text-sm font-semibold text-[var(--warm-gray)] hover:text-[var(--ink-black)] dark:hover:text-white"
            >
              View all examples
              <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
          
          <VideoShowcase />
        </div>
      </section>

      {/* Comparison Section */}
      <section className="py-24 bg-white dark:bg-[#111] border-t border-rule">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-sm font-semibold text-[var(--accent-blue)] uppercase tracking-wider mb-4">
              Comparison
            </p>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
              How we compare
            </h2>
            <p className="text-lg text-[var(--warm-gray)] leading-relaxed">
              An honest comparison to help you decide.
            </p>
          </div>
          
          <ComparisonTable />
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="py-24 border-t border-rule">
        <div className="max-w-7xl mx-auto px-6">
          <CustomerLogos />
          <div className="mt-20">
            <Testimonials />
          </div>
        </div>
      </section>

      {/* Getting Started Section */}
      <section className="py-24 bg-white dark:bg-[#111] border-t border-rule">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-sm font-semibold text-[var(--accent-gold)] uppercase tracking-wider mb-4">
                Quickstart
              </p>
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
                Zero to video in<br />
                <span className="text-[var(--accent-red)]">2 minutes</span>
              </h2>
              
              <p className="text-lg text-[var(--warm-gray)] mb-10 leading-relaxed">
                One command to scaffold. One command to develop. Hot reload that works.
              </p>
              
              <div className="space-y-6 mb-10">
                {[
                  { num: '01', title: 'Create project', desc: 'CLI scaffolds TypeScript, ESLint, and your chosen template.' },
                  { num: '02', title: 'Start developing', desc: 'Dev server with instant preview. Edit code, see video update.' },
                  { num: '03', title: 'Render & deploy', desc: 'Render locally or push to cloud. Scale to ten thousand.' },
                ].map((step, i) => (
                  <div key={i} className="flex gap-6">
                    <div className="flex-shrink-0 text-3xl font-black text-[var(--accent-gold)] opacity-50">
                      {step.num}
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">{step.title}</h3>
                      <p className="text-sm text-[var(--warm-gray)]">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <Link
                to="/docs/quickstart"
                className="inline-flex items-center text-sm font-semibold hover:text-[var(--accent-red)] transition-colors"
              >
                Read quickstart guide
                <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>

            <div className="shadow-print-lg rounded overflow-hidden">
              <TerminalDemo />
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section - Single accent, not overwhelming */}
      <section className="relative py-32 bg-accent-blue text-white overflow-hidden">
        {/* Subtle geometric accent */}
        <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-white/5 to-transparent" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-[var(--accent-gold)] opacity-10 rounded-full -translate-x-1/2 translate-y-1/2" />
        
        <div className="relative max-w-7xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Ready to build?
          </h2>
          
          <p className="text-xl text-white/80 mb-10 max-w-lg mx-auto">
            Start free with generous limits. No credit card. Upgrade when you scale.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/welcome"
              className="inline-flex items-center justify-center px-10 py-4 bg-white text-[var(--accent-blue)] font-semibold rounded shadow-print hover:shadow-print-lg transition-shadow"
            >
              Start building free
              <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
            <Link
              to="/docs"
              className="inline-flex items-center justify-center px-10 py-4 border border-white/30 text-white font-semibold rounded hover:bg-white/10 transition-colors"
            >
              Read docs
            </Link>
          </div>

          <p className="mt-10 text-sm text-white/60">
            Need enterprise features?{' '}
            <Link to="/contact" className="underline hover:text-white">
              Talk to sales
            </Link>
          </p>
        </div>
      </section>

      {/* Footer - Clean, minimal */}
      <footer className="py-16 border-t border-rule">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-5 gap-12 mb-12">
            {/* Logo column */}
            <div className="md:col-span-2">
              <Link to="/" className="text-xl font-extrabold tracking-tight">editframe</Link>
              <p className="mt-4 text-sm text-[var(--warm-gray)] max-w-xs leading-relaxed">
                Build video with code. React components, instant preview, hyperscale rendering.
              </p>
            </div>
            
            {/* Links */}
            <div>
              <h3 className="font-semibold text-sm mb-4">Product</h3>
              <ul className="space-y-3">
                <li><Link to="/docs" className="text-sm text-[var(--warm-gray)] hover:text-[var(--ink-black)] dark:hover:text-white transition-colors">Documentation</Link></li>
                <li><Link to="/examples" className="text-sm text-[var(--warm-gray)] hover:text-[var(--ink-black)] dark:hover:text-white transition-colors">Examples</Link></li>
                <li><Link to="/pricing" className="text-sm text-[var(--warm-gray)] hover:text-[var(--ink-black)] dark:hover:text-white transition-colors">Pricing</Link></li>
                <li><Link to="/changelog" className="text-sm text-[var(--warm-gray)] hover:text-[var(--ink-black)] dark:hover:text-white transition-colors">Changelog</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-sm mb-4">Resources</h3>
              <ul className="space-y-3">
                <li><a href="https://discord.gg/editframe" target="_blank" rel="noopener noreferrer" className="text-sm text-[var(--warm-gray)] hover:text-[var(--ink-black)] dark:hover:text-white transition-colors">Discord</a></li>
                <li><Link to="/blog" className="text-sm text-[var(--warm-gray)] hover:text-[var(--ink-black)] dark:hover:text-white transition-colors">Blog</Link></li>
                <li><Link to="/contact" className="text-sm text-[var(--warm-gray)] hover:text-[var(--ink-black)] dark:hover:text-white transition-colors">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-sm mb-4">Legal</h3>
              <ul className="space-y-3">
                <li><Link to="/privacy" className="text-sm text-[var(--warm-gray)] hover:text-[var(--ink-black)] dark:hover:text-white transition-colors">Privacy</Link></li>
                <li><Link to="/terms" className="text-sm text-[var(--warm-gray)] hover:text-[var(--ink-black)] dark:hover:text-white transition-colors">Terms</Link></li>
              </ul>
            </div>
          </div>
          
          {/* Bottom bar */}
          <div className="pt-8 border-t border-rule flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-[var(--warm-gray)]">
              © 2026 Editframe, Inc.
            </p>
            <div className="flex items-center gap-6">
              <a href="https://twitter.com/editframe" target="_blank" rel="noopener noreferrer" className="text-[var(--warm-gray)] hover:text-[var(--ink-black)] dark:hover:text-white transition-colors" aria-label="Twitter">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a href="https://discord.gg/editframe" target="_blank" rel="noopener noreferrer" className="text-[var(--warm-gray)] hover:text-[var(--ink-black)] dark:hover:text-white transition-colors" aria-label="Discord">
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
