// app/routes/sitemap.xml.tsx

import type { LoaderFunction } from "react-router";
import {
  getAllChangelogsContent,
  getAllGuidesContent,
  getAllBlogsContent,
} from "~/utils/doc.server";
import { buildDocsMenu } from "~/utils/fs.server";
import type { DocsMenuItem } from "~/utils/fs.server";

export const siteUrl = 'https://www.editframe.com';

// Helper function to recursively extract all slugs from docs menu structure
function extractDocsSlugs(menu: DocsMenuItem[]): string[] {
  const slugs: string[] = [];
  for (const item of menu) {
    if (item.slug && item.hasContent) {
      slugs.push(item.slug);
    }
    if (item.children && item.children.length > 0) {
      slugs.push(...extractDocsSlugs(item.children));
    }
  }
  return slugs;
}

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

// Helper function to generate URL entry
function generateUrlEntry(
  slug: string,
  lastmod?: string,
  changefreq: string = 'weekly',
  priority: string = '0.7'
): string {
  return `
        <url>
          <loc>${siteUrl}${slug}</loc>
          ${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}
          <changefreq>${changefreq}</changefreq>
          <priority>${priority}</priority>
        </url>`;
}

export const loader: LoaderFunction = async () => {
  // Fetch all content
  const [changelogs, guides, blogs, docsMenu] = await Promise.all([
    getAllChangelogsContent(),
    getAllGuidesContent(),
    getAllBlogsContent(),
    buildDocsMenu(),
  ]);

  // Extract docs slugs
  const docsSlugs = extractDocsSlugs(docsMenu);

  // Build sitemap entries
  const urlEntries: string[] = [];

  // Static index pages
  urlEntries.push(generateUrlEntry('/', undefined, 'daily', '1.0')); // Home page
  urlEntries.push(generateUrlEntry('/docs', undefined, 'weekly', '0.9')); // Docs index
  urlEntries.push(generateUrlEntry('/guides', undefined, 'weekly', '0.9')); // Guides index
  urlEntries.push(generateUrlEntry('/blog', undefined, 'weekly', '0.9')); // Blog index
  urlEntries.push(generateUrlEntry('/tools', undefined, 'weekly', '0.9')); // Tools index

  // Docs pages
  for (const slug of docsSlugs) {
    urlEntries.push(generateUrlEntry(slug, undefined, 'weekly', '0.7'));
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

