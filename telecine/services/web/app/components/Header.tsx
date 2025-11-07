import { Dialog } from "@headlessui/react";
import { CheckCircle, X, List } from "@phosphor-icons/react";
import { useState } from "react";
import { Link } from "~/components/Link";
import { Avatar } from "./Avatar";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { CaretDown, Briefcase } from "@phosphor-icons/react";
import { useFetcher, useSearchParams } from "react-router";
import { EditframeLogo } from "./EditframeLogo";
import clsx from "clsx";
import { useTheme } from "~/hooks/useTheme";
import { ThemeToggle } from "~/components/ThemeToggle";

const OrgSelector = ({
  orgs,
}: { orgs: { id: string; display_name: string }[] }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const orgId = searchParams.get("org");
  const currentOrg = orgs.find((org) => org.id === orgId);

  const fetcher = useFetcher();

  return (
    <div className="p-1">
      <Menu>
        <MenuButton className={clsx(
          "inline-flex items-center text-xs px-2 py-1 gap-2 border rounded-sm transition-colors",
          "bg-white dark:bg-slate-800",
          "border-slate-300 dark:border-slate-600",
          "text-slate-700 dark:text-slate-300",
          "hover:bg-slate-50 dark:hover:bg-slate-700"
        )}>
          <span className="truncate max-w-[120px] sm:max-w-none">{currentOrg?.display_name}</span>
          <CaretDown className="h-4 w-4 flex-shrink-0 text-slate-500 dark:text-slate-400" weight="fill" />
        </MenuButton>
        <MenuItems
          anchor="bottom start"
          className={clsx(
            "w-52 origin-top-right rounded-sm border transition duration-100 ease-out [--anchor-gap:var(--spacing-1)] focus:outline-none data-[closed]:scale-95 data-[closed]:opacity-0",
            "bg-white dark:bg-slate-800",
            "border-slate-300 dark:border-slate-700",
            "shadow-lg z-50"
          )}
        >
          {orgs.map((org) => (
            <MenuItem key={org.id}>
              <button
                type="submit"
                className={clsx(
                  "group text-xs flex w-full items-center gap-2 py-1.5 px-3 transition-colors",
                  "text-slate-700 dark:text-slate-300",
                  "hover:bg-slate-100 dark:hover:bg-slate-700",
                  "data-[focus]:bg-slate-100 dark:data-[focus]:bg-slate-700"
                )}
                onClick={async () => {
                  fetcher.submit(
                    { id: org.id },
                    {
                      method: "POST",
                      action: "/org/default",
                      encType: "application/json",
                    },
                  );
                  setSearchParams({ org: org.id });
                }}
              >
                {org.id === currentOrg?.id ? (
                  <CheckCircle className="h-3 w-3 text-blue-600 dark:text-blue-400" weight="fill" />
                ) : (
                  <Briefcase className="h-3 w-3 text-slate-400 dark:text-slate-500" weight="regular" />
                )}
                <span className="truncate">{org.display_name}</span>
              </button>
            </MenuItem>
          ))}
        </MenuItems>
      </Menu>
    </div>
  );
};

interface HeaderProps {
  orgs: { id: string; display_name: string }[];
  email?: string;
  className?: string;
  admin?: boolean;
  onMobileNavToggle?: () => void;
}

export const Header = ({ orgs, email, className, admin, onMobileNavToggle }: HeaderProps) => {
  useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className={clsx(
      "px-3 sm:px-4 lg:px-6 py-2.5 border-b transition-all relative backdrop-blur-sm z-50",
      "bg-white/95 dark:bg-slate-900/95",
      "border-slate-300/75 dark:border-slate-700/75",
      "shadow-[0_1px_2px_0_rgb(0_0_0_/_0.08)] dark:shadow-[0_1px_2px_0_rgb(0_0_0_/_0.4)]",
      "before:absolute before:inset-0 before:bg-gradient-to-r before:from-blue-50/15 before:via-transparent before:to-transparent",
      "dark:before:from-blue-950/12 dark:before:via-transparent dark:before:to-transparent",
      "before:pointer-events-none",
      className
    )}>
      <div className="mx-auto flex w-full items-center justify-between gap-2.5">
        <div className="flex flex-1 items-center gap-2.5 min-w-0">
          {/* Mobile navigation button */}
          {onMobileNavToggle && (
            <button
              type="button"
              className={clsx(
                "lg:hidden p-2 rounded-md transition-colors flex-shrink-0",
                "bg-white dark:bg-slate-800",
                "border border-slate-300 dark:border-slate-700",
                "text-slate-700 dark:text-slate-300",
                "hover:bg-slate-50 dark:hover:bg-slate-700"
              )}
              onClick={onMobileNavToggle}
              aria-label="Toggle navigation"
            >
              <List className="h-5 w-5" weight="bold" />
            </button>
          )}
          <Link
            to={admin ? "/admin" : "/welcome"}
            className="flex items-center flex-shrink-0"
          >
            {EditframeLogo()}
          </Link>
          {admin && (
            <span className={clsx(
              "text-sm hidden sm:inline transition-colors",
              "text-slate-900 dark:text-white"
            )}>
              Back office
            </span>
          )}
          <div className="flex-1 min-w-0">
            <OrgSelector orgs={orgs} />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 flex-shrink-0">
          <ThemeToggle />
          {email && <Avatar email={email} />}
        </div>
      </div>
      <Dialog
        as="div"
        className="lg:hidden"
        open={mobileMenuOpen}
        onClose={setMobileMenuOpen}
      >
        <div className="fixed inset-0 z-50" />
        <Dialog.Panel className={clsx(
          "fixed inset-y-0 left-0 z-50 w-full overflow-y-auto px-4 pb-6 sm:max-w-sm sm:px-6 sm:ring-1 transition-colors",
          "bg-white dark:bg-slate-900",
          "ring-slate-200 dark:ring-slate-800"
        )}>
          <div className="-ml-0.5 flex h-16 items-center gap-x-6">
            <button
              type="button"
              className={clsx(
                "-m-2.5 p-2.5 transition-colors",
                "text-slate-700 dark:text-slate-300",
                "hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md"
              )}
              onClick={() => setMobileMenuOpen(false)}
            >
              <span className="sr-only">Close menu</span>
              <X className="h-6 w-6" aria-hidden="true" weight="bold" />
            </button>
            <div className="-ml-0.5">
              <a href="#" className="-m-1.5 block p-1.5">
                <span className="sr-only"> Editframe</span>
                <svg
                  className={clsx(
                    "my-4 mr-4 h-9 w-9 md:my-0 transition-colors",
                    "text-slate-900 dark:text-white"
                  )}
                  viewBox="0 0 512 512"
                >
                  <path
                    d="M144 48v272a48 48 0 0048 48h272"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="32"
                  />
                  <path
                    d="M368 304V192a48 48 0 00-48-48H208M368 368v96M144 144H48"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="32"
                  />
                </svg>
              </a>
            </div>
          </div>
          <div className={clsx("pt-4 pb-4 border-t", "border-slate-200 dark:border-slate-800")}>
            <div className="px-4 space-y-1">
              <div className="flex items-center px-3 py-2.5">
                <ThemeToggle className="text-slate-700 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-300 dark:hover:text-slate-100 dark:hover:bg-slate-800" />
                <span className={clsx("ml-3 text-base font-medium", "text-slate-600 dark:text-slate-400")}>Theme</span>
              </div>
            </div>
          </div>
        </Dialog.Panel>
      </Dialog>
    </header>
  );
};
