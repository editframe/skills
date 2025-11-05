import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
} from "@headlessui/react";
import { ChevronDownIcon, FunnelIcon } from "@heroicons/react/20/solid";
import classNames from "classnames";
import { useSearchParams } from "react-router";
import type { Dispatch, SetStateAction } from "react";

export const Filters = ({
  filters,
  sortOptions,
  setFilters,
}: {
  filters: {
    status: {
      label: string;
      options: {
        value: string;
        label: string;
        checked?: boolean;
      }[];
    };
    organization: {
      label: string;
      options: {
        value: string;
        label: string;
        checked?: boolean;
      }[];
    };
  };
  sortOptions?: {
    name: string;
    href: string;
    current?: boolean;
  }[];
  setFilters?: Dispatch<
    SetStateAction<{ status: string[]; organization: string[] }>
  >;
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  let numberOfFilters = 0;
  if (searchParams.get("status")) {
    numberOfFilters += 1;
  }
  if (searchParams.get("organization")) {
    numberOfFilters += 1;
  }
  return (
    <Disclosure
      as="section"
      aria-labelledby="filter-heading"
      className="grid items-center border-b border-t border-martinique-200"
    >
      <h2 id="filter-heading" className="sr-only">
        Filters
      </h2>
      <div className="relative col-start-1 row-start-1 py-4">
        <div className="lg:px-8 flex max-w-7xl space-x-6 divide-x divide-gray-200 px-4 text-sm">
          <div>
            <DisclosureButton className="group flex items-center font-medium text-gray-700">
              <FunnelIcon
                aria-hidden="true"
                className="mr-2 h-5 w-5 flex-none text-martinique-400 group-hover:text-martinique-500"
              />
              {numberOfFilters} Filters
            </DisclosureButton>
          </div>
          <div className="pl-6">
            <button
              type="button"
              className="text-gray-500"
              onClick={() => {
                const params = new URLSearchParams();
                params.delete("status");
                params.delete("organization");
                setSearchParams(params, {
                  preventScrollReset: true,
                });
                setFilters?.({
                  status: [
                    "created",
                    "queued",
                    "pending",
                    "rendering",
                    "complete",
                    "failed",
                  ],
                  organization: [],
                });
              }}
            >
              Clear all
            </button>
          </div>
        </div>
      </div>
      <DisclosurePanel className="border-t border-martinique-200 py-10">
        <div className="grid max-w-7xl grid-cols-2 gap-x-4 px-4 text-sm sm:px-6 md:gap-x-6 lg:px-8">
          <div className="grid auto-rows-min grid-cols-1 gap-y-10 md:grid-cols-2 md:gap-x-6">
            <fieldset>
              <legend className="block font-medium">
                {filters?.status.label}
              </legend>
              <div className="space-y-6 pt-6 sm:space-y-4 sm:pt-4">
                {filters?.status.options.map((option, optionIdx) => (
                  <div
                    key={option.value}
                    className="flex items-center text-base sm:text-sm"
                  >
                    <input
                      value={option.value}
                      defaultChecked={option.checked}
                      id={`status-${optionIdx}`}
                      checked={searchParams
                        .get("status")
                        ?.split(",")
                        .includes(option.value)}
                      name="status[]"
                      type="checkbox"
                      onChange={(e) => {
                        const previousStatus =
                          searchParams.get("status")?.split(",") || [];
                        let updatedStatus: string[] = [];

                        if (previousStatus.includes(e.target.value)) {
                          updatedStatus = previousStatus.filter(
                            (s) => s !== e.target.value,
                          );
                        } else {
                          updatedStatus = [...previousStatus, e.target.value];
                        }
                        const params = new URLSearchParams();
                        if (updatedStatus.length === 0) {
                          params.delete("status");
                          setSearchParams(params, {
                            preventScrollReset: true,
                          });
                          return;
                        }
                        params.set("status", updatedStatus.join(","));
                        if (searchParams.get("organization")) {
                          params.set(
                            "organization",
                            searchParams.get("organization") || "",
                          );
                        }
                        setFilters?.({
                          status: updatedStatus,
                          organization:
                            searchParams.get("organization")?.split(",") || [],
                        });
                        setSearchParams(params, {
                          preventScrollReset: true,
                        });
                      }}
                      className="h-4 w-4 flex-shrink-0 rounded border-martinique-300 text-editframe-600 focus:ring-editframe-500"
                    />
                    <label
                      htmlFor={`status-${optionIdx}`}
                      className="ml-3 min-w-0 flex-1 text-gray-600"
                    >
                      {option.label}
                    </label>
                  </div>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="block font-medium">
                {filters?.organization.label}
              </legend>
              <div className="space-y-6 pt-6 sm:space-y-4 sm:pt-4">
                {filters?.organization.options.map((option, optionIdx) => (
                  <div
                    key={option.value}
                    className="flex items-center text-base sm:text-sm"
                  >
                    <input
                      defaultValue={option.value}
                      defaultChecked={option.checked}
                      id={`organization-${optionIdx}`}
                      name="organization[]"
                      type="checkbox"
                      checked={searchParams
                        .get("organization")
                        ?.split(",")
                        .includes(option.value)}
                      onChange={(e) => {
                        const previousOrganization =
                          searchParams.get("organization")?.split(",") || [];
                        let updatedOrganization: string[] = [];
                        const params = new URLSearchParams();
                        if (previousOrganization.includes(e.target.value)) {
                          updatedOrganization = previousOrganization.filter(
                            (s) => s !== e.target.value,
                          );
                        } else {
                          updatedOrganization = [
                            ...previousOrganization,
                            e.target.value,
                          ];
                        }
                        params.set(
                          "organization",
                          updatedOrganization.join(","),
                        );
                        if (searchParams.get("status")) {
                          params.set(
                            "status",
                            searchParams.get("status") || "",
                          );
                        }
                        setFilters?.({
                          status: searchParams.get("status")?.split(",") || [],
                          organization: updatedOrganization,
                        });
                        if (updatedOrganization.length === 0) {
                          params.delete("organization");
                          setSearchParams(params, {
                            preventScrollReset: true,
                          });
                          return;
                        }
                        setSearchParams(params, {
                          preventScrollReset: true,
                        });
                      }}
                      className="h-4 w-4 flex-shrink-0 rounded border-martinique-300 text-editframe-600 focus:ring-editframe-500"
                    />
                    <label
                      htmlFor={`price-${optionIdx}`}
                      className="ml-3 min-w-0 flex-1 text-gray-600"
                    >
                      {option.label}
                    </label>
                  </div>
                ))}
              </div>
            </fieldset>
          </div>
        </div>
      </DisclosurePanel>
      {sortOptions && (
        <div className="col-start-1 row-start-1 py-4">
          <div className="mx-auto flex max-w-7xl justify-end px-4 sm:px-6 lg:px-8">
            <Menu as="div" className="relative inline-block">
              <div className="flex">
                <MenuButton className="group inline-flex justify-center text-sm font-medium text-gray-700 hover:text-gray-900">
                  Sort
                  <ChevronDownIcon
                    aria-hidden="true"
                    className="-mr-1 ml-1 h-5 w-5 flex-shrink-0 text-martinique-400 group-hover:text-martinique-500"
                  />
                </MenuButton>
              </div>

              <MenuItems
                transition
                className="absolute right-0 z-10 mt-2 w-40 origin-top-right rounded-md bg-white shadow-2xl ring-1 ring-black ring-opacity-5 transition focus:outline-none data-[closed]:scale-95 data-[closed]:transform data-[closed]:opacity-0 data-[enter]:duration-100 data-[leave]:duration-75 data-[enter]:ease-out data-[leave]:ease-in"
              >
                <div className="py-1">
                  {sortOptions?.map((option) => (
                    <MenuItem key={option.name}>
                      <a
                        href={option.href}
                        className={classNames(
                          option.current
                            ? "font-medium text-gray-900"
                            : "text-gray-500",
                          "block px-4 py-2 text-sm data-[focus]:bg-martinique-100",
                        )}
                      >
                        {option.name}
                      </a>
                    </MenuItem>
                  ))}
                </div>
              </MenuItems>
            </Menu>
          </div>
        </div>
      )}
    </Disclosure>
  );
};
