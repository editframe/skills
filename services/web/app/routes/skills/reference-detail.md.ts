import type { LoaderFunction } from "react-router";
import { getSkillReference, getSkillReferenceSection } from "~/utils/skills.server";

export const loader: LoaderFunction = ({ params }) => {
  const skillName = params.skill;
  const referenceParam = params.reference;

  if (!skillName || !referenceParam) {
    throw new Response("Not Found", { status: 404 });
  }

  // Strip the .md suffix to get the actual reference name
  const refWithoutMd = referenceParam.replace(/\.md$/, "");
  const parts = refWithoutMd.split("~");
  const refName = parts[0]!;
  const sectionSlug = parts[1];

  let content: string | null;
  if (sectionSlug) {
    content = getSkillReferenceSection(skillName, refName, sectionSlug);
  } else {
    content = getSkillReference(skillName, refName);
  }

  if (!content) {
    throw new Response("Not Found", { status: 404 });
  }

  // Strip frontmatter before returning
  const body = content.replace(/^---[\s\S]*?---\n+/, "");

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
};
