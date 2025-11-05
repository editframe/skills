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
  import.meta.env.VITE_HASURA_CLIENT_URL ?? "http://localhost:8080/v1/graphql";
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

export const loader = async (args: Route.LoaderArgs) => {
  const { sessionCookie } = await maybeSession(args.request);
  return data(
    {
      newFlash: extractNewFlash(sessionCookie),
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
  loaderData: { newFlash },
}: Route.ComponentProps) {
  const flashMessages = useFlashMessages(newFlash);

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" />
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
