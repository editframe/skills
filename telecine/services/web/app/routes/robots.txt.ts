import type { LoaderFunction } from "react-router";

export const loader: LoaderFunction = () => {
  const content = `User-agent: *
Allow: /

Sitemap: https://www.editframe.com/sitemap.xml
`;

  return new Response(content, {
    status: 200,
    headers: {
      "Content-Type": "text/plain",
    },
  });
};
