import { NavLink } from "./NavLink";

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
        <h1 className="text-[#646CFF] dark:text-[#646cff]  text-5xl font-bold tracking-tight leading-tight">
          {header}
        </h1>
        <p className="text-5xl mb-2  tracking-tighter leading-[1] my-0 text-[#3c3c43] dark:text-white font-bold text-left lg:m-0">
          {subheader}
        </p>
        <p className="text-xl  text-[#3C3C43] leading-[1.4] text-opacity-[78%] mt-3 ml-1 text-left  dark:text-gray-400">
          {description}
        </p>
        <div className="flex justify-center lg:justify-start flex-wrap lg:flex-nowrap lg:items-start items-center mt-[1.6rem] gap-2">
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
