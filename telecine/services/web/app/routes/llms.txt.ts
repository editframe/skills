import type { LoaderFunction } from "react-router";
import { getSkillCatalog, getSkillReferencesMeta } from "~/utils/skills.server";

const BASE_URL = "https://editframe.com";

export const loader: LoaderFunction = () => {
  const skills = getSkillCatalog();

  const lines: string[] = [
    "# Editframe",
    "",
    "> Build video with code. HTML + CSS compositions with scripting and React support. Instant preview, hyperscale cloud rendering.",
    "",
    "Editframe lets developers create and render videos programmatically using HTML, CSS, and JavaScript. Compositions are defined as web components or React components, previewed instantly in the browser, and rendered to MP4 in the cloud.",
    "",
  ];

  for (const skill of skills) {
    lines.push(`## ${skill.title}`);
    lines.push("");
    lines.push(
      `- [${skill.title}](${BASE_URL}/skills/${skill.name}.md): ${skill.description}`,
    );

    const refs = getSkillReferencesMeta(skill.name).filter(
      (r) => !r.name.includes("~"),
    );
    for (const ref of refs) {
      const url = `${BASE_URL}/skills/${skill.name}/${ref.name}.md`;
      const desc = ref.description ? `: ${ref.description}` : "";
      lines.push(`- [${ref.title}](${url})${desc}`);
    }

    lines.push("");
  }

  const content = lines.join("\n");

  return new Response(content, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
};
