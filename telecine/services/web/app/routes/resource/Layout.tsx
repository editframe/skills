import { Outlet, redirect } from "react-router";
import { UserNavigation } from "~/components/Navigation";
import { requireQueryAs } from "@/graphql.server/userClient";
import { graphql } from "@/graphql";
import { commitSession, type SessionInfo } from "@/util/session";
import { SpanStatusCode } from "@opentelemetry/api";
import { trace } from "@opentelemetry/api";
import { Header } from "~/components/Header";
import clsx from "clsx";
import { useState } from "react";
import { logger } from "@/logging";
import { db } from "@/sql-client.server";

import type { Route } from "./+types/Layout";
import { authMiddleware } from "~/middleware/auth";
import {
  identityContext,
  sessionCookieContext,
} from "~/middleware/context";

export const middleware: Route.MiddlewareFunction[] = [authMiddleware];

const getUserOrgs = (session: SessionInfo) => {
  const activeSpan = trace.getActiveSpan();

  if (!session.uid || typeof session.uid !== "string") {
    logger.error("getUserOrgs called with invalid session", {
      sessionType: session.type,
      uid: session.uid,
      uidType: typeof session.uid,
      sessionKeys: Object.keys(session),
    });
    activeSpan?.setStatus({
      code: SpanStatusCode.ERROR,
      message: `Invalid session: uid is ${session.uid} (${typeof session.uid})`,
    });
    throw new Error(
      `Cannot query organizations: session has invalid uid (${session.uid})`,
    );
  }

  const sessionInfo = { uid: session.uid, cid: session.cid ?? null };

  logger.info("getUserOrgs called", {
    sessionType: session.type,
    uid: sessionInfo.uid,
    cid: sessionInfo.cid,
  });

  activeSpan?.setAttributes({
    "session.type": session.type,
    "session.uid": sessionInfo.uid,
    "session.cid": sessionInfo.cid ?? "null",
  });

  return requireQueryAs(
    sessionInfo,
    "org-reader",
    graphql(`
        query OrgPicker {
          result:orgs {
            id
            display_name
          }
        }
      `),
    {},
  );
};

/**
 * This function serves two critical purposes:
 *
 * 1. If there is no org in the URL, redirect to the org in the session or the first org
 * 2. If there is no org in the session, Set it in the session and redirect to the org in the URL
 */
const maybeRedirectToOrg = async (
  orgs: { id: string; display_name: string }[],
  request: Request,
  sessionCookie: Awaited<ReturnType<typeof import("@/util/session").getSession>>,
) => {
  const activeSpan = trace.getActiveSpan();

  if (orgs.length === 0) {
    const url = new URL(request.url);
    const searchParams = url.searchParams;
    const urlOrgId = searchParams.get("org");
    const sessionOrgId = sessionCookie.get("oid");

    logger.error("No organizations found in account", {
      url: request.url,
      urlOrgId,
      sessionOrgId,
      sessionData: sessionCookie.data,
      requestHeaders: Object.fromEntries(request.headers.entries()),
    });

    activeSpan?.setStatus({
      code: SpanStatusCode.ERROR,
      message: "No organizations found in account",
    });
    activeSpan?.setAttributes({
      "error.url": request.url,
      "error.urlOrgId": urlOrgId ?? "null",
      "error.sessionOrgId": sessionOrgId ?? "null",
    });

    throw new Error(
      "No organizations found in account. Please contact support.",
    );
  }

  const url = new URL(request.url);
  const searchParams = url.searchParams;
  const urlOrgId = searchParams.get("org");
  const sessionOrgId = sessionCookie.get("oid");

  // If URL has org but session doesn't, set session
  if (urlOrgId && !sessionOrgId) {
    const org = orgs.find((o) => o.id === urlOrgId);
    if (org) {
      sessionCookie.set("oid", urlOrgId);
      activeSpan?.setAttributes({
        "organization.redirected": true,
        "organization.id": urlOrgId,
        "organization.name": org.display_name,
      });
      throw redirect(url.toString(), {
        headers: {
          "Set-Cookie": await commitSession(sessionCookie),
        },
      });
    }
  }

  // If no org in URL, redirect with org from session or first org
  if (!urlOrgId) {
    const org = orgs.find((o) => o.id === sessionOrgId);
    const selectedOrgId = org?.id ?? orgs[0]!.id;
    const selectedOrg = org ?? orgs[0]!;

    activeSpan?.setAttributes({
      "organization.id": selectedOrgId,
      "organization.name": selectedOrg.display_name,
    });

    sessionCookie.set("oid", selectedOrgId);
    url.searchParams.set("org", selectedOrgId);

    throw redirect(url.toString(), {
      headers: {
        "Set-Cookie": await commitSession(sessionCookie),
      },
    });
  }

  // Set org context even when no redirect is needed
  const currentOrg = orgs.find((o) => o.id === urlOrgId);
  if (currentOrg) {
    activeSpan?.setAttributes({
      "organization.id": currentOrg.id,
      "organization.name": currentOrg.display_name,
    });
  }

  activeSpan?.addEvent("no org redirect needed");
};
export const loader = async ({ request, context }: Route.LoaderArgs) => {
  const activeSpan = trace.getActiveSpan();
  const session = context.get(identityContext);
  const sessionCookie = context.get(sessionCookieContext);

  logger.info("ResourceLayout loader", {
    sessionType: session.type,
    uid: session.uid,
    cid: session.cid,
    url: request.url,
  });

  activeSpan?.setAttributes({
    "loader.session.type": session.type,
    "loader.session.uid": session.uid,
    "loader.url": request.url,
  });

  const orgs = await getUserOrgs(session);

  logger.info("getUserOrgs result", {
    orgCount: orgs.length,
    orgIds: orgs.map((o) => o.id),
    uid: session.uid,
  });

  activeSpan?.setAttributes({
    "orgs.count": orgs.length,
    "orgs.ids": orgs.map((o) => o.id).join(","),
  });

  await maybeRedirectToOrg(orgs, request, sessionCookie);
  return {
    orgs,
    email: session.type === "email_passwords" ? session.email : undefined,
  };
};

export default function ResourceLayout({ loaderData }: Route.ComponentProps) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  return (
    <div
      className={clsx(
        "grid h-screen w-full grid-rows-[auto_0_1fr] lg:grid-rows-[auto_1fr] grid-cols-1 lg:grid-cols-[auto_1fr] transition-colors",
        "bg-white dark:bg-slate-900",
      )}
    >
      <Header
        className="col-span-1 lg:col-span-2"
        orgs={loaderData.orgs}
        email={loaderData.email}
        onMobileNavToggle={() => setIsMobileNavOpen(!isMobileNavOpen)}
      />
      {/* Navigation - always rendered, handles its own mobile visibility */}
      <div className="lg:h-full lg:overflow-y-auto">
        <UserNavigation
          isMobileOpen={isMobileNavOpen}
          setIsMobileOpen={setIsMobileNavOpen}
        />
      </div>
      <div className="flex flex-col h-full min-h-0 overflow-hidden">
        <div className="flex-1 min-h-0 overflow-y-auto px-2 sm:px-4 lg:pl-2 pb-4">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
