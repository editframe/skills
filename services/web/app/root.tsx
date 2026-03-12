import { data, Outlet } from "react-router";
import { Links, Scripts, ScrollRestoration } from "react-router";
import { Meta } from "react-router";
import interFont from "~/assets/fonts/inter-latin.woff2?url";

import {
  extractNewFlash,
  useFlashMessages,
} from "./components/flash/useFlashMessages";
import "./styles/global.css";
import { FlashMessages } from "./components/flash/FlashMessage";

import { commitSession } from "@/util/session";
import { sessionMiddleware } from "./middleware/session";
import { sessionCookieContext } from "./middleware/context";

import type { Route } from "./+types/root";

export const middleware: Route.MiddlewareFunction[] = [sessionMiddleware];

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
if (typeof globalThis !== "undefined") {
  (globalThis as any).__ENV_CONTEXT__ = env;
}

declare global {
  interface Window {
    ENV: typeof env;
  }
}

function parseThemeCookie(
  cookieHeader: string | null,
): "light" | "dark" | "system" {
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

function getResolvedTheme(
  theme: "light" | "dark" | "system",
  prefersDark: boolean,
): "light" | "dark" {
  if (theme === "dark") return "dark";
  if (theme === "light") return "light";
  return prefersDark ? "dark" : "light";
}

export const loader = async ({ request, context }: Route.LoaderArgs) => {
  const sessionCookie = context.get(sessionCookieContext);
  const cookieHeader = request.headers.get("cookie");
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
        <link
          rel="preload"
          href={interFont}
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
          fetchPriority="high"
        />
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
        <link rel="icon" type="image/png" href="/images/favicon.png" />
        <Links />
      </head>
      <body>
        <FlashMessages flashMessages={flashMessages} />
        <Outlet />
        <ScrollRestoration />
        <Scripts />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.ENV = ${JSON.stringify(env)}`,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                function loadGtag() {
                  var s = document.createElement('script');
                  s.src = 'https://www.googletagmanager.com/gtag/js?id=G-6XC69KF8VD';
                  s.async = true;
                  document.head.appendChild(s);
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  window.gtag = gtag;
                  gtag('js', new Date());
                  gtag('config', 'G-6XC69KF8VD');
                }
                if (typeof requestIdleCallback !== 'undefined') {
                  requestIdleCallback(loadGtag, { timeout: 5000 });
                } else {
                  setTimeout(loadGtag, 3000);
                }
              })();
            `,
          }}
        />
      </body>
    </html>
  );
}
