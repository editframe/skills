import clsx from "clsx";

import { Listbox as HeadlessListbox, Transition } from "@headlessui/react";
import { CaretDown } from "@phosphor-icons/react";

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
            "inline-flex justify-between border-0 py-1.5 pr-4 pl-3 rounded-md ring-1 focus:ring-2 ring-inset w-full text-left sm:text-sm sm:leading-6 transition-all duration-150 relative",
            "bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm",
            "text-slate-900 dark:text-white",
            "ring-slate-300/75 dark:ring-slate-700/75",
            "shadow-[0_1px_2px_0_rgb(0_0_0_/_0.08)] dark:shadow-[0_1px_2px_0_rgb(0_0_0_/_0.3)]",
            "before:absolute before:inset-0 before:bg-gradient-to-br before:from-amber-50/18 before:via-transparent before:to-transparent",
            "dark:before:from-blue-950/15 before:via-transparent dark:before:to-transparent",
            "before:pointer-events-none before:rounded-md",
            "focus:ring-blue-500/85 dark:focus:ring-blue-400/85",
            "focus:shadow-[0_1px_2px_0_rgb(0_0_0_/_0.08),0_4px_12px_0_rgb(59_130_246_/_0.22)] dark:focus:shadow-[0_1px_2px_0_rgb(0_0_0_/_0.4),0_4px_12px_0_rgb(59_130_246_/_0.35)]",
            "focus:before:from-blue-50/30 focus:before:via-transparent focus:before:to-transparent",
            "dark:focus:before:from-blue-950/22 dark:focus:before:via-transparent dark:focus:before:to-transparent",
            error ? "ring-red-300/85 dark:ring-red-600/85 focus:ring-red-500 dark:focus:ring-red-400" : "",
            disabled && "opacity-50 cursor-not-allowed bg-slate-50/70 dark:bg-slate-900/70",
          )}
          aria-label={label}
        >
          <span className="block truncate">
            {options.find((option) => option.value === value)?.label}
          </span>
          <CaretDown
            className="-mr-1 w-5 h-5 text-slate-400 dark:text-slate-500"
            aria-hidden="true"
            weight="fill"
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
          <HeadlessListbox.Options className={clsx(
            "z-10 absolute mt-2 py-1 rounded-md ring-1 w-full focus:outline-none sm:text-sm backdrop-blur-sm transition-all",
            "bg-white/90 dark:bg-slate-800/90",
            "ring-slate-300/60 dark:ring-slate-700/60",
            "shadow-[0_4px_16px_0_rgb(0_0_0_/_0.1),0_1px_2px_0_rgb(0_0_0_/_0.05)]",
            "dark:shadow-[0_4px_16px_0_rgb(0_0_0_/_0.5),0_1px_2px_0_rgb(0_0_0_/_0.3)]"
          )}>
            {options.map((option) => (
              <HeadlessListbox.Option
                key={option.value}
                value={option.value}
                className={({ active }) =>
                  clsx(
                    "relative py-2 pr-9 pl-3 cursor-default select-none transition-colors",
                    active 
                      ? "bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white" 
                      : "text-slate-900 dark:text-white",
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
