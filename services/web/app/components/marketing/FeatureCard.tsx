import { themeClasses } from "~/utils/theme-classes";
import clsx from "clsx";

export const FeatureCard = ({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) => (
  <div className="xl:w-1/3 lg:w-1/2 w-full">
    <div
      className={clsx(
        "block pb-4 h-full rounded-xl border",
        "bg-slate-50 dark:bg-slate-800/50",
        themeClasses.pageBorder,
      )}
    >
      <div className="flex flex-col py-2 px-2 h-full">
        <div
          className={clsx(
            "flex mt-4 ml-4 justify-center items-center w-9 h-9 text-lg rounded-md",
            "bg-slate-200/50 dark:bg-slate-700/50",
          )}
        >
          {icon}
        </div>
        <h2
          className={clsx(
            "text-sm mt-4 ml-3 mb-2 font-semibold break-words",
            themeClasses.pageText,
          )}
        >
          {title}
        </h2>
        <p
          className={clsx(
            "text-xs leading-4 ml-3 font-medium",
            themeClasses.pageTextSecondary,
          )}
        >
          {description}
        </p>
      </div>
    </div>
  </div>
);
