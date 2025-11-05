import { useState, useEffect } from "react";
import {
  Combobox,
  ComboboxInput,
  ComboboxOptions,
  ComboboxOption,
} from "@headlessui/react";
import { ChevronDownIcon, CheckIcon } from "@heroicons/react/20/solid";
import clsx from "clsx";

interface Org {
  id: string;
  display_name: string;
  first_name: string | null;
  last_name: string | null;
  email_address: string;
}

interface OrgComboboxProps {
  value?: string;
  onChange: (value: string) => void;
  error?: boolean;
  disabled?: boolean;
}

export function OrgCombobox({
  value,
  onChange,
  error,
  disabled,
}: OrgComboboxProps) {
  const [query, setQuery] = useState("");
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Org | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!query) {
      setOrgs([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `/admin/search-orgs?q=${encodeURIComponent(query)}`
        );
        if (response.ok) {
          const data = await response.json();
          setOrgs(data);
        }
      } catch (error) {
        console.error("Failed to search orgs:", error);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

  const handleChange = (org: Org | null) => {
    setSelectedOrg(org);
    if (org) {
      onChange(org.id);
      setQuery("");
    } else {
      onChange("");
    }
  };

  const formatOrgLabel = (org: Org) => {
    const userName = [org.first_name, org.last_name].filter(Boolean).join(" ");
    return userName
      ? `${org.display_name} (${userName} - ${org.email_address})`
      : `${org.display_name} (${org.email_address})`;
  };

  const displayValue = selectedOrg ? formatOrgLabel(selectedOrg) : "";

  return (
    <Combobox value={selectedOrg} onChange={handleChange} disabled={disabled}>
      <div className="relative">
        <ComboboxInput
          className={clsx(
            "block border-0 py-1.5 pr-10 pl-3 rounded-md ring-1 focus:ring-2 ring-inset w-full text-gray-900 text-sm placeholder:text-gray-400 sm:leading-6",
            error ? "ring-red-300 focus:ring-red-500" : "ring-gray-300 focus:ring-blue-500",
            disabled && "opacity-50 cursor-not-allowed bg-gray-50"
          )}
          displayValue={() => displayValue}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search organizations..."
          autoComplete="off"
        />
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
          <ChevronDownIcon
            className="w-5 h-5 text-gray-400"
            aria-hidden="true"
          />
        </div>

        {query && (orgs.length > 0 || isLoading) && (
          <ComboboxOptions
            className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-sm shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
          >
            {isLoading && (
              <div className="px-4 py-2 text-gray-500">Searching...</div>
            )}
            {!isLoading && orgs.length === 0 && (
              <div className="px-4 py-2 text-gray-500">No organizations found</div>
            )}
            {!isLoading &&
              orgs.map((org) => (
                <ComboboxOption
                  key={org.id}
                  value={org}
                  className={({ active }) =>
                    clsx(
                      "relative cursor-pointer select-none py-2 pl-10 pr-4",
                      active ? "bg-blue-600 text-white" : "text-gray-900"
                    )
                  }
                >
                  {({ selected, active }) => (
                    <>
                      <span
                        className={clsx(
                          "block truncate",
                          selected ? "font-medium" : "font-normal"
                        )}
                      >
                        {formatOrgLabel(org)}
                      </span>
                      {selected && (
                        <span
                          className={clsx(
                            "absolute inset-y-0 left-0 flex items-center pl-3",
                            active ? "text-white" : "text-blue-600"
                          )}
                        >
                          <CheckIcon className="w-5 h-5" aria-hidden="true" />
                        </span>
                      )}
                    </>
                  )}
                </ComboboxOption>
              ))}
          </ComboboxOptions>
        )}
      </div>
    </Combobox>
  );
}

