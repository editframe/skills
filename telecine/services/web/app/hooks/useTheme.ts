import { useEffect, useState, useCallback } from "react";

export type Theme = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

const THEME_COOKIE_NAME = "theme";

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(";").shift() || null;
  }
  return null;
}

function setCookie(name: string, value: string, days: number = 365) {
  if (typeof document === "undefined") return;
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
}

function getSystemPreference(): ResolvedTheme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function getStoredTheme(): Theme {
  const stored = getCookie(THEME_COOKIE_NAME);
  if (stored === "light" || stored === "dark" || stored === "system") {
    return stored;
  }
  return "system";
}

function applyTheme(resolvedTheme: ResolvedTheme) {
  if (typeof document === "undefined") return;
  if (resolvedTheme === "dark") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") return "system";
    return getStoredTheme();
  });
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => {
    if (typeof window === "undefined") return "light";
    const isDark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");
    return isDark ? "dark" : "light";
  });
  const [isHydrated, setIsHydrated] = useState(false);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    setCookie(THEME_COOKIE_NAME, newTheme);
    
    if (typeof window !== "undefined") {
      if (newTheme === "system") {
        const systemPref = getSystemPreference();
        applyTheme(systemPref);
        setResolvedTheme(systemPref);
      } else {
        applyTheme(newTheme);
        setResolvedTheme(newTheme);
      }
      window.dispatchEvent(new Event("theme"));
    }
  }, []);

  useEffect(() => {
    setIsHydrated(true);
    
    const stored = getStoredTheme();
    const currentIsDark = document.documentElement.classList.contains("dark");
    const currentResolved = currentIsDark ? "dark" : "light";
    
    setThemeState(stored);
    setResolvedTheme(currentResolved);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;

    let mediaQuery: MediaQueryList | null = null;
    let mediaQueryListener: ((e: MediaQueryListEvent) => void) | null = null;

    if (theme === "system") {
      const systemPref = getSystemPreference();
      const currentIsDark = document.documentElement.classList.contains("dark");
      const shouldBeDark = systemPref === "dark";
      
      if (currentIsDark !== shouldBeDark) {
        applyTheme(systemPref);
      }
      setResolvedTheme(systemPref);

      mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      mediaQueryListener = (e: MediaQueryListEvent) => {
        const newPref = e.matches ? "dark" : "light";
        applyTheme(newPref);
        setResolvedTheme(newPref);
      };
      mediaQuery.addEventListener("change", mediaQueryListener);
    }

    return () => {
      if (mediaQuery && mediaQueryListener) {
        mediaQuery.removeEventListener("change", mediaQueryListener);
      }
    };
  }, [theme, isHydrated]);

  // Listen for theme changes from other components
  useEffect(() => {
    if (!isHydrated) return;

    const handleThemeChange = () => {
      const stored = getStoredTheme();
      const currentIsDark = document.documentElement.classList.contains("dark");
      const currentResolved = currentIsDark ? "dark" : "light";
      
      setThemeState(stored);
      setResolvedTheme(currentResolved);
    };

    window.addEventListener("theme", handleThemeChange);

    return () => {
      window.removeEventListener("theme", handleThemeChange);
    };
  }, [isHydrated]);

  return { theme, setTheme, resolvedTheme };
}

