import { useState, useEffect } from "react";
import {
  Combobox,
  ComboboxInput,
  ComboboxOptions,
  ComboboxOption,
} from "@headlessui/react";
import { CaretDown, Check } from "@phosphor-icons/react";
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
          `/admin/search-orgs?q=${encodeURIComponent(query)}`,
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
            "block border-0 py-1.5 pr-10 pl-3 rounded-md ring-1 focus:ring-2 ring-inset w-full text-sm sm:leading-6 transition-all duration-150 relative",
            "bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm",
            "text-slate-900 dark:text-white",
            "ring-slate-300/75 dark:ring-slate-700/75",
            "shadow-[0_1px_2px_0_rgb(0_0_0_/_0.08)] dark:shadow-[0_1px_2px_0_rgb(0_0_0_/_0.3)]",
            "placeholder:text-slate-400 dark:placeholder:text-slate-500",
            "before:absolute before:inset-0 before:bg-gradient-to-br before:from-amber-50/18 before:via-transparent before:to-transparent",
            "dark:before:from-blue-950/15 before:via-transparent dark:before:to-transparent",
            "before:pointer-events-none before:rounded-md",
            error
              ? "ring-red-300/85 dark:ring-red-600/85 focus:ring-red-500 dark:focus:ring-red-400"
              : "focus:ring-blue-500/85 dark:focus:ring-blue-400/85",
            "focus:shadow-[0_1px_2px_0_rgb(0_0_0_/_0.08),0_4px_12px_0_rgb(59_130_246_/_0.22)] dark:focus:shadow-[0_1px_2px_0_rgb(0_0_0_/_0.4),0_4px_12px_0_rgb(59_130_246_/_0.35)]",
            "focus:before:from-blue-50/30 focus:before:via-transparent focus:before:to-transparent",
            "dark:focus:before:from-blue-950/22 dark:focus:before:via-transparent dark:focus:before:to-transparent",
            disabled &&
              "opacity-50 cursor-not-allowed bg-slate-50/70 dark:bg-slate-900/70",
          )}
          displayValue={() => displayValue}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search organizations..."
          autoComplete="off"
        />
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
          <CaretDown
            className={clsx(
              "w-5 h-5 transition-colors",
              "text-slate-400 dark:text-slate-500",
            )}
            aria-hidden="true"
            weight="fill"
          />
        </div>

        {query && (orgs.length > 0 || isLoading) && (
          <ComboboxOptions
            className={clsx(
              "absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md py-1 text-sm ring-1 focus:outline-none transition-all backdrop-blur-sm",
              "bg-white/90 dark:bg-slate-800/90",
              "ring-slate-300/60 dark:ring-slate-700/60",
              "shadow-[0_4px_16px_0_rgb(0_0_0_/_0.1),0_1px_2px_0_rgb(0_0_0_/_0.05)]",
              "dark:shadow-[0_4px_16px_0_rgb(0_0_0_/_0.5),0_1px_2px_0_rgb(0_0_0_/_0.3)]",
            )}
          >
            {isLoading && (
              <div
                className={clsx(
                  "px-4 py-2 transition-colors",
                  "text-slate-500 dark:text-slate-400",
                )}
              >
                Searching...
              </div>
            )}
            {!isLoading && orgs.length === 0 && (
              <div
                className={clsx(
                  "px-4 py-2 transition-colors",
                  "text-slate-500 dark:text-slate-400",
                )}
              >
                No organizations found
              </div>
            )}
            {!isLoading &&
              orgs.map((org) => (
                <ComboboxOption
                  key={org.id}
                  value={org}
                  className={({ active }) =>
                    clsx(
                      "relative cursor-pointer select-none py-2 pl-10 pr-4 transition-colors",
                      active
                        ? "bg-blue-600 dark:bg-blue-500 text-white"
                        : "text-slate-900 dark:text-white",
                    )
                  }
                >
                  {({ selected, active }) => (
                    <>
                      <span
                        className={clsx(
                          "block truncate",
                          selected ? "font-medium" : "font-normal",
                        )}
                      >
                        {formatOrgLabel(org)}
                      </span>
                      {selected && (
                        <span
                          className={clsx(
                            "absolute inset-y-0 left-0 flex items-center pl-3 transition-colors",
                            active
                              ? "text-white"
                              : "text-blue-600 dark:text-blue-400",
                          )}
                        >
                          <Check
                            className="w-5 h-5"
                            aria-hidden="true"
                            weight="fill"
                          />
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
