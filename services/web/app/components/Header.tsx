import { Dialog } from "@headlessui/react";
import {
  Bars3Icon,
  CheckCircleIcon,
  XMarkIcon,
} from "@heroicons/react/20/solid";
import { useState } from "react";
import { Link } from "~/components/Link";
import { Avatar } from "./Avatar";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { ChevronDownIcon, BriefcaseIcon } from "@heroicons/react/20/solid";
import { useFetcher, useSearchParams } from "react-router";
import { EditframeLogo } from "./EditframeLogo";
import clsx from "clsx";

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
        <MenuButton className="inline-flex items-center text-xs px-2 py-1 gap-2 border border-slate-300 rounded-sm text-sm text-slate-700 hover:bg-slate-200">
          <span>{currentOrg?.display_name}</span>
          <ChevronDownIcon className="size-4 fill-slate-400" />
        </MenuButton>
        <MenuItems
          anchor="bottom start"
          className="w-52 origin-top-right rounded-sm border border-slate-300 bg-white transition duration-100 ease-out [--anchor-gap:var(--spacing-1)] focus:outline-none data-[closed]:scale-95 data-[closed]:opacity-0"
        >
          {orgs.map((org) => (
            <MenuItem key={org.id}>
              <button
                type="submit"
                className="data-[focus]:bg-slate-100 group text-xs flex w-full items-center gap-2 py-1.5 px-3 hover:bg-slate-100"
                onClick={async () => {
                  fetcher.submit(
                    { id: org.id },
                    {
                      method: "POST",
                      action: "/organizations/default",
                      encType: "application/json",
                    },
                  );
                  setSearchParams({ org: org.id });
                }}
              >
                {org.id === currentOrg?.id ? (
                  <CheckCircleIcon className="size-3 fill-blue-400" />
                ) : (
                  <BriefcaseIcon className="size-3 fill-slate-400" />
                )}
                {org.display_name}
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
}

export const Header = ({ orgs, email, className, admin }: HeaderProps) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className={clsx("px-2 py-1", className)}>
      <div className="mx-auto flex w-full items-center justify-between">
        <div className="flex flex-1 items-center">
          <button
            type="button"
            className="-m-3 p-3 md:hidden"
            onClick={() => setMobileMenuOpen(true)}
          >
            <span className="sr-only">Open main menu</span>
            <Bars3Icon className="h-5 w-5 text-gray-900" aria-hidden="true" />
          </button>
          <Link
            to={admin ? "/admin" : "/welcome"}
            className="flex items-center"
          >
            {EditframeLogo()}
          </Link>
          {admin && <span className="text-md text-gray-900">Back office</span>}
          <OrgSelector orgs={orgs} />
        </div>
        <div className="flex flex-1 items-center justify-end gap-x-8">
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
        <Dialog.Panel className="fixed inset-y-0 left-0 z-50 w-full overflow-y-auto bg-white px-4 pb-6 sm:max-w-sm sm:px-6 sm:ring-1 sm:ring-gray-900/10">
          <div className="-ml-0.5 flex h-16 items-center gap-x-6">
            <button
              type="button"
              className="-m-2.5 p-2.5 text-gray-700"
              onClick={() => setMobileMenuOpen(false)}
            >
              <span className="sr-only">Close menu</span>
              <XMarkIcon className="h-6 w-6" aria-hidden="true" />
            </button>
            <div className="-ml-0.5">
              <a href="#" className="-m-1.5 block p-1.5">
                <span className="sr-only"> Editframe</span>
                <svg
                  className="my-4 mr-4 h-9 w-9 md:my-0"
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
        </Dialog.Panel>
      </Dialog>
    </header>
  );
};
