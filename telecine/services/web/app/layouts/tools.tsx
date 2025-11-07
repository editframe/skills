import { MarketingLayout } from "~/components/layouts/MarketingLayout";
import { Playground } from "~/components/marketing/Playground";
import { Hero } from "~/components/marketing/Hero";
import { themeClasses } from "~/utils/theme-classes";
import clsx from "clsx";

const navigation = [
  { name: "Get Started", href: "/welcome", primary: true },
  { name: "Documentation", href: "/docs", secondary: false },
];
export const Layout = ({
  playground,
  title,
  description,
  content,
}: {
  playground: { code: string; presetCode: string };
  title: string;
  description: string;
  content: string;
}) => {
  return (
    <MarketingLayout containerClassName="pt-20 pb-8">
      <div className="mb-8">
        <Hero
          header={title}
          description={description}
          navigation={navigation}
        />
      </div>
      <div className="mt-8 lg:mt-14">
        <Playground
          presetCode={playground.presetCode}
          code={playground.code}
        />
      </div>
      <div className="mt-4">
        <div
          // biome-ignore lint/security/noDangerouslySetInnerHtmlWithChildren: <explanation>
          dangerouslySetInnerHTML={{
            __html: content,
          }}
          className={clsx(
            "text-xl flex flex-col gap-y-8 leading-[1.4] mt-3 ml-1 text-left mb-6",
            themeClasses.pageTextSecondary
          )}
        ></div>
      </div>
    </MarketingLayout>
  );
};
