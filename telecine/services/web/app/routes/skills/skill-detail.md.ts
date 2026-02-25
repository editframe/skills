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

  return new Response(skillContent.content, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
};
