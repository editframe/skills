import { Link } from "react-router";
import type { Route } from "./+types/catalog";
import { getSkillCatalog } from "~/utils/skills.server";

export const meta = () => {
  return [
    { title: "Skills - Editframe" },
    {
      name: "description",
      content:
        "Agent skills for video composition with Editframe Elements. Build video tools with natural language prompts.",
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

export default function SkillsCatalog({ loaderData }: Route.ComponentProps) {
  const { skills } = loaderData;

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
              Agent Skills
            </h1>
            <div className="flex justify-center items-center gap-2 mb-8">
              <div className="w-16 h-2 bg-[var(--poster-red)]" />
              <div className="w-12 h-2 bg-[var(--poster-gold)]" />
              <div className="w-8 h-2 bg-[var(--poster-blue)]" />
            </div>
            <p className="text-xl text-[var(--warm-gray)] max-w-3xl mx-auto leading-relaxed">
              Turn natural language into production-ready video tools. These
              skills teach AI agents how to build with Editframe Elements.
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
                      This explorer shows the exact content your AI agent reads
                      when using these skills. No marketing spin — just the
                      actual skill definitions and reference documentation.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Skills grid */}
          <div className="grid md:grid-cols-2 gap-8 mb-24">
            {skills.map((skill: { name: string; description: string; referenceCount: number }) => {
              const category = getCategoryInfo(skill.name);
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
                        {skill.referenceCount} references
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
