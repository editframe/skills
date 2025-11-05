import type { FC } from "react";
import "~/styles/docs.css";
import type { DocsMenuItem } from "~/utils/fs.server";
import { NavLink } from "react-router";
import clsx from "clsx";
export const Menu: FC<{ menu: DocsMenuItem[]; className?: string }> = ({
  menu,
  className,
}) => {
  const navigation = menu.map((category) => {
    const menuCategoryType = category.hasContent
      ? category.children.length > 0
        ? "linkAndDetails"
        : "link"
      : "details";
    if (menuCategoryType === "linkAndDetails") {
      return {
        title: category.attrs.title,
        slug: category.slug,
        links: category.children.map((child) => ({
          title: child.attrs.title,
          href: child.slug,
        })),
      };
    }
    return {
      title: category.attrs.title,
      slug: category.slug,
      links: [],
    };
  });

  return menu ? (
    <nav className={clsx("text-base lg:text-sm", className)}>
      <ul className="space-y-9">
        {navigation.map((section) => (
          <li key={section?.title}>
            {section?.slug && (
              <NavLink
                to={section.slug as string}
                className={({ isActive }) =>
                  clsx(
                    "font-display font-medium ",
                    isActive
                      ? "font-semibold text-martinique-500 "
                      : "text-slate-900 dark:text-white",
                  )
                }
              >
                {section.title}
              </NavLink>
            )}
            <ul className="mt-2 space-y-2 border-l-2 border-slate-100 lg:mt-4 lg:space-y-4 lg:border-slate-200 dark:border-slate-800">
              {section?.links.map((link) => (
                <li key={link.href} className="relative">
                  <NavLink
                    to={link.href as string}
                    className={({ isActive }) =>
                      clsx(
                        "block cursor-pointer w-full pl-3.5 before:pointer-events-none before:absolute before:-left-1 before:top-1/2 before:h-1.5 before:w-1.5 before:-translate-y-1/2 before:rounded-full",
                        isActive
                          ? "font-semibold text-martinique-500 before:bg-martinique-500"
                          : "text-slate-500 before:hidden before:bg-slate-300 hover:text-slate-600 hover:before:block dark:text-slate-400 dark:before:bg-slate-700 dark:hover:text-slate-300",
                      )
                    }
                  >
                    {link.title}
                  </NavLink>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </nav>
  ) : (
    <div className="bold text-gray-300">Failed to load menu</div>
  );
};
