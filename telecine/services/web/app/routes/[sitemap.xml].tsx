// app/routes/sitemap[.]xml.tsx

import type { LoaderFunction } from "react-router";
import { getAllChangelogsContent } from "~/utils/doc.server";

export const loader: LoaderFunction = async () => {
  const changelogs = await getAllChangelogsContent();
  const allContent = changelogs.map((item) => ({ ...item, slug: `/changelog/${item.slug}` }));

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      ${allContent
        .map(
          (content) => `
        <url>
          <loc>${siteUrl}${content.slug}</loc>
          <lastmod>${content.publishedDate}</lastmod>
          <changefreq>weekly</changefreq>
          <priority>0.7</priority>
        </url>
      `,
        )
        .join("")}
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

export const siteUrl = "https://www.editframe.com";
