import { Outlet } from "react-router";
import type { MetaFunction } from "react-router";
import { DocsLayout } from "~/components/layouts/DocsLayout";
import "~/styles/docs.css";

export const meta: MetaFunction = () => {
  return [
    { title: "Guides | Editframe" },
    {
      name: "description",
      content: "Guides for using Editframe",
    },
  ];
};

export default function GuideLayout() {
  return (
    <DocsLayout>
      <main>
        <Outlet />
      </main>
    </DocsLayout>
  );
}
