import type { LoaderFunction } from "react-router";
import { getSkillContent } from "~/utils/skills.server";

export const loader: LoaderFunction = ({ params }) => {
  const skillName = params.skill;

  if (!skillName) {
    throw new Response("Not Found", { status: 404 });
  }

  const skillContent = getSkillContent(skillName);
  if (!skillContent) {
    throw new Response("Not Found", { status: 404 });
  }

  // Rewrite relative references/foo.md links to absolute /skills/:skill/foo.md
  const content = skillContent.content.replace(
    /\[references\/([^\]]+\.md)\]\(references\/([^)]+\.md)\)/g,
    `[$1](/skills/${skillName}/$2)`,
  );

  return new Response(content, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
};
