import {
  type LoaderFunction,
  type LoaderFunctionArgs,
  redirect,
  type Session,
} from "react-router";
import {
  type SessionInfo,
  type TokenLikeSessionInfo,
  getSession,
  parseRequestSession,
} from "./session";
import { requireAPIToken } from "./requireAPIToken";
import { logger } from "@/logging";

export type LoaderFunctionArgsWithSession = LoaderFunctionArgs & {
  session: SessionInfo;
  sessionCookie: Session;
};

export type LoaderFunctionArgsWithMaybeSession = LoaderFunctionArgs & {
  session?: SessionInfo;
  sessionCookie: Session;
};

export type LoaderWithSession = (
  args: LoaderFunctionArgsWithSession,
) => ReturnType<LoaderFunction>;

export type LoaderWithMaybeSession = (
  args: LoaderFunctionArgsWithMaybeSession,
) => ReturnType<LoaderFunction>;

export const maybeSession = async (request: Request) => {
  const session = await parseRequestSession(request);
  const sessionCookie = await getSession(request.headers.get("Cookie") ?? "");
  return { session, sessionCookie };
};

export function requireSessionAndRedirectBack<
  LoaderType extends LoaderWithSession,
>(loader: LoaderType) {
  return async (args: LoaderFunctionArgs): Promise<ReturnType<LoaderType>> => {
    const session = await parseRequestSession(args.request);
    if (!session) {
      return redirect(`/auth/login?redirect_to=${args.request.url}`) as never;
    }
    const sessionCookie = await getSession(
      args.request.headers.get("Cookie") ?? "",
    );
    return loader({
      ...args,
      session,
      sessionCookie,
    }) as ReturnType<LoaderType>;
  };
}

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
    return requireAPIToken(request);
  } catch (error) {
    throw new Response("Unauthorized", { status: 401 });
  }
};

export const requireSession = async (request: Request) => {
  const session = await parseRequestSession(request);
  if (!session) {
    throw redirect("/auth/login");
  }

  // AnonymousURLSession has uid: null and should not be allowed for authenticated routes
  if (session.type === "anonymous_url") {
    throw redirect("/auth/login");
  }

  // Ensure session has a valid uid (all non-anonymous sessions should have uid)
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
