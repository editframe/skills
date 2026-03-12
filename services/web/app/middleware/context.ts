import { createContext } from "react-router";
import type { Session } from "react-router";
import type { SessionInfo, TokenLikeSessionInfo } from "@/util/session";

// Root-level: raw mutable session cookie, always available
export const sessionCookieContext = createContext<Session>();

// Root-level: parsed identity if present, null if unauthenticated
export const maybeIdentityContext = createContext<SessionInfo | undefined>();

// Auth-protected routes: guaranteed non-null identity
export const identityContext = createContext<SessionInfo>();

// API routes: guaranteed token-like identity (uid, cid, oid)
export const apiIdentityContext = createContext<TokenLikeSessionInfo>();

// Admin routes: identity guaranteed to be admin
export const adminIdentityContext = createContext<SessionInfo & { isAdmin: true }>();
