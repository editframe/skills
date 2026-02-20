import { Link } from "react-router";
import type { Route } from "./+types/catalog";
import type { SkillReference } from "~/utils/skills.server";
import { getSkillCatalog, getSkillNames } from "~/utils/skills.server";
import { SkillsLayout } from "~/components/skills/SkillsLayout";
import { SkillPicker } from "~/components/skills/SkillsSidebar";
import { MobileBreadcrumbBar } from "~/components/skills/MobileBreadcrumbBar";
import { useTheme } from "~/hooks/useTheme";

export const meta = () => {
  return [
    { title: "Documentation - Editframe" },
    {
      name: "description",
      content:
        "API references, tutorials, and guides for building video compositions, editor UIs, and integrations with Editframe.",
    },
  ];
};

export const loader = async () => {
  const skills = getSkillCatalog();
  const allSkills = getSkillNames();
  return { skills, allSkills };
};

interface SkillData {
  name: string;
  title: string;
  description: string;
  referenceCount: number;
  referencesMeta: SkillReference[];
}

export default function SkillsCatalog({ loaderData }: Route.ComponentProps) {
  useTheme();
  const { skills, allSkills } = loaderData;

  const tutorials = (skills as SkillData[]).flatMap((skill) =>
    skill.referencesMeta
      .filter((ref) => ref.type === "tutorial")
      .map((ref) => ({ ...ref, skillName: skill.name, skillTitle: skill.title })),
  );

  return (
    <SkillsLayout allSkills={allSkills}>
      <div className="grid grid-cols-1 lg:grid-cols-[180px_1fr] overflow-hidden">
        <SkillPicker allSkills={allSkills} currentSkill={null} />

        <main className="overflow-y-auto bg-white dark:bg-[#0a0a0a]">
          <MobileBreadcrumbBar
            allSkills={allSkills}
            currentSkill={null}
            currentSkillTitle={null}
            currentReference={null}
            currentReferenceTitle={null}
          />
          <div className="max-w-4xl mx-auto px-6 lg:px-10 py-10 pb-24">
            {/* Page heading */}
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white mb-4">
              Documentation
            </h1>
            <p className="text-gray-500 dark:text-gray-400 leading-relaxed mb-10 max-w-2xl">
              Everything you need to build with Editframe.
            </p>

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
                      <div className="mb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                          {tutorial.skillTitle}
                        </span>
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
            <pre className="bg-[#1a1a1a] border border-black/10 dark:border-white/10 overflow-x-auto p-5 text-sm leading-relaxed rounded-md">
              <code className="text-white">npx ai-agent-skills install editframe/skills --agent cursor</code>
            </pre>
          </div>
        </main>
      </div>
    </SkillsLayout>
  );
}
