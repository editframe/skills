import clsx from "clsx";

import { Listbox as HeadlessListbox, Transition } from "@headlessui/react";
import { ChevronDownIcon } from "@heroicons/react/20/solid";

interface ListboxProps<T> {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  label?: string;
  disabled?: boolean;
  error?: boolean;
  className?: string;
}

export function Listbox<T extends string>({
  value,
  onChange,
  options,
  label,
  disabled,
  error,
  className,
}: ListboxProps<T>) {
  return (
    <HeadlessListbox value={value} onChange={onChange} disabled={disabled}>
      <div className={clsx("relative w-full", className)}>
        <HeadlessListbox.Button
          className={clsx(
            "inline-flex justify-between border-0 py-1.5 pr-4 pl-3 rounded-md ring-1 focus:ring-2 ring-inset w-full text-gray-900 text-left sm:text-sm sm:leading-6",
            error ? "ring-red-300 focus:ring-red-500" : "ring-gray-300",
            disabled && "opacity-50 cursor-not-allowed bg-gray-50",
          )}
          aria-label={label}
        >
          <span className="block truncate">
            {options.find((option) => option.value === value)?.label}
          </span>
          <ChevronDownIcon
            className="-mr-1 w-5 h-5 text-gray-400"
            aria-hidden="true"
          />
        </HeadlessListbox.Button>

        <Transition
          enter="transition ease-out duration-100"
          enterFrom="transform opacity-0 scale-95"
          enterTo="transform opacity-100 scale-100"
          leave="transition ease-in duration-75"
          leaveFrom="transform opacity-100 scale-100"
          leaveTo="transform opacity-0 scale-95"
        >
          <HeadlessListbox.Options className="z-10 absolute bg-white ring-opacity-5 shadow-lg mt-2 py-1 rounded-md ring-1 ring-black w-full focus:outline-none sm:text-sm">
            {options.map((option) => (
              <HeadlessListbox.Option
                key={option.value}
                value={option.value}
                className={({ active }) =>
                  clsx(
                    "relative py-2 pr-9 pl-3 cursor-default select-none",
                    active ? "bg-gray-100 text-gray-900" : "text-gray-900",
                  )
                }
              >
                {({ selected }) => (
                  <span
                    className={clsx(
                      "block truncate",
                      selected && "font-semibold",
                    )}
                  >
                    {option.label}
                  </span>
                )}
              </HeadlessListbox.Option>
            ))}
          </HeadlessListbox.Options>
        </Transition>
      </div>
    </HeadlessListbox>
  );
}
