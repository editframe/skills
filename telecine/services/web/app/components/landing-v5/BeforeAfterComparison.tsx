/* ==============================================================================
   COMPONENT: BeforeAfterComparison
   
   Purpose: Show the transformation. This is emotional - developers feel
   the pain of the "before" and desire the "after".
   
   Design: Bold Swissted-inspired cards with strong color accents
   ============================================================================== */

export function BeforeAfterComparison() {
  return (
    <div className="grid md:grid-cols-2 gap-8">
      {/* Before */}
      <div className="relative">
        <div className="absolute -bottom-3 -right-3 w-full h-full bg-[var(--poster-red)]" />
        <div className="relative bg-white dark:bg-[#111] border-4 border-[var(--ink-black)] dark:border-white overflow-hidden">
          {/* Bold header bar */}
          <div className="bg-[var(--poster-red)] text-white px-6 py-3">
            <span className="font-bold text-sm uppercase tracking-wider">
              Traditional Approach
            </span>
          </div>

          <div className="p-6">
            <div className="space-y-4">
              {[
                {
                  title: "Write FFmpeg scripts",
                  desc: "Learn arcane flags. Debug cryptic errors.",
                },
                {
                  title: "Wait for renders",
                  desc: "Change one parameter. Render 5 minutes. Repeat.",
                },
                {
                  title: "Manage infrastructure",
                  desc: "Provision GPU servers. Handle encoding queues.",
                },
                {
                  title: "Count frames manually",
                  desc: "Calculate timestamps. Convert formats. Make errors.",
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 pb-4 border-b border-rule last:border-0 last:pb-0"
                >
                  <div className="flex-shrink-0 w-6 h-6 bg-[var(--poster-red)] flex items-center justify-center mt-0.5">
                    <svg
                      className="w-3 h-3 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth={3}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="font-bold text-sm uppercase tracking-wide mb-0.5">
                      {item.title}
                    </p>
                    <p className="text-sm text-[var(--warm-gray)]">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t-2 border-[var(--ink-black)] dark:border-white">
              <p className="text-sm font-bold uppercase tracking-wider">
                Timeline:{" "}
                <span className="text-[var(--poster-red)]">2-4 weeks</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* After */}
      <div className="relative">
        <div className="absolute -bottom-3 -right-3 w-full h-full bg-[var(--poster-blue)]" />
        <div className="relative bg-white dark:bg-[#111] border-4 border-[var(--ink-black)] dark:border-white overflow-hidden">
          {/* Bold header bar */}
          <div className="bg-[var(--poster-blue)] text-white px-6 py-3">
            <span className="font-bold text-sm uppercase tracking-wider">
              With Editframe
            </span>
          </div>

          <div className="p-6">
            <div className="space-y-4">
              {[
                {
                  title: "Write React components",
                  desc: "Use skills you have. JSX, CSS, any animation library.",
                },
                {
                  title: "Preview instantly",
                  desc: "Edit code, see video update in milliseconds.",
                },
                {
                  title: "Render on our infrastructure",
                  desc: "Push to cloud. We handle scaling and delivery.",
                },
                {
                  title: "Time is just a prop",
                  desc: "start, duration, offset. Declarative timing.",
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 pb-4 border-b border-rule last:border-0 last:pb-0"
                >
                  <div className="flex-shrink-0 w-6 h-6 bg-[var(--poster-blue)] flex items-center justify-center mt-0.5">
                    <svg
                      className="w-3 h-3 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth={3}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="font-bold text-sm uppercase tracking-wide mb-0.5">
                      {item.title}
                    </p>
                    <p className="text-sm text-[var(--warm-gray)]">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t-2 border-[var(--ink-black)] dark:border-white">
              <p className="text-sm font-bold uppercase tracking-wider">
                Timeline:{" "}
                <span className="text-[var(--poster-blue)]">2-4 hours</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BeforeAfterComparison;
