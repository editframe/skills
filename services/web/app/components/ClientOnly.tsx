import { type ReactNode, useEffect, useState } from "react";

/**
 * Renders children only on the client, never during SSR.
 * Prevents expensive below-fold components from being included in the SSR
 * HTML and needing to be reconciled during hydration.
 */
export function ClientOnly({
  children,
  fallback = null,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  return mounted ? children : fallback;
}
