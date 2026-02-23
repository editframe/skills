import type { LoaderFunction } from "react-router";

export const loader: LoaderFunction = () => {
  const content = `User-agent: *
Allow: /
Disallow: /api/
Disallow: /hdb/
Disallow: /admin/
Disallow: /resource/
Disallow: /organizations/
Disallow: /settings/
Disallow: /welcome
Disallow: /org/
Disallow: /auth/
Disallow: /ef-sign-url

Sitemap: https://editframe.com/sitemap.xml
`;

  return new Response(content, {
    status: 200,
    headers: {
      "Content-Type": "text/plain",
    },
  });
};
