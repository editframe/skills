import { Link } from "react-router";
import type { Route } from "./+types/catalog";
import type { SkillReference } from "~/utils/skills.server";
import { getSkillCatalog } from "~/utils/skills.server";
import { SkillsLayout } from "~/components/skills/SkillsLayout";
import { useTheme } from "~/hooks/useTheme";
import clsx from "clsx";

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

const TYPE_BADGE_STYLES: Record<string, string> = {
  tutorial: "bg-green-700 dark:bg-green-600 text-white",
  "how-to": "bg-blue-700 dark:bg-blue-600 text-white",
  explanation: "bg-amber-500 dark:bg-amber-400 text-gray-900",
  reference: "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300",
};

const TYPE_LABELS: Record<string, string> = {
  tutorial: "Tutorials",
  "how-to": "How-tos",
  explanation: "Explanations",
  reference: "References",
};

function TypeBadge({ type }: { type: string }) {
  return (
    <span
      className={clsx(
        "inline-block px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider leading-none rounded-sm",
        TYPE_BADGE_STYLES[type] || TYPE_BADGE_STYLES.reference,
      )}
    >
      {type}
    </span>
  );
}

function getTypeCounts(
  refs: SkillReference[],
): { type: string; label: string; count: number }[] {
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
    }));
}

interface SkillData {
  name: string;
  description: string;
  referenceCount: number;
  referencesMeta: SkillReference[];
}

export default function SkillsCatalog({ loaderData }: Route.ComponentProps) {
  useTheme();
  const { skills } = loaderData;

  const tutorials = (skills as SkillData[]).flatMap((skill) =>
    skill.referencesMeta
      .filter((ref) => ref.type === "tutorial")
      .map((ref) => ({ ...ref, skillName: skill.name })),
  );

  return (
    <SkillsLayout>
      <main className="overflow-y-auto bg-white dark:bg-[#0a0a0a]">
        <div className="max-w-4xl mx-auto px-6 lg:px-10 py-10 pb-24">
          {/* Page heading */}
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white mb-4">
            Documentation
          </h1>
          <p className="text-gray-500 dark:text-gray-400 leading-relaxed mb-6 max-w-2xl">
            Everything you need to build with Editframe — skills for AI agents,
            documentation for developers, from the same source.
          </p>

          {/* Transparency notice */}
          <div className="border-l-2 border-blue-800 dark:border-blue-400 pl-4 mb-10 py-1">
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              <span className="font-semibold text-gray-900 dark:text-white">
                Transparency
              </span>{" "}
              — This documentation is authored as agent skills. What you see here
              is the exact content your AI agent reads — same source, same truth.
            </p>
          </div>

          {/* Skills */}
          <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white mb-4 pb-2 border-b border-black/10 dark:border-white/10">
            Skills
          </h2>
          <div className="grid sm:grid-cols-2 gap-3 mb-12">
            {(skills as SkillData[]).map((skill) => {
              const typeCounts = getTypeCounts(skill.referencesMeta);
              return (
                <Link
                  key={skill.name}
                  to={`/skills/${skill.name}`}
                  className="group block p-4 border border-gray-200 dark:border-gray-700 rounded-md hover:border-blue-600/40 dark:hover:border-blue-400/40 hover:bg-blue-600/[0.02] dark:hover:bg-blue-500/[0.05] transition-colors"
                >
                  <div className="flex items-center gap-2 mb-2 min-w-0">
                    <span className="font-bold text-base text-gray-900 dark:text-white tracking-tight">
                      {skill.name
                        .replace(/-/g, " ")
                        .replace(/\b\w/g, (c) => c.toUpperCase())}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500 font-mono ml-auto flex-shrink-0">
                      {skill.referenceCount}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-3 line-clamp-2">
                    {skill.description}
                  </p>
                  {typeCounts.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {typeCounts.map((tc) => (
                        <span
                          key={tc.type}
                          className={clsx(
                            "inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider leading-none rounded-sm",
                            TYPE_BADGE_STYLES[tc.type] ||
                              TYPE_BADGE_STYLES.reference,
                          )}
                        >
                          {tc.count} {tc.count === 1 ? tc.label.replace(/s$/, "") : tc.label}
                        </span>
                      ))}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Tutorials */}
          {tutorials.length > 0 && (
            <>
              <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white mb-2 pb-2 border-b border-black/10 dark:border-white/10">
                Getting Started
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Step-by-step tutorials to get you building with Editframe.
              </p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-12">
                {tutorials.map((tutorial) => (
                  <Link
                    key={`${tutorial.skillName}-${tutorial.name}`}
                    to={`/skills/${tutorial.skillName}/${tutorial.name}`}
                    className="group block p-3 border border-gray-200 dark:border-gray-700 rounded-md hover:border-blue-600/40 dark:hover:border-blue-400/40 hover:bg-blue-600/[0.02] dark:hover:bg-blue-500/[0.05] transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                        {tutorial.skillName.replace(/-/g, " ")}
                      </span>
                      <TypeBadge type="tutorial" />
                    </div>
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                      {tutorial.title}
                    </h3>
                    {tutorial.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2">
                        {tutorial.description}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            </>
          )}

          {/* Installation */}
          <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white mb-4 pb-2 border-b border-black/10 dark:border-white/10">
            Installation
          </h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                Cursor
              </h3>
              <pre className="bg-[#1a1a1a] border border-black/10 dark:border-white/10 overflow-x-auto p-5 text-sm leading-relaxed rounded-md">
                <code className="text-white">{`cp -r skills/elements-composition .cursor/skills/
cp -r skills/react-composition .cursor/skills/
cp -r skills/motion-design .cursor/skills/
cp -r skills/brand-video-generator .cursor/skills/`}</code>
              </pre>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                Claude Code
              </h3>
              <pre className="bg-[#1a1a1a] border border-black/10 dark:border-white/10 overflow-x-auto p-5 text-sm leading-relaxed rounded-md">
                <code className="text-white">
                  /plugin marketplace add editframe/skills
                </code>
              </pre>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                Manual
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                Copy the skill folders to your agent's skills directory. Each
                skill includes a SKILL.md file and references/ directory with
                detailed documentation.
              </p>
            </div>
          </div>
        </div>
      </main>
    </SkillsLayout>
  );
}
