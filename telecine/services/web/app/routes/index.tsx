import {
  type LoaderFunctionArgs,
  type MetaFunction,
  useLoaderData,
} from "react-router";
import { parseRequestSession } from "@/util/session";
import { Link } from "react-router";

export const loader = async (args: LoaderFunctionArgs) => {
  const session = await parseRequestSession(args.request);
  return { isLoggedIn: !!session };
};

export const meta: MetaFunction = () => {
  return [
    {
      title: "Editframe | Programmatic Video Infrastructure",
      description:
        "The infrastructure for programmatic video. React components, real-time preview, and hyperscale rendering. Build video applications with code.",
    },
  ];
};

export default function IndexPage() {
  const { isLoggedIn } = useLoaderData<typeof loader>();

  return (
    <div className="min-h-screen bg-[#0F172A] text-[#F8FAFC]">
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        
        body {
          font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
        }
        
        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}} />

      {/* Navigation */}
      <nav className="fixed top-4 left-4 right-4 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 bg-[#1E293B]/80 backdrop-blur-lg border border-[#334155] rounded-2xl">
          <div className="flex items-center justify-between">
            <Link to="/" className="text-xl font-bold cursor-pointer hover:opacity-80 transition-opacity duration-200">
              Editframe
            </Link>
            <div className="hidden md:flex items-center gap-8">
              <Link to="/docs" className="text-sm text-[#94A3B8] hover:text-white transition-colors duration-200 cursor-pointer">
                Documentation
              </Link>
              <Link to="/docs/examples" className="text-sm text-[#94A3B8] hover:text-white transition-colors duration-200 cursor-pointer">
                Examples
              </Link>
              <Link to="/pricing" className="text-sm text-[#94A3B8] hover:text-white transition-colors duration-200 cursor-pointer">
                Pricing
              </Link>
              <a href="https://github.com/editframe" target="_blank" rel="noopener noreferrer" className="text-sm text-[#94A3B8] hover:text-white transition-colors duration-200 cursor-pointer">
                GitHub
              </a>
            </div>
            <div className="flex items-center gap-4">
              {isLoggedIn ? (
                <Link
                  to="/dashboard"
                  className="px-5 py-2.5 bg-[#22C55E] text-[#0F172A] rounded-lg text-sm font-semibold hover:bg-[#16A34A] transition-colors duration-200 cursor-pointer"
                >
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link to="/login" className="text-sm text-[#94A3B8] hover:text-white transition-colors duration-200 cursor-pointer">
                    Sign In
                  </Link>
                  <Link
                    to="/welcome"
                    className="px-5 py-2.5 bg-[#22C55E] text-[#0F172A] rounded-lg text-sm font-semibold hover:bg-[#16A34A] transition-colors duration-200 cursor-pointer"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-24">
        {/* Background gradient */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-[#22C55E]/5 via-transparent to-transparent" />
          <div className="absolute inset-0 opacity-30" style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, #334155 1px, transparent 0)',
            backgroundSize: '48px 48px'
          }} />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#22C55E]/10 border border-[#22C55E]/20 rounded-full text-sm text-[#22C55E] mb-8">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Now in public beta
          </div>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold mb-8 leading-[1.1] tracking-tight">
            The infrastructure for
            <br />
            <span className="text-[#22C55E]">programmatic video</span>
          </h1>
          <p className="text-xl md:text-2xl mb-12 max-w-3xl mx-auto text-[#94A3B8] leading-relaxed">
            The standard for developers and AI agents to generate video at scale.
            Composable, serverless, and production-ready.
          </p>

          {/* Install command */}
          <div className="max-w-xl mx-auto mb-12">
            <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-4 font-mono text-left">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-[#22C55E]">$</span>
                  <code className="text-sm text-[#E2E8F0]">npm create @editframe@latest</code>
                </div>
                <button 
                  onClick={() => navigator.clipboard.writeText('npm create @editframe@latest')}
                  className="p-2 hover:bg-[#334155] rounded-lg transition-colors duration-200 cursor-pointer"
                  title="Copy to clipboard"
                  aria-label="Copy to clipboard"
                >
                  <svg className="w-5 h-5 text-[#94A3B8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
            <Link
              to="/welcome"
              className="inline-flex items-center px-8 py-4 bg-[#22C55E] text-[#0F172A] rounded-xl font-semibold hover:bg-[#16A34A] transition-colors duration-200 cursor-pointer"
            >
              Start Building
              <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <Link
              to="/docs"
              className="inline-flex items-center px-8 py-4 bg-[#1E293B] border border-[#334155] text-white rounded-xl font-semibold hover:bg-[#334155] transition-colors duration-200 cursor-pointer"
            >
              Read the Docs
            </Link>
          </div>

          {/* Video showcase placeholder */}
          <div className="relative max-w-5xl mx-auto">
            <div className="absolute -inset-4 bg-gradient-to-r from-[#22C55E]/20 to-[#3B82F6]/20 rounded-3xl blur-2xl opacity-50" />
            <div className="relative rounded-2xl overflow-hidden border border-[#334155] bg-[#1E293B]">
              <div className="aspect-video flex items-center justify-center bg-gradient-to-br from-[#1E293B] to-[#0F172A]">
                <div className="text-center">
                  <svg className="w-20 h-20 text-[#22C55E]/50 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-[#64748B] text-sm">Interactive demo</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative py-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">Why developers choose Editframe</h2>
            <p className="text-xl text-[#94A3B8] max-w-2xl mx-auto">
              Full control over video creation with the tools you already know
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="group bg-[#1E293B] border border-[#334155] rounded-2xl p-8 hover:border-[#22C55E]/50 transition-colors duration-200 cursor-pointer">
              <div className="w-12 h-12 bg-[#22C55E]/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-[#22C55E]/20 transition-colors duration-200">
                <svg className="w-6 h-6 text-[#22C55E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3">Composable Primitives</h3>
              <p className="text-[#94A3B8] leading-relaxed">
                Web Components and React. Use CSS, JavaScript, and any animation library—GSAP, Framer Motion, Three.js.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group bg-[#1E293B] border border-[#334155] rounded-2xl p-8 hover:border-[#22C55E]/50 transition-colors duration-200 cursor-pointer">
              <div className="w-12 h-12 bg-[#22C55E]/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-[#22C55E]/20 transition-colors duration-200">
                <svg className="w-6 h-6 text-[#22C55E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3">Zero-Latency Preview</h3>
              <p className="text-[#94A3B8] leading-relaxed">
                JIT transcoding and smart caching. Scrub the timeline, iterate rapidly—all in your browser with instant feedback.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group bg-[#1E293B] border border-[#334155] rounded-2xl p-8 hover:border-[#22C55E]/50 transition-colors duration-200 cursor-pointer">
              <div className="w-12 h-12 bg-[#22C55E]/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-[#22C55E]/20 transition-colors duration-200">
                <svg className="w-6 h-6 text-[#22C55E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3">Hyperscale Rendering</h3>
              <p className="text-[#94A3B8] leading-relaxed">
                Server-side FFmpeg or distributed browser-side WebCodecs. Render thousands of videos in parallel. Zero infrastructure.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Infrastructure Section */}
      <section className="relative py-32 bg-[#1E293B]/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-[#22C55E] font-semibold mb-4 uppercase tracking-wider text-sm">Enterprise Infrastructure</p>
              <h2 className="text-4xl md:text-5xl font-bold mb-6">Built for production workloads</h2>
              <p className="text-xl text-[#94A3B8] mb-10 leading-relaxed">
                We've solved the hard engineering problems so you can focus on your product.
              </p>
              
              <div className="space-y-8">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[#22C55E]/10 flex items-center justify-center">
                    <svg className="w-5 h-5 text-[#22C55E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold mb-2">Private Transcription Engine</h3>
                    <p className="text-[#94A3B8]">
                      Built-in Whisper-based transcription in your private cloud. 
                      Word-level timestamps, zero data leakage.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[#22C55E]/10 flex items-center justify-center">
                    <svg className="w-5 h-5 text-[#22C55E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold mb-2">Deep Observability</h3>
                    <p className="text-[#94A3B8]">
                      Millisecond-level telemetry for every frame. Trace exactly where time 
                      is spent—seek, render, encode.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[#22C55E]/10 flex items-center justify-center">
                    <svg className="w-5 h-5 text-[#22C55E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold mb-2">Hybrid Rendering Core</h3>
                    <p className="text-[#94A3B8]">
                      Dual-pipeline architecture. High-fidelity server-side or distributed 
                      browser-side rendering via WebCodecs.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-[#22C55E]/10 to-[#3B82F6]/10 rounded-2xl blur-xl" />
              <div className="relative bg-[#0F172A] border border-[#334155] rounded-2xl p-6 font-mono text-sm overflow-hidden">
                <div className="flex items-center gap-2 mb-4 border-b border-[#334155] pb-4">
                  <div className="w-3 h-3 rounded-full bg-[#EF4444]" />
                  <div className="w-3 h-3 rounded-full bg-[#F59E0B]" />
                  <div className="w-3 h-3 rounded-full bg-[#22C55E]" />
                  <span className="ml-2 text-[#64748B]">infrastructure.ts</span>
                </div>
                <div className="space-y-2 text-[#E2E8F0]">
                  <div className="text-[#22C55E]">{'// Private transcription pipeline'}</div>
                  <div><span className="text-[#C084FC]">const</span> transcript = <span className="text-[#C084FC]">await</span> transcribe(audioFile, {'{'}</div>
                  <div className="pl-4">model: <span className="text-[#FDE68A]">"whisper-large-v3"</span>,</div>
                  <div className="pl-4">privacy: <span className="text-[#FDE68A]">"private-cloud"</span></div>
                  <div>{'});'}</div>
                  <br />
                  <div className="text-[#22C55E]">{'// Frame-level telemetry'}</div>
                  <div>trace.span(<span className="text-[#FDE68A]">"render_frame"</span>, {'{'}</div>
                  <div className="pl-4">frame: <span className="text-[#7DD3FC]">142</span>,</div>
                  <div className="pl-4">seekMs: <span className="text-[#7DD3FC]">12.4</span>,</div>
                  <div className="pl-4">renderMs: <span className="text-[#7DD3FC]">45.1</span>,</div>
                  <div className="pl-4">encodeMs: <span className="text-[#7DD3FC]">8.2</span></div>
                  <div>{'});'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Code Example Section */}
      <section className="relative py-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-[#22C55E] font-semibold mb-4 uppercase tracking-wider text-sm">Developer Experience</p>
              <h2 className="text-4xl md:text-5xl font-bold mb-6">Simple, powerful API</h2>
              <p className="text-xl text-[#94A3B8] mb-8 leading-relaxed">
                Compose videos using familiar React patterns. Every element is a component. 
                Every animation is just CSS or JavaScript.
              </p>
              <Link 
                to="/docs"
                className="inline-flex items-center text-[#22C55E] font-semibold hover:opacity-80 transition-opacity duration-200 cursor-pointer"
              >
                View full documentation
                <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </div>

            <div className="bg-[#0F172A] border border-[#334155] rounded-2xl overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-[#334155] bg-[#1E293B]">
                <div className="w-3 h-3 rounded-full bg-[#EF4444]" />
                <div className="w-3 h-3 rounded-full bg-[#F59E0B]" />
                <div className="w-3 h-3 rounded-full bg-[#22C55E]" />
                <span className="ml-3 text-xs text-[#64748B] font-mono">composition.tsx</span>
              </div>
              <pre className="p-6 overflow-x-auto text-sm">
                <code className="text-[#E2E8F0]">{`import { Timegroup, Video, Text, Captions } from '@editframe/react';

export const MyVideo = () => (
  <Timegroup 
    mode="contain"
    className="w-[1920px] h-[1080px] bg-black"
  >
    <Video 
      src="background.mp4"
      className="absolute inset-0"
    />
    <Captions 
      target="background"
      className="absolute bottom-12 text-2xl"
    />
    <Text className="text-white text-6xl animate-fade-in">
      Hello, World!
    </Text>
  </Timegroup>
);`}</code>
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="relative py-32 bg-[#1E293B]/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <p className="text-[#22C55E] font-semibold mb-4 uppercase tracking-wider text-sm">Use Cases</p>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">What you can build</h2>
            <p className="text-xl text-[#94A3B8] max-w-2xl mx-auto">
              From AI-generated content to enterprise video workflows
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                ),
                title: "AI Video Generation",
                description: "Power your AI agents to generate broadcast-quality video from text, data, or prompts. The execution layer for generative video."
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                ),
                title: "Personalized Video at Scale",
                description: "Generate unique videos for each user with dynamic data, images, and personalized content. Thousands per minute."
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                ),
                title: "Automated Reporting",
                description: "Transform data into visual stories with charts, graphs, and narration. Automated, branded, delivered instantly."
              }
            ].map((useCase, i) => (
              <div key={i} className="group bg-[#0F172A] border border-[#334155] rounded-2xl p-8 hover:border-[#22C55E]/50 transition-colors duration-200 cursor-pointer">
                <div className="w-12 h-12 bg-[#22C55E]/10 rounded-xl flex items-center justify-center mb-6 text-[#22C55E] group-hover:bg-[#22C55E]/20 transition-colors duration-200">
                  {useCase.icon}
                </div>
                <h3 className="text-xl font-bold mb-3">{useCase.title}</h3>
                <p className="text-[#94A3B8] leading-relaxed">{useCase.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-32">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">Ready to start building?</h2>
          <p className="text-xl text-[#94A3B8] mb-12">
            Create your first video in minutes. No credit card required.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/welcome"
              className="inline-flex items-center px-8 py-4 bg-[#22C55E] text-[#0F172A] rounded-xl font-semibold hover:bg-[#16A34A] transition-colors duration-200 cursor-pointer"
            >
              Get Started Free
              <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <Link
              to="/docs/examples"
              className="inline-flex items-center px-8 py-4 bg-[#1E293B] border border-[#334155] text-white rounded-xl font-semibold hover:bg-[#334155] transition-colors duration-200 cursor-pointer"
            >
              View Examples
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative py-16 border-t border-[#334155]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-5 gap-8 mb-12">
            <div className="md:col-span-2">
              <Link to="/" className="text-xl font-bold cursor-pointer">Editframe</Link>
              <p className="mt-4 text-[#94A3B8] text-sm max-w-xs">
                The infrastructure for programmatic video. Build, preview, and render video with code.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-3">
                <li><Link to="/docs" className="text-sm text-[#94A3B8] hover:text-white transition-colors duration-200 cursor-pointer">Documentation</Link></li>
                <li><Link to="/docs/examples" className="text-sm text-[#94A3B8] hover:text-white transition-colors duration-200 cursor-pointer">Examples</Link></li>
                <li><Link to="/pricing" className="text-sm text-[#94A3B8] hover:text-white transition-colors duration-200 cursor-pointer">Pricing</Link></li>
                <li><Link to="/changelog" className="text-sm text-[#94A3B8] hover:text-white transition-colors duration-200 cursor-pointer">Changelog</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-3">
                <li><Link to="/about" className="text-sm text-[#94A3B8] hover:text-white transition-colors duration-200 cursor-pointer">About</Link></li>
                <li><Link to="/blog" className="text-sm text-[#94A3B8] hover:text-white transition-colors duration-200 cursor-pointer">Blog</Link></li>
                <li><a href="https://github.com/editframe" target="_blank" rel="noopener noreferrer" className="text-sm text-[#94A3B8] hover:text-white transition-colors duration-200 cursor-pointer">GitHub</a></li>
                <li><a href="https://discord.gg/editframe" target="_blank" rel="noopener noreferrer" className="text-sm text-[#94A3B8] hover:text-white transition-colors duration-200 cursor-pointer">Discord</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Legal</h3>
              <ul className="space-y-3">
                <li><Link to="/privacy" className="text-sm text-[#94A3B8] hover:text-white transition-colors duration-200 cursor-pointer">Privacy Policy</Link></li>
                <li><Link to="/terms" className="text-sm text-[#94A3B8] hover:text-white transition-colors duration-200 cursor-pointer">Terms of Service</Link></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-[#334155] flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-[#64748B]">
              © 2026 Editframe, Inc. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <a href="https://github.com/editframe" target="_blank" rel="noopener noreferrer" className="text-[#64748B] hover:text-white transition-colors duration-200 cursor-pointer" aria-label="GitHub">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
              </a>
              <a href="https://twitter.com/editloops" target="_blank" rel="noopener noreferrer" className="text-[#64748B] hover:text-white transition-colors duration-200 cursor-pointer" aria-label="Twitter">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                </svg>
              </a>
              <a href="https://discord.gg/editframe" target="_blank" rel="noopener noreferrer" className="text-[#64748B] hover:text-white transition-colors duration-200 cursor-pointer" aria-label="Discord">
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
