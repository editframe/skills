import type { LoaderFunction } from "react-router";
import {
  getSkillCatalog,
  getSkillContent,
  getSkillReferencesMeta,
  getSkillReference,
} from "~/utils/skills.server";

export const loader: LoaderFunction = () => {
  const skills = getSkillCatalog();

  const sections: string[] = [
    "# Editframe Developer Documentation",
    "",
    "> Build video with code. HTML + CSS compositions with scripting and React support. Instant preview, hyperscale rendering.",
    "",
    "Source: https://editframe.com/skills",
    "",
    "---",
    "",
  ];

  for (const skill of skills) {
    const skillContent = getSkillContent(skill.name);
    if (!skillContent) continue;

    sections.push(`## ${skillContent.frontmatter.title || skill.title}`);
    sections.push("");
    sections.push(skillContent.content.trim());
    sections.push("");

    const refsMeta = getSkillReferencesMeta(skill.name);
    // Only top-level refs (no section refs — those have ~ in name)
    const topLevelRefs = refsMeta.filter((r) => !r.name.includes("~"));

    for (const refMeta of topLevelRefs) {
      const refContent = getSkillReference(skill.name, refMeta.name);
      if (!refContent) continue;

      // Strip frontmatter from reference content
      const body = refContent.replace(/^---[\s\S]*?---\n+/, "").trim();
      if (!body) continue;

      sections.push(`### ${refMeta.title}`);
      sections.push("");
      sections.push(body);
      sections.push("");
    }

    sections.push("---");
    sections.push("");
  }

  const content = sections.join("\n");

  return new Response(content, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
};
