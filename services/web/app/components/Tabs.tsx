import { Link, useLocation } from "react-router";

export const Tabs = ({ tabs }: { tabs: { name: string; link: string }[] }) => {
  const link = useLocation();
  const activeTab = link.pathname;
  return (
    <div className="order-last flex w-full gap-x-8 text-sm font-semibold leading-6 sm:order-none sm:w-auto sm:border-l sm:border-gray-200 sm:pl-6 sm:leading-7">
      {tabs.map((tab) => (
        <Link
          key={tab.link}
          to={tab.link}
          className={`${
            tab.link === activeTab ? "text-martinique-600" : "text-gray-700"
          }`}
        >
          {tab.name}
        </Link>
      ))}
    </div>
  );
};

export default Tabs;
