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
      title: "Telecine | Programmatic Video Creation Platform",
      description:
        "Create videos with code. React components, real-time preview, scalable rendering. The modern way to build video applications.",
    },
  ];
};

export default function IndexPage() {
  const { isLoggedIn } = useLoaderData<typeof loader>();

  return (
    <div className="min-h-screen bg-[#000000] text-[#F8FAFC]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Space+Grotesk:wght@400;500;600;700&display=swap');
        
        body {
          font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;
        }
        
        h1, h2, h3, h4, h5, h6 {
          font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif;
        }
        
        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>

      {/* Navigation */}
      <nav className="fixed top-4 left-4 right-4 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 bg-[#0F0F23] border border-[#1E1B4B] rounded-2xl">
          <div className="flex items-center justify-between">
            <Link to="/" className="text-xl font-bold cursor-pointer">
              Telecine
            </Link>
            <div className="hidden md:flex items-center gap-8">
              <Link to="/docs" className="text-sm hover:text-[#E11D48] transition-colors duration-200 cursor-pointer">
                Documentation
              </Link>
              <Link to="/docs/examples" className="text-sm hover:text-[#E11D48] transition-colors duration-200 cursor-pointer">
                Examples
              </Link>
              <Link to="/pricing" className="text-sm hover:text-[#E11D48] transition-colors duration-200 cursor-pointer">
                Pricing
              </Link>
              <a href="https://github.com/editframe" target="_blank" rel="noopener noreferrer" className="text-sm hover:text-[#E11D48] transition-colors duration-200 cursor-pointer">
                GitHub
              </a>
            </div>
            <div className="flex items-center gap-4">
              {isLoggedIn ? (
                <Link
                  to="/dashboard"
                  className="px-6 py-2 bg-[#E11D48] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity duration-200 cursor-pointer"
                >
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link to="/login" className="text-sm hover:text-[#E11D48] transition-colors duration-200 cursor-pointer">
                    Sign In
                  </Link>
                  <Link
                    to="/welcome"
                    className="px-6 py-2 bg-[#E11D48] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity duration-200 cursor-pointer"
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
        {/* Background grid */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0" style={{
            backgroundImage: 'linear-gradient(#1E1B4B 1px, transparent 1px), linear-gradient(90deg, #1E1B4B 1px, transparent 1px)',
            backgroundSize: '64px 64px'
          }} />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 text-center">
          <h1 className="text-6xl md:text-8xl font-bold mb-8 leading-tight">
            Create videos
            <br />
            <span className="text-[#E11D48]">with code</span>
          </h1>
          <p className="text-xl md:text-2xl mb-12 max-w-3xl mx-auto opacity-80">
            React components, real-time preview, and scalable rendering.
            The modern way to build video applications.
          </p>

          {/* Install command */}
          <div className="max-w-2xl mx-auto mb-12">
            <div className="bg-[#0F0F23] border border-[#1E1B4B] rounded-xl p-4 font-mono text-left">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-[#E11D48]">$</span>
                  <code className="text-sm">npm create @editframe@latest</code>
                </div>
                <button 
                  onClick={() => navigator.clipboard.writeText('npm create @editframe@latest')}
                  className="p-2 hover:bg-[#1E1B4B] rounded-lg transition-colors duration-200 cursor-pointer"
                  title="Copy to clipboard"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link
              to="/welcome"
              className="inline-flex items-center px-8 py-4 bg-[#E11D48] text-white rounded-lg font-medium hover:opacity-90 transition-opacity duration-200 cursor-pointer"
            >
              Get Started
              <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <Link
              to="/docs"
              className="inline-flex items-center px-8 py-4 bg-[#0F0F23] border border-[#1E1B4B] text-white rounded-lg font-medium hover:bg-[#1E1B4B] transition-colors duration-200 cursor-pointer"
            >
              View Documentation
            </Link>
          </div>

          {/* Video showcase placeholder */}
          <div className="relative max-w-5xl mx-auto">
            <div className="relative rounded-2xl overflow-hidden border border-[#1E1B4B] bg-[#0F0F23]">
              <div className="aspect-video flex items-center justify-center bg-gradient-to-br from-[#1E1B4B] to-[#0F0F23]">
                <svg className="w-24 h-24 text-[#E11D48] opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative py-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-5xl font-bold mb-6">Why Telecine?</h2>
            <p className="text-xl opacity-80 max-w-2xl mx-auto">
              Built for developers who need full control over video creation
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-[#0F0F23] border border-[#1E1B4B] rounded-2xl p-8 hover:border-[#E11D48] transition-colors duration-200 cursor-pointer">
              <div className="w-12 h-12 bg-[#E11D48] rounded-lg flex items-center justify-center mb-6">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-4">Code-First Approach</h3>
              <p className="opacity-80 leading-relaxed">
                Use React components, CSS, and JavaScript. No template limitations. 
                Any animation library works—GSAP, Framer Motion, Three.js.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-[#0F0F23] border border-[#1E1B4B] rounded-2xl p-8 hover:border-[#E11D48] transition-colors duration-200 cursor-pointer">
              <div className="w-12 h-12 bg-[#E11D48] rounded-lg flex items-center justify-center mb-6">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-4">Real-Time Preview</h3>
              <p className="opacity-80 leading-relaxed">
                See changes instantly. Scrub the timeline, adjust properties, and iterate 
                rapidly—all in your browser with zero latency.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-[#0F0F23] border border-[#1E1B4B] rounded-2xl p-8 hover:border-[#E11D48] transition-colors duration-200 cursor-pointer">
              <div className="w-12 h-12 bg-[#E11D48] rounded-lg flex items-center justify-center mb-6">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-4">Hyperscale Rendering</h3>
              <p className="opacity-80 leading-relaxed">
                Render 20-minute 4K videos in ~30 seconds. Generate thousands of videos 
                in parallel. Zero infrastructure to manage.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Infrastructure Section */}
      <section className="relative py-32 bg-[#0F0F23]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl font-bold mb-6">Enterprise-Grade Infrastructure</h2>
              <p className="text-xl opacity-80 mb-8 leading-relaxed">
                We've solved the hard engineering problems so you don't have to.
              </p>
              
              <div className="space-y-8">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#1E1B4B] flex items-center justify-center text-[#E11D48]">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">Private Transcription Engine</h3>
                    <p className="opacity-70">
                      Built-in Whisper-based transcription runs in your private cloud. 
                      Word-level timestamps, zero data leakage to third parties.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#1E1B4B] flex items-center justify-center text-[#E11D48]">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">Deep Observability</h3>
                    <p className="opacity-70">
                      Millisecond-level telemetry for every frame. Trace exactly where time is spent—
                      from seek to render to encode.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#1E1B4B] flex items-center justify-center text-[#E11D48]">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">Hybrid Rendering Core</h3>
                    <p className="opacity-70">
                      Dual-pipeline architecture supports both high-fidelity server-side rendering 
                      and distributed browser-side rendering via WebCodecs.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-[#E11D48] to-purple-600 rounded-2xl blur-xl opacity-20" />
              <div className="relative bg-[#000000] border border-[#1E1B4B] rounded-2xl p-6 font-mono text-sm overflow-hidden">
                <div className="flex items-center gap-2 mb-4 border-b border-[#1E1B4B] pb-4">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="ml-2 opacity-50">infrastructure.ts</span>
                </div>
                <div className="space-y-2 opacity-80">
                  <div className="text-green-400">// Private transcription pipeline</div>
                  <div>const transcript = await transcribe(audioFile, {</div>
                  <div className="pl-4">model: "whisper-large-v3",</div>
                  <div className="pl-4">privacy: "private-cloud"</div>
                  <div>});</div>
                  <br />
                  <div className="text-green-400">// Telemetry trace</div>
                  <div>trace.span("render_frame", {</div>
                  <div className="pl-4">frame: 142,</div>
                  <div className="pl-4">seek_ms: 12.4,</div>
                  <div className="pl-4">render_ms: 45.1</div>
                  <div>});</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Code Example Section */}
      <section className="relative py-32 bg-[#0F0F23]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-5xl font-bold mb-6">Simple, powerful API</h2>
              <p className="text-xl opacity-80 mb-8 leading-relaxed">
                Compose videos using familiar React patterns. Every element is a component. 
                Every animation is just CSS or JavaScript.
              </p>
              <Link 
                to="/docs"
                className="inline-flex items-center text-[#E11D48] hover:opacity-80 transition-opacity duration-200 cursor-pointer"
              >
                View full documentation
                <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </div>

            <div className="bg-[#000000] border border-[#1E1B4B] rounded-2xl overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-[#1E1B4B]">
                <div className="w-3 h-3 rounded-full bg-[#E11D48]" />
                <div className="w-3 h-3 rounded-full bg-[#F59E0B]" />
                <div className="w-3 h-3 rounded-full bg-[#10B981]" />
                <span className="ml-3 text-xs opacity-50 font-mono">composition.tsx</span>
              </div>
              <pre className="p-6 overflow-x-auto text-sm">
                <code>{`import { Timegroup, Video, Text } from '@editframe/react';

export const MyVideo = () => (
  <Timegroup 
    mode="contain"
    className="w-[1920px] h-[1080px] bg-black"
  >
    <Video 
      src="background.mp4"
      className="absolute inset-0"
    />
    <Text className="text-white text-6xl">
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
      <section className="relative py-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-5xl font-bold mb-6">What you can build</h2>
            <p className="text-xl opacity-80 max-w-2xl mx-auto">
              From AI-generated content to enterprise video workflows
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: "AI Video Generation",
                description: "Power your AI agents to generate broadcast-quality video from text, data, or prompts. The execution layer for generative video."
              },
              {
                title: "Social Media Automation",
                description: "Generate unique videos for each user with dynamic data, images, and personalized content at scale."
              },
              {
                title: "Automated Reporting",
                description: "Transform data into visual stories with charts, graphs, and narration. Automated, branded, and delivered instantly."
              }
            ].map((useCase, i) => (
              <div key={i} className="bg-[#0F0F23] border border-[#1E1B4B] rounded-2xl p-8">
                <h3 className="text-2xl font-bold mb-4">{useCase.title}</h3>
                <p className="opacity-80 leading-relaxed">{useCase.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-32">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-5xl font-bold mb-6">Ready to start building?</h2>
          <p className="text-xl opacity-80 mb-12">
            Create your first video in minutes. No credit card required.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/welcome"
              className="inline-flex items-center px-8 py-4 bg-[#E11D48] text-white rounded-lg font-medium hover:opacity-90 transition-opacity duration-200 cursor-pointer"
            >
              Get Started Free
              <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <Link
              to="/docs/examples"
              className="inline-flex items-center px-8 py-4 bg-[#0F0F23] border border-[#1E1B4B] text-white rounded-lg font-medium hover:bg-[#1E1B4B] transition-colors duration-200 cursor-pointer"
            >
              View Examples
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative py-12 border-t border-[#1E1B4B]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div>
              <h3 className="font-bold mb-4">Product</h3>
              <ul className="space-y-2">
                <li><Link to="/docs" className="text-sm opacity-80 hover:text-[#E11D48] transition-colors duration-200 cursor-pointer">Documentation</Link></li>
                <li><Link to="/docs/examples" className="text-sm opacity-80 hover:text-[#E11D48] transition-colors duration-200 cursor-pointer">Examples</Link></li>
                <li><Link to="/pricing" className="text-sm opacity-80 hover:text-[#E11D48] transition-colors duration-200 cursor-pointer">Pricing</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-4">Company</h3>
              <ul className="space-y-2">
                <li><Link to="/about" className="text-sm opacity-80 hover:text-[#E11D48] transition-colors duration-200 cursor-pointer">About</Link></li>
                <li><Link to="/blog" className="text-sm opacity-80 hover:text-[#E11D48] transition-colors duration-200 cursor-pointer">Blog</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-4">Community</h3>
              <ul className="space-y-2">
                <li><a href="https://github.com/editframe" target="_blank" rel="noopener noreferrer" className="text-sm opacity-80 hover:text-[#E11D48] transition-colors duration-200 cursor-pointer">GitHub</a></li>
                <li><a href="https://discord.gg/editframe" target="_blank" rel="noopener noreferrer" className="text-sm opacity-80 hover:text-[#E11D48] transition-colors duration-200 cursor-pointer">Discord</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-4">Legal</h3>
              <ul className="space-y-2">
                <li><Link to="/privacy" className="text-sm opacity-80 hover:text-[#E11D48] transition-colors duration-200 cursor-pointer">Privacy</Link></li>
                <li><Link to="/terms" className="text-sm opacity-80 hover:text-[#E11D48] transition-colors duration-200 cursor-pointer">Terms</Link></li>
              </ul>
            </div>
          </div>
          <div className="text-center text-sm opacity-50">
            © 2026 Telecine. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
