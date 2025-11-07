import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { CaretDown } from "@phosphor-icons/react";
import { Link } from "react-router";
import clsx from "clsx";

export const Avatar = ({ email }: { email: string }) => {
  return (
    <Menu>
      <MenuButton className={clsx(
        "inline-flex w-full justify-center gap-x-1.5 text-sm font-medium transition-colors",
        "text-slate-700 dark:text-slate-300",
        "hover:text-slate-900 dark:hover:text-white"
      )}>
        Account
        <CaretDown
          className={clsx(
            "-mr-1 h-5 w-5 transition-colors",
            "text-slate-500 dark:text-slate-400"
          )}
          aria-hidden="true"
          weight="fill"
        />
      </MenuButton>

      <MenuItems
        anchor="bottom end"
        className={clsx(
          "w-56 origin-top-right rounded-md shadow-lg focus:outline-none transition-colors",
          "bg-white dark:bg-slate-800",
          "ring-1 ring-slate-300 dark:ring-slate-700",
          "z-50"
        )}
      >
          <div className="px-4 py-3">
            <p className={clsx(
              "text-sm transition-colors",
              "text-slate-600 dark:text-slate-400"
            )}>
              Signed in as
            </p>
            <p className={clsx(
              "truncate text-sm font-medium transition-colors",
              "text-slate-900 dark:text-white"
            )}>
              {email}
            </p>
          </div>
          <div className={clsx(
            "py-1 w-full mb-1 transition-colors",
            "hover:bg-slate-100 dark:hover:bg-slate-700"
          )}>
            <MenuItem>
              <Link
                to={"/settings"}
                className={clsx(
                  "block px-4 py-2 text-sm transition-colors",
                  "text-slate-700 dark:text-slate-300",
                  "hover:text-slate-900 dark:hover:text-white",
                  "data-[focus]:bg-slate-100 dark:data-[focus]:bg-slate-700"
                )}
              >
                Account settings
              </Link>
            </MenuItem>
          </div>
          <div className={clsx(
            "py-1 w-full mb-1 transition-colors",
            "hover:bg-slate-100 dark:hover:bg-slate-700"
          )}>
            <MenuItem>
              <Link
                to={"/docs"}
                className={clsx(
                  "block px-4 py-2 text-sm transition-colors",
                  "text-slate-700 dark:text-slate-300",
                  "hover:text-slate-900 dark:hover:text-white",
                  "data-[focus]:bg-slate-100 dark:data-[focus]:bg-slate-700"
                )}
              >
                API Documentation
              </Link>
            </MenuItem>
          </div>
          <div className={clsx(
            "py-1 w-full transition-colors",
            "hover:bg-slate-100 dark:hover:bg-slate-700"
          )}>
            <MenuItem>
              <Link
                to={"/auth/logout"}
                className={clsx(
                  "block w-full px-4 py-2 text-left text-sm transition-colors",
                  "text-slate-700 dark:text-slate-300",
                  "hover:text-slate-900 dark:hover:text-white",
                  "data-[focus]:bg-slate-100 dark:data-[focus]:bg-slate-700"
                )}
              >
                Sign out
              </Link>
            </MenuItem>
          </div>
        </MenuItems>
    </Menu>
  );
};
