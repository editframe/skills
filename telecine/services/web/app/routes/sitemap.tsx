// app/routes/sitemap.xml.tsx

import type { LoaderFunction } from "react-router";
import { getSkillNames, getSkillReferencesMeta } from "~/utils/skills.server";
import { getAllBlogsContent, getAllChangelogsContent } from "~/utils/doc.server";

export const siteUrl = "https://editframe.com";

// Helper function to format a date string as YYYY-MM-DD for sitemap lastmod
function formatLastmod(date: string): string {
  const d = new Date(date);
  return d.toISOString().slice(0, 10);
}

// Helper function to generate URL entry
function generateUrlEntry(
  slug: string,
  lastmod?: string,
  changefreq: string = "weekly",
  priority: string = "0.7",
): string {
  const lastmodValue = lastmod ? formatLastmod(lastmod) : undefined;
  return `
        <url>
          <loc>${siteUrl}${slug}</loc>
          ${lastmodValue ? `<lastmod>${lastmodValue}</lastmod>` : ""}
          <changefreq>${changefreq}</changefreq>
          <priority>${priority}</priority>
        </url>`;
}

export const loader: LoaderFunction = async () => {
  const skills = getSkillNames();
  const [blogs, changelogs] = await Promise.all([
    getAllBlogsContent(),
    getAllChangelogsContent(),
  ]);

  const urlEntries: string[] = [];

  urlEntries.push(generateUrlEntry("/", undefined, "daily", "1.0"));
  urlEntries.push(generateUrlEntry("/blog", undefined, "daily", "0.9"));
  urlEntries.push(generateUrlEntry("/changelog", undefined, "weekly", "0.8"));
  urlEntries.push(generateUrlEntry("/skills", undefined, "weekly", "0.9"));

  for (const post of blogs) {
    urlEntries.push(
      generateUrlEntry(`/blog/${post.slug}`, post.date, "monthly", "0.7"),
    );
  }

  for (const entry of changelogs) {
    urlEntries.push(
      generateUrlEntry(
        `/changelog/${entry.slug}`,
        entry.date,
        "monthly",
        "0.6",
      ),
    );
  }

  for (const skill of skills) {
    urlEntries.push(
      generateUrlEntry(`/skills/${skill.name}`, undefined, "weekly", "0.8"),
    );

    const references = getSkillReferencesMeta(skill.name);
    for (const reference of references) {
      urlEntries.push(
        generateUrlEntry(
          `/skills/${skill.name}/${reference.name}`,
          undefined,
          "weekly",
          "0.7",
        ),
      );
    }
  }

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      ${urlEntries.join("")}
    </urlset>`;

  return new Response(sitemap, {
    status: 200,
    headers: {
      "Content-Type": "application/xml",
      "xml-version": "1.0",
      encoding: "UTF-8",
    },
  });
};
