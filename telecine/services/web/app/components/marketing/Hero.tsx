import { NavLink } from "./NavLink";
import { themeClasses } from "~/utils/theme-classes";
import clsx from "clsx";

const defaultNavigation = [
  { name: "Get Started", href: "/welcome", primary: true, secondary: false },
  { name: "Player", href: "/docs/editor-ui", primary: false, secondary: false },
  {
    name: "Rendering",
    href: "/docs/rendering",
    primary: false,
    secondary: false,
  },
  { name: "Documentation", href: "/docs", secondary: true, primary: false },
];

type NavigationItem = {
  name: string;
  href: string;
  secondary?: boolean;
  primary?: boolean;
};

export const Hero = ({
  description,
  subheader,
  header,
  navigation = defaultNavigation,
}: {
  description?: string;
  subheader?: string;
  header?: string;
  navigation?: NavigationItem[];
}) => {
  return (
    <div className="flex flex-col text-left">
      <div className="w-full xl:w-1/2 lg:w-[70%]">
        {header && (
          <h1
            className={clsx(
              "text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-tight mb-2",
              "text-blue-600 dark:text-blue-400",
            )}
          >
            {header}
          </h1>
        )}
        {subheader && (
          <p
            className={clsx(
              "text-3xl sm:text-4xl lg:text-5xl mb-2 tracking-tighter leading-[1] my-0 font-bold text-left lg:m-0",
              themeClasses.pageText,
            )}
          >
            {subheader}
          </p>
        )}
        {description && (
          <p
            className={clsx(
              "text-lg sm:text-xl leading-[1.4] mt-3 ml-1 text-left",
              themeClasses.pageTextSecondary,
            )}
          >
            {description}
          </p>
        )}
        <div className="flex justify-center lg:justify-start flex-wrap lg:flex-nowrap lg:items-start items-center mt-6 sm:mt-8 gap-2 sm:gap-3">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              label={item.name}
              href={item.href}
              primary={item.primary || false}
              secondary={item.secondary || false}
            />
          ))}
        </div>
      </div>
      <div></div>
    </div>
  );
};
