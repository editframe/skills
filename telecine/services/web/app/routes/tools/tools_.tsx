import { Outlet } from "react-router";
import type { MetaFunction } from "react-router";
import { DocsLayout } from "~/components/layouts/DocsLayout";
import "~/styles/docs.css";

export const meta: MetaFunction = () => {
  return [
    { title: "Tools | Editframe" },
    {
      name: "description",
      content: "Tools for using Editframe",
    },
  ];
};

export default function ToolsLayout() {
  return (
    <DocsLayout>
      <main>
        <Outlet />
      </main>
    </DocsLayout>
  );
}