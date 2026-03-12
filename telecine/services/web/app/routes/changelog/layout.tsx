import { Outlet } from "react-router";
import type { MetaFunction } from "react-router";
import { MarketingLayout } from "~/components/layouts/MarketingLayout";

export const meta: MetaFunction = () => {
  return [
    { title: "Changelog | Editframe" },
    {
      name: "description",
      content: "What's new in Editframe — product updates, API changes, and improvements.",
    },
  ];
};

export default function ChangelogLayout() {
  return (
    <MarketingLayout>
      <Outlet />
    </MarketingLayout>
  );
}
