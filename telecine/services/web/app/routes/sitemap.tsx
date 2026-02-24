// app/routes/sitemap.xml.tsx

import type { LoaderFunction } from "react-router";
import { getSkillNames, getSkillReferencesMeta } from "~/utils/skills.server";

export const siteUrl = 'https://editframe.com';

// Helper function to format a date string as YYYY-MM-DD for sitemap lastmod
function formatLastmod(date: string): string {
  const d = new Date(date);
  return d.toISOString().slice(0, 10);
}

// Helper function to generate URL entry
function generateUrlEntry(
  slug: string,
  lastmod?: string,
  changefreq: string = 'weekly',
  priority: string = '0.7'
): string {
  const lastmodValue = lastmod ? formatLastmod(lastmod) : undefined;
  return `
        <url>
          <loc>${siteUrl}${slug}</loc>
          ${lastmodValue ? `<lastmod>${lastmodValue}</lastmod>` : ''}
          <changefreq>${changefreq}</changefreq>
          <priority>${priority}</priority>
        </url>`;
}

export const loader: LoaderFunction = async () => {
  const skills = getSkillNames();

  const urlEntries: string[] = [];

  urlEntries.push(generateUrlEntry('/', undefined, 'daily', '1.0'));
  urlEntries.push(generateUrlEntry('/skills', undefined, 'weekly', '0.9'));

  for (const skill of skills) {
    urlEntries.push(generateUrlEntry(`/skills/${skill.name}`, undefined, 'weekly', '0.8'));
    
    const references = getSkillReferencesMeta(skill.name);
    for (const reference of references) {
      urlEntries.push(generateUrlEntry(`/skills/${skill.name}/${reference.name}`, undefined, 'weekly', '0.7'));
    }
  }

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      ${urlEntries.join('')}
    </urlset>`;

  return new Response(sitemap, {
    status: 200,
    headers: {
      "Content-Type": "application/xml",
      "xml-version": "1.0",
      "encoding": "UTF-8"
    }
  });
};

