import { useState, useEffect } from "react";

const STORAGE_KEY = "demonstration-active-tab";
const TAB_CHANGE_EVENT = "demonstration-tab-change";

export function useSharedTabState(stateKey: string) {
  const storageKey = `${STORAGE_KEY}-${stateKey}`;
  const [activeTab, setLocalActiveTab] = useState(0); // Always start with 0 for SSR consistency

  useEffect(() => {
    // Read from sessionStorage after hydration
    if (typeof window !== "undefined") {
      const stored = Number(sessionStorage.getItem(storageKey) || 0);
      if (stored !== activeTab) {
        setLocalActiveTab(stored);
      }
    }
  }, [storageKey, activeTab]);

  useEffect(() => {
    // Listen for changes from other instances
    const handleStorageChange = (event: CustomEvent<number>) => {
      setLocalActiveTab(event.detail);
    };

    window.addEventListener(
      TAB_CHANGE_EVENT,
      handleStorageChange as EventListener,
    );
    return () => {
      window.removeEventListener(
        TAB_CHANGE_EVENT,
        handleStorageChange as EventListener,
      );
    };
  }, []);

  const setActiveTab = (newTab: number) => {
    setLocalActiveTab(newTab);
    sessionStorage.setItem(storageKey, newTab.toString());

    // Dispatch event to notify other instances
    window.dispatchEvent(new CustomEvent(TAB_CHANGE_EVENT, { detail: newTab }));
  };

  return [activeTab, setActiveTab] as const;
}
