import { Link } from "react-router";
import classNames from "classnames";
export const NavLink = ({
  href,
  label,
  primary = false,
  secondary = false,
}: {
  href: string;
  label: string;
  secondary?: boolean;
  primary?: boolean;
}) => (
  <Link
    to={href}
    className={classNames(
      "text-black dark:text-white w-max",
      secondary ? "ring-1 ring-[#646CFF] dark:ring-[#646CFF]" : "",
      primary
        ? "mr-3 block  px-4 py-2  text-xs font-semibold rounded-full text-white bg-[#646CFF] hover:bg-[#646CFF] dark:bg-[#646CFF] dark:hover:bg-[#646cff]"
        : "mr-3  dark:bg-[#3f4650]  text-black px-4 py-2 text-xs text-sm font-semibold rounded-full border border-transparent border-solid focus:border-[#646CFF]  dark:focus:border-[#646CFF]  bg-[#EBEBEF]",
    )}
  >
    {label}
  </Link>
);
