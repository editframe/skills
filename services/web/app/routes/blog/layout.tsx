import { Outlet } from "react-router";
import type { MetaFunction } from "react-router";
import { MarketingLayout } from "~/components/layouts/MarketingLayout";

export const meta: MetaFunction = () => {
  return [
    { title: "Blog | Editframe" },
    {
      name: "description",
      content:
        "Thoughts on programmatic video, developer tooling, and building with Editframe.",
    },
  ];
};

export default function BlogLayout() {
  return (
    <MarketingLayout>
      <Outlet />
    </MarketingLayout>
  );
}
