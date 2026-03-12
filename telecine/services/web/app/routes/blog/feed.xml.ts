import type { LoaderFunction } from "react-router";
import { getAllBlogsContent } from "~/utils/doc.server";
import { getAuthor } from "~/content/authors";

const SITE_URL = "https://editframe.com";
const FEED_TITLE = "Editframe Blog";
const FEED_DESCRIPTION =
  "Thoughts on programmatic video, developer tooling, and building with Editframe.";

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export const loader: LoaderFunction = async () => {
  const posts = await getAllBlogsContent();

  const items = posts
    .map((post) => {
      const author = getAuthor(post.author);
      const pubDate = new Date(post.date).toUTCString();
      const link = `${SITE_URL}/blog/${post.slug}`;
      const image = post.coverImage
        ? `${SITE_URL}${post.coverImage}`
        : undefined;

      return `
    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <description>${escapeXml(post.description)}</description>
      <author>${escapeXml(author.name)}</author>
      <pubDate>${pubDate}</pubDate>
      ${post.tags.map((t) => `<category>${escapeXml(t)}</category>`).join("\n      ")}
      ${image ? `<enclosure url="${image}" type="image/jpeg" length="0" />` : ""}
    </item>`;
    })
    .join("");

  const lastBuildDate =
    posts[0] != null ? new Date(posts[0].date).toUTCString() : new Date().toUTCString();

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(FEED_TITLE)}</title>
    <link>${SITE_URL}/blog</link>
    <description>${escapeXml(FEED_DESCRIPTION)}</description>
    <language>en-us</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <atom:link href="${SITE_URL}/blog/feed.xml" rel="self" type="application/rss+xml" />
    ${items}
  </channel>
</rss>`;

  return new Response(rss, {
    status: 200,
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
};
