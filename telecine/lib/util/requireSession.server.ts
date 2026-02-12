import { redirect } from "react-router";
import {
  type SessionInfo,
  type TokenLikeSessionInfo,
  getSession,
  parseRequestSession,
} from "./session";
import { requireAPIToken } from "./requireAPIToken";
import { logger } from "@/logging";

export const maybeSession = async (request: Request) => {
  const session = await parseRequestSession(request);
  const sessionCookie = await getSession(request.headers.get("Cookie") ?? "");
  return { session, sessionCookie };
};

export const requireCookieOrTokenSession = async (
  request: Request,
): Promise<TokenLikeSessionInfo> => {
  try {
    const hasCookie = request.headers.has("cookie");
    if (hasCookie) {
      const session = await parseRequestSession(request);
      if (!session) {
        throw new Response("Unauthorized", { status: 401 });
      }
      if (session.oid === undefined) {
        throw new Response("Unauthorized", { status: 401 });
      }
      return {
        cid: session.type === "api" ? session.cid : null,
        uid: session.uid,
        oid: session.oid,
      };
    }
    return await requireAPIToken(request);
  } catch (error) {
    throw new Response("Unauthorized", { status: 401 });
  }
};

export const requireSession = async (request: Request) => {
  const session = await parseRequestSession(request);
  if (!session) {
    throw redirect("/auth/login");
  }

  if (session.type === "anonymous_url") {
    throw redirect("/auth/login");
  }

  if (!session.uid || typeof session.uid !== "string") {
    logger.error("requireSession: session missing valid uid", {
      sessionType: session.type,
      uid: session.uid,
      uidType: typeof session.uid,
    });
    throw redirect("/auth/login");
  }

  const sessionCookie = await getSession(request.headers.get("Cookie") ?? "");
  return { session, sessionCookie };
};

export const requireNoSession = async (request: Request) => {
  const session = await parseRequestSession(request);
  if (session) {
    throw redirect("/welcome");
  }
  const sessionCookie = await getSession(request.headers.get("Cookie") ?? "");
  return { sessionCookie };
};
