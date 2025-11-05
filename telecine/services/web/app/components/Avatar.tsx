import { Menu, Transition } from "@headlessui/react";
import { ChevronDownIcon } from "@heroicons/react/20/solid";
import { Link } from "react-router";
import classNames from "classnames";

export const Avatar = ({ email }: { email: string }) => {
  return (
    <Menu as="div" className="relative inline-block text-left">
      <div>
        <Menu.Button className="inline-flex w-full justify-center gap-x-1.5 text-sm font-medium  hover:text-gray-900">
          Account
          <ChevronDownIcon
            className="-mr-1 h-5 w-5 text-gray-400"
            aria-hidden="true"
          />
        </Menu.Button>
      </div>

      <Transition
        enter="transition ease-out duration-25"
      >
        <Menu.Items className="absolute right-0 z-10 mt-2 w-56 origin-top-right  rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          <div className="px-4 py-3">
            <p className="text-sm">Signed in as</p>
            <p className="truncate text-sm font-medium text-gray-900">
              {email}
            </p>
          </div>
          <div className="py-1 hover:bg-gray-100  w-full mb-1   hover:text-gray-900">
            <Menu.Item>
              {() => (
                <Link
                  to={"/settings"}
                  className={classNames("block px-4 py-2 text-sm")}
                >
                  Account settings
                </Link>
              )}
            </Menu.Item>
          </div>
          <div className="py-1 hover:bg-gray-100  w-full mb-1   hover:text-gray-900">
            <form method="POST" action="#">
              <Menu.Item>
                {() => (
                  <Link
                    to={"/docs"}
                    className={classNames("block px-4 py-2 text-sm")}
                  >
                   API Documentation
                  </Link>
                )}
              </Menu.Item>
            </form>
          </div>
          <div className="py-1 hover:bg-gray-100  w-full   hover:text-gray-900">
            <form method="POST" action="#">
              <Menu.Item>
                {() => (
                  <Link
                    to={"/auth/logout"}
                    type="submit"
                    className={classNames(
                      "block w-full px-4 py-2 text-left text-sm",
                    )}
                  >
                    Sign out
                  </Link>
                )}
              </Menu.Item>
            </form>
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  );
};
