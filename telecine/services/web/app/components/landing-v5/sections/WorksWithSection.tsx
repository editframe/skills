export function WorksWithSection() {
  const frameworks = [
    { name: "Next.js", color: "var(--ink-black)" },
    { name: "Remix", color: "var(--poster-blue)" },
    { name: "Vite", color: "var(--poster-gold)" },
    { name: "Node.js", color: "var(--poster-green)" },
    { name: "Bun", color: "var(--poster-pink)" },
  ];

  return (
    <div className="relative py-12 bg-[var(--card-bg)] border-t-2 border-b-2 border-[var(--ink-black)]/10 dark:border-white/10">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-center gap-8">
          <h3 className="text-lg font-bold uppercase tracking-wider text-[var(--warm-gray)]">
            Works with
          </h3>
          <div className="flex flex-wrap items-center justify-center gap-6">
            {frameworks.map((fw) => (
              <div
                key={fw.name}
                className="px-6 py-3 border-2 border-[var(--ink-black)] dark:border-white font-bold text-sm uppercase tracking-wider"
                style={{ color: fw.color }}
              >
                {fw.name}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
