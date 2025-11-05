import { Footer } from "~/components/marketing/Footer";
import { Header } from "~/components/marketing/Header";
import { Playground } from "~/components/marketing/Playground";
import { useEffect, useState } from "react";
import { Hero } from "~/components/marketing/Hero";

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
  const [isDarkMode, setIsDarkMode] = useState<boolean | null>(null);

  useEffect(() => {
    if (
      localStorage.theme === "dark" ||
      (!("theme" in localStorage) &&
        window.matchMedia("(prefers-color-scheme: dark)").matches)
    ) {
      document.documentElement.classList.add("dark");
      localStorage.theme = "dark";
      setIsDarkMode(true);
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.theme = "light";
      setIsDarkMode(false);
    }

    return () => {};
  }, []);
  if (isDarkMode === null) {
    return null;
  }
  return (
    <div className="dark:bg-[#1b1b1f] bg-white">
      <Header />
      <div className="lg:px-[5.5rem] max-w-6xl mx-auto">
        <div className="px-6 pt-28 pb-8 -mt-14">
          <div className="mb-8">
            <Hero
              header={title}
              description={description}
              navigation={navigation}
            />
          </div>
          <div className="lg:mt-14">
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
              className="text-xl flex flex-col gap-y-8 text-[#3C3C43] leading-[1.4] text-opacity-[78%] mt-3 ml-1 text-left  dark:text-gray-400 mb-6"
            ></div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};
