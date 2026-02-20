// app/routes/sitemap.xml.tsx

import type { LoaderFunction } from "react-router";
import {
  getAllChangelogsContent,
  getAllGuidesContent,
  getAllBlogsContent,
} from "~/utils/doc.server";
import { getSkillNames, getSkillReferencesMeta } from "~/utils/skills.server";

export const siteUrl = 'https://www.editframe.com';

// Tools array - extracted from tools_._index.tsx
const tools = [
  { href: '/tools/add-music-to-image' },
  { href: '/tools/add-music-to-gif' },
  { href: '/tools/video-editor' },
  { href: '/tools/add-waveform-to-video' },
  { href: '/tools/crop-video' },
  { href: '/tools/meme-maker' },
  { href: '/tools/image-to-video' },
  { href: '/tools/resize-video' },
  { href: '/tools/add-music-to-video' },
  { href: '/tools/add-image-to-video' },
  { href: '/tools/promote-podcasts-on-social-media' },
  { href: '/tools/share-audio-to-social-media' },
  { href: '/tools/add-text-to-video' },
  { href: '/tools/apply-template-to-video' },
  { href: '/tools/mute-video' },
  { href: '/tools/cut-video' },
  { href: '/tools/watermark-video' },
  { href: '/tools/logo-video-intro-maker' },
  { href: '/tools/upload-music-to-youtube' },
  { href: '/tools/slideshow-maker' },
  { href: '/tools/collage-maker' },
  { href: '/tools/merge-video' },
  { href: '/tools/split-screen-video-maker' },
  { href: '/tools/video-overlay-online' },
  { href: '/tools/animate-objects' },
  { href: '/tools/combine-video-and-images' },
  { href: '/tools/repeat-video' },
  { href: '/tools/add-subtitles-to-video' },
];

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
  // Fetch all content
  const [changelogs, guides, blogs] = await Promise.all([
    getAllChangelogsContent(),
    getAllGuidesContent(),
    getAllBlogsContent(),
  ]);

  // Get skills
  const skills = getSkillNames();

  // Build sitemap entries
  const urlEntries: string[] = [];

  // Static index pages
  urlEntries.push(generateUrlEntry('/', undefined, 'daily', '1.0')); // Home page
  urlEntries.push(generateUrlEntry('/skills', undefined, 'weekly', '0.9')); // Skills/docs index
  urlEntries.push(generateUrlEntry('/guides', undefined, 'weekly', '0.9')); // Guides index
  urlEntries.push(generateUrlEntry('/blog', undefined, 'weekly', '0.9')); // Blog index
  urlEntries.push(generateUrlEntry('/tools', undefined, 'weekly', '0.9')); // Tools index

  // Skills pages
  for (const skill of skills) {
    // Add skill overview page
    urlEntries.push(generateUrlEntry(`/skills/${skill.name}`, undefined, 'weekly', '0.8'));
    
    // Add skill reference pages
    const references = getSkillReferencesMeta(skill.name);
    for (const reference of references) {
      urlEntries.push(generateUrlEntry(`/skills/${skill.name}/${reference.name}`, undefined, 'weekly', '0.7'));
    }
  }

  // Guides pages
  for (const guide of guides) {
    urlEntries.push(generateUrlEntry(guide.slug, guide.publishedDate, 'weekly', '0.7'));
  }

  // Blog posts
  for (const blog of blogs) {
    urlEntries.push(generateUrlEntry(blog.slug, blog.publishedDate, 'weekly', '0.7'));
  }

  // Changelogs (fixed: use slug directly, it already includes /changelogs/)
  for (const changelog of changelogs) {
    urlEntries.push(generateUrlEntry(changelog.slug, changelog.publishedDate, 'weekly', '0.7'));
  }

  // Tools pages
  for (const tool of tools) {
    urlEntries.push(generateUrlEntry(tool.href, undefined, 'monthly', '0.8'));
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

