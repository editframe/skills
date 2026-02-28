import { Link } from "react-router";
import { TerminalDemo } from "../TerminalDemo";

export function GettingStartedSection() {
  return (
    <section className="relative py-24 bg-[var(--card-bg)] border-t-4 border-[var(--ink-black)] dark:border-white overflow-hidden">
      {/* Clock shape - it's about TIME, speed */}
      <div className="absolute top-1/2 left-0 -translate-y-1/2 -translate-x-1/3 w-[400px] h-[400px] opacity-[0.05] dark:opacity-[0.03]" aria-hidden="true">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <circle cx="50" cy="50" r="45" fill="none" stroke="var(--poster-red)" strokeWidth="4" />
          {/* Clock hands pointing to 2 (minutes) */}
          <line x1="50" y1="50" x2="50" y2="15" stroke="var(--poster-red)" strokeWidth="4" strokeLinecap="round" />
          <line x1="50" y1="50" x2="70" y2="35" stroke="var(--poster-red)" strokeWidth="3" strokeLinecap="round" />
          <circle cx="50" cy="50" r="4" fill="var(--poster-red)" />
        </svg>
      </div>

      <div className="relative max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
          <div>
            <h2 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tighter uppercase mb-4">
              Zero to video
            </h2>
            <p className="text-2xl font-black tracking-tighter uppercase text-[var(--poster-red)] mb-8">
              In minutes
            </p>
            
            <p className="text-lg text-[var(--warm-gray)] mb-10">
              One command to scaffold. One command to develop. Hot reload that works.
            </p>
            
            <div className="space-y-0 mb-10">
              {[
                { num: '1', title: 'Create project', desc: 'One command. Pick a template. Start building.' },
                { num: '2', title: 'Start developing', desc: 'Dev server with instant preview. Edit code, see video update.' },
                { num: '3', title: 'Render & deploy', desc: 'Render locally, in-browser, or push to the cloud.' },
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
              to="/skills"
              className="inline-flex items-center px-6 py-3 border-2 border-[var(--ink-black)] dark:border-white font-bold text-sm uppercase tracking-wider hover:bg-[var(--ink-black)] hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
            >
              Explore docs & skills
              <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>

          <div className="relative">
            <div className="absolute -bottom-2 -right-2 md:-bottom-4 md:-right-4 w-full h-full bg-[var(--poster-red)]" />
            <div className="relative border-4 border-[var(--ink-black)] dark:border-white overflow-hidden">
              <TerminalDemo />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
