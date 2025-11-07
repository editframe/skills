import { data, Outlet } from "react-router";
import { Links, Scripts, ScrollRestoration } from "react-router";
import { Meta } from "react-router";

import {
  extractNewFlash,
  useFlashMessages,
} from "./components/flash/useFlashMessages";
import "./styles/global.css";
import { FlashMessages } from "./components/flash/FlashMessage";

import { maybeSession } from "@/util/requireSession.server";
import { commitSession } from "@/util/session";
import { Configuration as EFConfiguration } from "@editframe/react";

import type { Route } from "./+types/root";

const WEB_HOST = import.meta.env.VITE_WEB_HOST || "http://localhost:3000";
const GRAPHQL_URL =
  import.meta.env.VITE_HASURA_CLIENT_URL ?? `${WEB_HOST}/v1/graphql`;
const GRAPHQL_WS_URL = GRAPHQL_URL.replace("http", "ws");
const env = {
  GRAPHQL_URL,
  GRAPHQL_WS_URL,
  WEB_HOST,
};

// Set up environment context for SSR immediately
if (typeof globalThis !== 'undefined') {
  (globalThis as any).__ENV_CONTEXT__ = env;
}

declare global {
  interface Window {
    ENV: typeof env;
  }
}

function parseThemeCookie(cookieHeader: string | null): "light" | "dark" | "system" {
  if (!cookieHeader) return "system";
  const match = cookieHeader.match(/(?:^|;\s*)theme=([^;]+)/);
  if (match) {
    const value = match[1];
    if (value === "light" || value === "dark" || value === "system") {
      return value;
    }
  }
  return "system";
}

function getResolvedTheme(theme: "light" | "dark" | "system", prefersDark: boolean): "light" | "dark" {
  if (theme === "dark") return "dark";
  if (theme === "light") return "light";
  return prefersDark ? "dark" : "light";
}

export const loader = async (args: Route.LoaderArgs) => {
  const { sessionCookie } = await maybeSession(args.request);
  const cookieHeader = args.request.headers.get("cookie");
  const theme = parseThemeCookie(cookieHeader);
  
  return data(
    {
      newFlash: extractNewFlash(sessionCookie),
      theme,
    },
    {
      headers: {
        "Set-Cookie": await commitSession(sessionCookie),
      },
    },
  );
};

export const shouldRevalidate = () => true;


export default function App({
  loaderData: { newFlash, theme },
}: Route.ComponentProps) {
  const flashMessages = useFlashMessages(newFlash);
  
  const htmlClassName = theme === "dark" ? "dark" : "";

  return (
    <html lang="en" className={htmlClassName}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  function getCookie(name) {
                    const value = '; ' + document.cookie;
                    const parts = value.split('; ' + name + '=');
                    if (parts.length === 2) {
                      return parts.pop().split(';').shift();
                    }
                    return null;
                  }
                  
                  const theme = getCookie('theme') || '${theme}';
                  let shouldApplyDark = false;
                  
                  if (theme === 'dark') {
                    shouldApplyDark = true;
                  } else if (theme === 'system' || !theme) {
                    shouldApplyDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  }
                  
                  const htmlEl = document.documentElement;
                  const hasDark = htmlEl.classList.contains('dark');
                  
                  if (shouldApplyDark && !hasDark) {
                    htmlEl.classList.add('dark');
                  } else if (!shouldApplyDark && hasDark) {
                    htmlEl.classList.remove('dark');
                  }
                } catch (e) {
                  // Ignore errors
                }
              })();
            `,
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        <link rel="icon" type="image/png" href="/images/favicon.png" />
        <Links />
      </head>
      <body>
        <FlashMessages flashMessages={flashMessages} />
        <EFConfiguration api-host={WEB_HOST} signing-url={`${WEB_HOST}/ef-sign-url`}>
          <Outlet />
        </EFConfiguration>
        <Scripts />
        <ScrollRestoration />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.ENV = ${JSON.stringify(env)}`,
          }}
        />
      </body>
    </html>
  );
}
