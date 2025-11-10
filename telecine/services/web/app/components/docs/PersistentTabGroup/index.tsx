import { Tab, TabGroup, TabList, TabPanel, TabPanels } from "@headlessui/react";
import clsx from "clsx";
import { useSharedTabState } from "./useSharedTabState";
import React from "react";

interface PersistentTabProps {
  label: string;
  children: React.ReactNode;
  unmount?: boolean;
}

export function PersistentTab({ children, unmount }: PersistentTabProps) {
  return (
    <TabPanel unmount={unmount} className="relative">
      {children}
    </TabPanel>
  );
}

interface PersistentTabGroupProps {
  children: React.ReactNode;
  className?: string;
  stateKey: string;
}

export function PersistentTabGroup({
  children,
  className,
  stateKey,
}: PersistentTabGroupProps) {
  const [activeTab, setActiveTab] = useSharedTabState(stateKey);

  return (
    <TabGroup
      selectedIndex={activeTab}
      onChange={setActiveTab}
      className={clsx("flex-1 flex flex-col min-h-0", className)}
    >
      <TabList className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg border border-gray-200 dark:border-gray-700">
        {React.Children.map(children, (child) => {
          if (React.isValidElement(child)) {
            return (
              <Tab
                className={({ selected }) =>
                  clsx(
                    "rounded-md px-4 py-2 text-sm font-medium leading-5",
                    "focus:outline-none ring-offset-2 focus:ring-2 ring-blue-400 dark:ring-blue-500",
                    "transition-colors duration-150",
                    selected
                      ? "bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-900/50 hover:text-gray-900 dark:hover:text-gray-100",
                  )
                }
              >
                {child.props.label}
              </Tab>
            );
          }
        })}
      </TabList>
      <TabPanels className="flex-1 min-h-0 overflow-auto">{children}</TabPanels>
    </TabGroup>
  );
}
