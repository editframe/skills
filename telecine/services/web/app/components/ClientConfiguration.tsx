import { useEffect, useState } from "react";
import type { ReactNode } from "react";

/**
 * Client-only wrapper for EFConfiguration to prevent SSR custom element registration
 * Custom elements should only be registered in the browser, not during SSR
 */
export function ClientConfiguration({
  children,
  apiHost,
  signingUrl,
}: {
  children: ReactNode;
  apiHost: string;
  signingUrl: string;
}) {
  const [Configuration, setConfiguration] =
    useState<React.ComponentType<any> | null>(null);

  useEffect(() => {
    const load = () => {
      import("@editframe/react").then((mod) => {
        setConfiguration(() => mod.Configuration);
      });
    };
    if (typeof requestIdleCallback !== "undefined") {
      const id = requestIdleCallback(load, { timeout: 3000 });
      return () => cancelIdleCallback(id);
    } else {
      const id = setTimeout(load, 200);
      return () => clearTimeout(id);
    }
  }, []);

  // During SSR or before client-side import, render children without Configuration wrapper
  // The Configuration component is only needed for client-side interactivity
  if (!Configuration || typeof window === "undefined") {
    return <>{children}</>;
  }

  return (
    <Configuration api-host={apiHost} signing-url={signingUrl}>
      {children}
    </Configuration>
  );
}
