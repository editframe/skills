import { ClientOnly } from "remix-utils/client-only";
import { useEffect, useState } from "react";
import { noAuthMiddleware } from "~/middleware/auth";

import type { Route } from "./+types/typeform-registration";

export const middleware: Route.MiddlewareFunction[] = [noAuthMiddleware];

export const loader = async () => {
  return null;
};

function TypeformEmbed() {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Check if script is already loaded
    if (document.querySelector('script[src*="embed.typeform.com"]')) {
      setIsLoaded(true);
      return;
    }

    // Load Typeform embed script
    const script = document.createElement("script");
    script.src = "//embed.typeform.com/next/embed.js";
    script.async = true;
    script.onload = () => setIsLoaded(true);
    document.head.appendChild(script);

    return () => {
      // Cleanup script on unmount
      const existingScript = document.querySelector(
        'script[src*="embed.typeform.com"]',
      );
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-black">
      <div
        data-tf-live="01K3VCP8VVSEJHNPXV94PQJ10S"
        className={`transition-opacity duration-500 ${isLoaded ? "opacity-100" : "opacity-0"}`}
      />
    </div>
  );
}

export default function TypeformRegistration() {
  return (
    <ClientOnly fallback={<div className="min-h-screen bg-black" />}>
      {() => <TypeformEmbed />}
    </ClientOnly>
  );
}
