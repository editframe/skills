import { Link } from "react-router";
import type { Route } from "./+types/catalog";
import type { SkillReference } from "~/utils/skills.server";
import { getSkillCatalog } from "~/utils/skills.server";

export const meta = () => {
  return [
    { title: "Documentation - Editframe" },
    {
      name: "description",
      content:
        "Everything you need to build with Editframe — skills for AI agents, documentation for developers, from the same source.",
    },
  ];
};

export const loader = async () => {
  const skills = getSkillCatalog();
  return { skills };
};

const getCategoryInfo = (skillName: string) => {
  const categories: Record<string, { label: string; color: string }> = {
    "elements-composition": {
      label: "Elements",
      color: "var(--poster-blue)",
    },
    "react-composition": { label: "React", color: "var(--poster-green)" },
    "motion-design": { label: "Motion", color: "var(--poster-gold)" },
    "brand-video-generator": { label: "Strategy", color: "var(--poster-red)" },
  };
  return (
    categories[skillName] || { label: "Skill", color: "var(--poster-blue)" }
  );
};

const TYPE_LABELS: Record<string, string> = {
  tutorial: "Tutorials",
  "how-to": "How-tos",
  explanation: "Explanations",
  reference: "References",
};

const TYPE_COLORS: Record<string, string> = {
  tutorial: "var(--poster-green)",
  "how-to": "var(--poster-blue)",
  explanation: "var(--poster-gold)",
  reference: "var(--warm-gray)",
};

function getTypeCounts(refs: SkillReference[]): { type: string; label: string; count: number; color: string }[] {
  const counts = new Map<string, number>();
  for (const ref of refs) {
    counts.set(ref.type, (counts.get(ref.type) || 0) + 1);
  }
  const order = ["tutorial", "how-to", "explanation", "reference"];
  return order
    .filter((t) => counts.has(t))
    .map((t) => ({
      type: t,
      label: TYPE_LABELS[t] || t,
      count: counts.get(t)!,
      color: TYPE_COLORS[t] || "var(--warm-gray)",
    }));
}

interface SkillData {
  name: string;
  description: string;
  referenceCount: number;
  referencesMeta: SkillReference[];
}

export default function SkillsCatalog({ loaderData }: Route.ComponentProps) {
  const { skills } = loaderData;

  const tutorials = (skills as SkillData[]).flatMap((skill) =>
    skill.referencesMeta
      .filter((ref) => ref.type === "tutorial")
      .map((ref) => ({ ...ref, skillName: skill.name }))
  );

  return (
    <div className="min-h-screen bg-[var(--paper-cream)] texture-paper">
      {/* Header */}
      <header className="border-b-4 border-[var(--ink-black)] dark:border-white bg-white dark:bg-[var(--card-dark-bg)]">
        <div className="max-w-7xl mx-auto px-6 py-4 md:py-6">
          <div className="flex items-center justify-between gap-4">
            <Link
              to="/"
              className="text-xl md:text-2xl font-black uppercase tracking-tighter"
            >
              Editframe
            </Link>
            <nav className="flex items-center gap-3 md:gap-6">
              <Link
                to="/docs"
                className="text-xs md:text-sm font-bold uppercase tracking-wider hover:text-[var(--poster-red)] transition-colors hidden sm:inline"
              >
                Docs
              </Link>
              <Link
                to="/welcome"
                className="px-4 md:px-6 py-2 bg-[var(--ink-black)] dark:bg-white text-white dark:text-black font-bold text-xs md:text-sm uppercase tracking-wider hover:bg-[var(--poster-red)] transition-colors"
              >
                Start
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative py-24 overflow-hidden">
        {/* Background pattern - grid of squares (building blocks) */}
        <div className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/4 w-[500px] h-[500px] opacity-[0.06]">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <rect x="10" y="10" width="15" height="15" fill="var(--poster-red)" />
            <rect x="30" y="10" width="15" height="15" fill="var(--poster-blue)" />
            <rect x="50" y="10" width="15" height="15" fill="var(--poster-gold)" />
            <rect x="10" y="30" width="15" height="15" fill="var(--poster-green)" />
            <rect x="30" y="30" width="15" height="15" fill="var(--poster-red)" />
            <rect x="50" y="30" width="15" height="15" fill="var(--poster-blue)" />
            <rect x="10" y="50" width="15" height="15" fill="var(--poster-gold)" />
            <rect x="30" y="50" width="15" height="15" fill="var(--poster-green)" />
            <rect x="50" y="50" width="15" height="15" fill="var(--poster-red)" />
          </svg>
        </div>

        <div className="relative max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter uppercase mb-6">
              Documentation
            </h1>
            <div className="flex justify-center items-center gap-2 mb-8">
              <div className="w-16 h-2 bg-[var(--poster-red)]" />
              <div className="w-12 h-2 bg-[var(--poster-gold)]" />
              <div className="w-8 h-2 bg-[var(--poster-blue)]" />
            </div>
            <p className="text-xl text-[var(--warm-gray)] max-w-3xl mx-auto leading-relaxed">
              Everything you need to build with Editframe — skills for AI
              agents, documentation for developers, from the same source.
            </p>
          </div>

          {/* Transparency notice */}
          <div className="max-w-4xl mx-auto mb-16">
            <div className="relative">
              <div className="absolute -bottom-3 -right-3 w-full h-full bg-[var(--poster-gold)]" />
              <div className="relative bg-white dark:bg-[var(--card-dark-bg)] border-4 border-[var(--ink-black)] dark:border-white p-6">
                <div className="flex items-start gap-4">
                  <svg
                    className="w-6 h-6 text-[var(--poster-blue)] flex-shrink-0 mt-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div>
                    <h3 className="font-bold text-sm uppercase tracking-wider mb-2">
                      Transparency Layer
                    </h3>
                    <p className="text-sm text-[var(--warm-gray)] leading-relaxed">
                      This documentation is authored as agent skills. What you
                      see here is the exact content your AI agent reads — same
                      source, same truth.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Skills grid */}
          <div className="grid md:grid-cols-2 gap-8 mb-24">
            {(skills as SkillData[]).map((skill) => {
              const category = getCategoryInfo(skill.name);
              const typeCounts = getTypeCounts(skill.referencesMeta);
              return (
                <Link
                  key={skill.name}
                  to={`/skills/${skill.name}`}
                  className="group relative block"
                >
                  <div
                    className="absolute -bottom-4 -right-4 w-full h-full transition-all group-hover:-bottom-2 group-hover:-right-2"
                    style={{ backgroundColor: category.color }}
                  />
                  <div className="relative bg-white dark:bg-[var(--card-dark-bg)] border-4 border-[var(--ink-black)] dark:border-white p-8 transition-all group-hover:translate-x-[2px] group-hover:translate-y-[2px]">
                    {/* Category badge */}
                    <div className="flex items-center justify-between mb-4">
                      <span
                        className="inline-block px-3 py-1 text-xs font-bold uppercase tracking-wider text-white"
                        style={{ backgroundColor: category.color }}
                      >
                        {category.label}
                      </span>
                      <span className="text-xs font-mono text-[var(--warm-gray)]">
                        {skill.referenceCount} total
                      </span>
                    </div>

                    {/* Skill name */}
                    <h2 className="text-2xl font-black uppercase tracking-tighter mb-3">
                      {skill.name.replace(/-/g, " ")}
                    </h2>

                    {/* Description */}
                    <p className="text-sm text-[var(--warm-gray)] leading-relaxed mb-4">
                      {skill.description}
                    </p>

                    {/* Type breakdown badges */}
                    {typeCounts.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {typeCounts.map((tc) => (
                          <span
                            key={tc.type}
                            className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border-2"
                            style={{ borderColor: tc.color, color: tc.color }}
                          >
                            {tc.count} {tc.count === 1 ? tc.label.replace(/s$/, "") : tc.label}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Arrow */}
                    <div className="flex items-center text-xs font-bold uppercase tracking-wider group-hover:translate-x-1 transition-transform">
                      Explore
                      <svg
                        className="ml-2 w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2.5}
                          d="M17 8l4 4m0 0l-4 4m4-4H3"
                        />
                      </svg>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Quick Links - Tutorials */}
          {tutorials.length > 0 && (
            <div className="mb-24">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-3 h-3 bg-[var(--poster-green)]" />
                <h2 className="text-3xl md:text-4xl font-black tracking-tighter uppercase">
                  Getting Started
                </h2>
              </div>
              <p className="text-sm text-[var(--warm-gray)] mb-8 max-w-2xl">
                Step-by-step tutorials to get you building with Editframe.
              </p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {tutorials.map((tutorial) => {
                  const category = getCategoryInfo(tutorial.skillName);
                  return (
                    <Link
                      key={`${tutorial.skillName}-${tutorial.name}`}
                      to={`/skills/${tutorial.skillName}/${tutorial.name}`}
                      className="group relative block bg-white dark:bg-[var(--card-dark-bg)] border-2 border-[var(--ink-black)] dark:border-white/20 p-5 hover:border-[var(--poster-green)] transition-colors"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: category.color }}
                        />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--warm-gray)]">
                          {category.label}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold mb-1 group-hover:text-[var(--poster-green)] transition-colors">
                        {tutorial.title}
                      </h3>
                      {tutorial.description && (
                        <p className="text-xs text-[var(--warm-gray)] leading-relaxed line-clamp-2">
                          {tutorial.description}
                        </p>
                      )}
                      <div className="mt-3 text-[10px] font-bold uppercase tracking-wider text-[var(--poster-green)]">
                        Tutorial
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Installation section */}
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-black tracking-tighter uppercase mb-8 text-center">
              Installation
            </h2>

            <div className="space-y-6">
              {/* Cursor */}
              <div className="relative">
                <div className="absolute -bottom-3 -right-3 w-full h-full bg-[var(--poster-blue)]" />
                <div className="relative bg-white dark:bg-[var(--card-dark-bg)] border-4 border-[var(--ink-black)] dark:border-white overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-3 border-b-2 border-[var(--ink-black)] dark:border-white/20 bg-[var(--poster-blue)]/10">
                    <span className="font-bold text-sm uppercase tracking-wider">
                      Cursor
                    </span>
                  </div>
                  <div className="p-6">
                    <pre className="font-mono text-sm overflow-x-auto">
                      <code>{`cp -r skills/elements-composition .cursor/skills/
cp -r skills/react-composition .cursor/skills/
cp -r skills/motion-design .cursor/skills/
cp -r skills/brand-video-generator .cursor/skills/`}</code>
                    </pre>
                  </div>
                </div>
              </div>

              {/* Claude Code */}
              <div className="relative">
                <div className="absolute -bottom-3 -right-3 w-full h-full bg-[var(--poster-green)]" />
                <div className="relative bg-white dark:bg-[var(--card-dark-bg)] border-4 border-[var(--ink-black)] dark:border-white overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-3 border-b-2 border-[var(--ink-black)] dark:border-white/20 bg-[var(--poster-green)]/10">
                    <span className="font-bold text-sm uppercase tracking-wider">
                      Claude Code
                    </span>
                  </div>
                  <div className="p-6">
                    <pre className="font-mono text-sm overflow-x-auto">
                      <code>/plugin marketplace add editframe/skills</code>
                    </pre>
                  </div>
                </div>
              </div>

              {/* Manual */}
              <div className="relative">
                <div className="absolute -bottom-3 -right-3 w-full h-full bg-[var(--poster-gold)]" />
                <div className="relative bg-white dark:bg-[var(--card-dark-bg)] border-4 border-[var(--ink-black)] dark:border-white overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-3 border-b-2 border-[var(--ink-black)] dark:border-white/20 bg-[var(--poster-gold)]/10">
                    <span className="font-bold text-sm uppercase tracking-wider">
                      Manual
                    </span>
                  </div>
                  <div className="p-6">
                    <p className="text-sm text-[var(--warm-gray)] leading-relaxed">
                      Copy the skill folders to your agent's skills directory.
                      Each skill includes a SKILL.md file and references/
                      directory with detailed documentation.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
