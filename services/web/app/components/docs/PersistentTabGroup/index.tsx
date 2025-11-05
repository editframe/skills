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
      <TabList className="flex gap-1 bg-gray-50 p-1 rounded-md">
        {React.Children.map(children, (child) => {
          if (React.isValidElement(child)) {
            return (
              <Tab
                className={({ selected }) =>
                  clsx(
                    "rounded-full px-3 py-1 text-xs font-medium leading-5 text-gray-600",
                    "focus:outline-none ring-offset-2 focus:ring-2 ring-blue-400",
                    selected
                      ? "bg-blue-500 text-white"
                      : "hover:bg-gray-100 hover:text-gray-900",
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
