import { Link } from "react-router";
import { TemplatedRenderingDemo } from "../index";

export function TemplatedRenderingSection() {
  return (
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

      <div className="relative max-w-7xl mx-auto px-6">
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
          
          <p className="text-xl text-black/70 max-w-2xl leading-relaxed mb-6">
            Define your video once. Pass different data via CLI or API. 
            Render thousands of personalized videos automatically.
          </p>
          
          {/* CLI example */}
          <div className="inline-block bg-black/10 border-2 border-black px-6 py-3 font-mono text-sm">
            <span className="text-black/60">$</span> <span className="text-black font-bold">editframe render --data users.json</span>
          </div>
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
      </div>
    </section>
  );
}
