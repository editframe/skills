import { Outlet } from "react-router";
import type { MetaFunction } from "react-router";
import { DocsLayout } from "~/components/layouts/DocsLayout";
import "~/styles/docs.css";

export const meta: MetaFunction = () => {
  return [
    { title: "Editframe | Blog" },
    {
      name: "description",
      content: "Editframe blog posts.",
    },
  ];
};

export default function BlogLayout() {
  return (
    <DocsLayout>
      <main>
        <Outlet />
      </main>
    </DocsLayout>
  );
}
