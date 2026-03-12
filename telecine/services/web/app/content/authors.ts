import type { AuthorMap } from "~/utils/blog-schema";

export const authors: AuthorMap = {
  "editframe-team": {
    name: "Editframe Team",
    bio: "The team behind Editframe, building the future of programmatic video.",
    avatar: "/images/authors/editframe-team.png",
    twitter: "editframe",
    github: "editframe",
  },
};

export function getAuthor(slug: string) {
  return authors[slug] ?? authors["editframe-team"];
}
