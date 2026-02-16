import { validateUrlToken } from "@/util/validateUrlToken";
import type { TokenLikeSessionInfo } from "@/util/session";
import { maybeIdentityContext, apiIdentityContext } from "./context";
import type { Route } from "../+types/root";

/**
 * API middleware for /api/v1/* routes.
 * Reads the identity already parsed by sessionMiddleware (on root).
 * Performs API-specific validation (token expiration, URL token validation).
 * Always returns JSON 401 on failure — never redirects.
 */
export const apiAuthMiddleware: Route.MiddlewareFunction = async ({
  request,
  context,
}) => {
  const session = context.get(maybeIdentityContext);

  if (!session) {
    throw new Response("Unauthorized", { status: 401 });
  }

  // For API tokens, check expiration
  if (session.type === "api" && session.expired_at) {
    if (new Date(session.expired_at) < new Date()) {
      throw new Response("Unauthorized", { status: 401 });
    }
  }

  // For URL tokens, validate the URL
  if (session.type === "url" || session.type === "anonymous_url") {
    const validation = validateUrlToken(session, request.url);
    if (!validation.isValid) {
      throw new Response("Unauthorized", { status: 401 });
    }
  }

  // Must have an org ID for API access
  if (!session.oid) {
    throw new Response("Unauthorized", { status: 401 });
  }

  const tokenLike: TokenLikeSessionInfo = {
    cid: "cid" in session && session.cid ? String(session.cid) : null,
    uid: session.uid,
    oid: session.oid,
  };

  context.set(apiIdentityContext, tokenLike);
};
