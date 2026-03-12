import React, { useEffect } from "react";
import type { ReactNode } from "react";

/**
 * Wraps children in ef-configuration so Editframe elements can resolve the API host.
 *
 * Rendering ef-configuration synchronously (even during SSR) keeps the React tree
 * structure stable. The custom element is registered via a client-side import, which
 * upgrades the already-mounted DOM element in place — no remount of children occurs.
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
  useEffect(() => {
    import("@editframe/react");
  }, []);

  return React.createElement(
    "ef-configuration",
    { "api-host": apiHost, "signing-url": signingUrl },
    children,
  );
}
