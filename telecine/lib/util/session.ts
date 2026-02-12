import type { IncomingHttpHeaders, IncomingMessage } from "node:http";
import { db } from "@/sql-client.server";
import { createCookieSessionStorage } from "react-router";
import * as z from "zod";
import { verifyApiToken } from "./scryptPromise.server";
import { verifyJwtForSession } from "./signJwtForSession.server";
import { logger } from "@/logging";

function buildSessionStorage() {
  return createCookieSessionStorage({
    cookie: {
      name: "_session", // use any name you want here
      sameSite: "lax", // this helps with CSRF
      path: "/", // remember to add this so the cookie will work in all routes
      httpOnly: true, // for security reasons, make this cookie http only
      secrets: [process.env.APPLICATION_SECRET!], // replace this with an actual secret
      secure: process.env.NODE_ENV === "production", // enable this in prod only
    },
  });
}

// export the whole sessionStorage object
export const sessionStorage = buildSessionStorage();

// you can also export the methods individually for your own usage
export const { getSession, commitSession, destroySession } = sessionStorage;

export interface TokenLikeSessionInfo {
  uid: string;
  cid: string | null;
  oid: string;
}

// This is a session created by logging in on the web app
const EmailPasswordSession = z.object({
  // How was this session created?
  type: z.literal("email_passwords"),
  // The user id for this session
  uid: z.string(),
  // The credential id for this session
  cid: z.string(),
  // The email address for this session, because it is an email/password session
  email: z.string(),
  // Whether the email address has been confirmed
  confirmed: z.boolean(),
  // The org id associated with this token
  oid: z.string().optional(),
});

const APISession = z.object({
  // How was this session created?
  type: z.literal("api"),
  // The org id associated with this token
  oid: z.string(),
  // The user id for this session
  uid: z.string(),
  // The credential id for this session
  cid: z.string(),
  // The email address for this session
  email: z.string(),
  // Whether the email address has been confirmed
  confirmed: z.boolean(),
  // The expiration date for this token
  expired_at: z.date().nullable(),
  // Whether the org is paid
  is_paid: z.boolean(),
  // Whether the org has a restriction
  restricted: z.boolean().optional(),
});

export const URLSession = z.object({
  // How was this session created?
  type: z.literal("url"),
  // The user id for this session
  cid: z.string(),
  // The resource url prefix for this session
  url: z.string(),
  // Query parameters that must be exactly matched
  params: z.record(z.string()).default({}),
  // The org id associated with this token
  oid: z.string(),
  // The user id for this session
  uid: z.string(),
});

export const AnonymousURLSession = z.object({
  // How was this session created?
  type: z.literal("anonymous_url"),
  // The resource url prefix for this session
  url: z.string(),
  // Query parameters that must be exactly matched
  params: z.record(z.string()).default({}),
  // Anonymous sessions have no user context
  cid: z.null(),
  oid: z.null(),
  uid: z.null(),
});

// Using a zod schema so we can correctly parse this
// to avoid injection of credential_types we should not be querying for.
const SessionSchema = z.discriminatedUnion("type", [
  EmailPasswordSession,
  APISession,
  URLSession,
  AnonymousURLSession,
]);

export type SessionInfo = z.infer<typeof SessionSchema>;
export type EmailPasswordSessionInfo = z.infer<typeof EmailPasswordSession>;
export type APISessionInfo = z.infer<typeof APISession>;
export type URLSessionInfo = z.infer<typeof URLSession>;
export type AnonymousURLSessionInfo = z.infer<typeof AnonymousURLSession>;

export async function createSessionCookie(
  sessionInfo: z.infer<typeof SessionSchema>,
) {
  const session = await getSession();
  for (const key in sessionInfo) {
    session.set(key, sessionInfo[key as keyof typeof sessionInfo]);
  }
  const maxAge = 60 * 60 * 24 * 7; // 7 days
  return commitSession(session, { maxAge });
}

const getHeader = <Header extends keyof IncomingHttpHeaders>(
  request: Request | IncomingMessage,
  header: Header,
): string | null => {
  if (request instanceof Request) {
    return request.headers.get(header as string);
  }
  // @ts-expect-error request.headers is for some reason typing as string | string[], which is incorrect
  return request.headers[String(header).toLowerCase()] ?? null;
};

export async function parseRequestSession(
  request: Request | IncomingMessage,
): Promise<
  | EmailPasswordSessionInfo
  | APISessionInfo
  | URLSessionInfo
  | AnonymousURLSessionInfo
  | undefined
> {
  const authHeader = getHeader(request, "Authorization");
  if (authHeader) {
    const token = authHeader.split("Bearer ")[1];
    if (!token) {
      return;
    }
    if (token.startsWith("ef_")) {
      const { apiKey, apiToken } =
        token.match(/^(?<apiToken>ef_[^_]+)_(?<apiKey>.+)$/)?.groups ?? {};

      if (!apiToken || !apiKey) {
        return;
      }
      const maybeApiKey = await db
        .selectFrom("identity.api_keys")
        .innerJoin(
          "identity.users",
          "identity.api_keys.user_id",
          "identity.users.id",
        )
        .innerJoin(
          "identity.email_passwords",
          "identity.users.id",
          "identity.email_passwords.user_id",
        )
        .innerJoin(
          "identity.email_confirmations",
          "identity.users.id",
          "identity.email_confirmations.user_id",
        )
        .innerJoin(
          "identity.orgs",
          "identity.api_keys.org_id",
          "identity.orgs.id",
        )
        .select([
          "identity.api_keys.salt",
          "identity.api_keys.hash",
          "identity.api_keys.id",
          "identity.api_keys.user_id",
          "identity.api_keys.expired_at",
          "identity.api_keys.org_id",
          "identity.email_passwords.email_address",
          "identity.email_confirmations.confirmed_at",
          "identity.orgs.is_paid",
        ])
        .where("identity.api_keys.id", "=", apiKey)
        .executeTakeFirst();
      if (!maybeApiKey) {
        logger.error("parseRequestSession api token not found");
        return;
      }
      const verified = await verifyApiToken(
        apiToken,
        maybeApiKey.hash,
        maybeApiKey.salt,
      );
      if (!verified) {
        logger.error("parseRequestSession api token not verified");
        return;
      }
      return {
        type: "api",
        oid: maybeApiKey.org_id,
        uid: maybeApiKey.user_id!, // TODO: fix db schema to match the types
        cid: maybeApiKey.id as string,
        email: maybeApiKey.email_address,
        confirmed: maybeApiKey.confirmed_at !== null,
        expired_at: maybeApiKey.expired_at ?? null,
        is_paid: !!maybeApiKey.is_paid,
      };
    }
    const session = await verifyJwtForSession(token);
    const parsed = SessionSchema.safeParse(session);
    if (parsed.success) {
      return parsed.data;
    }
    logger.error(parsed.error, "Failed to parse session from JWT");
    throw new Error("Failed to parse session from JWT");
  }

  const cookie = getHeader(request, "Cookie");
  return parseCookieSession(cookie);
}

async function parseCookieSession(cookie: string | null) {
  const session = await getSession(cookie);
  const parsed = SessionSchema.safeParse(session.data);
  if (parsed.success) {
    const maybeUser = await db
      .selectFrom("identity.users")
      .where("id", "=", parsed.data.uid)
      .select("id")
      .executeTakeFirst();
    return maybeUser ? parsed.data : undefined;
  }
}

export const createApiTokenSessionCookie = async (props: {
  org_id: string;
  user_id: string;
  credential_id: string;
  email_address: string;
  confirmed: boolean;
  expired_at: Date | null;
  is_paid: boolean;
}) => {
  return createSessionCookie({
    type: "api",
    oid: props.org_id,
    uid: props.user_id!,
    cid: props.credential_id,
    email: props.email_address,
    confirmed: props.confirmed,
    expired_at: props.expired_at,
    is_paid: props.is_paid,
  });
};

export const createEmailPasswordSessionCookie = async (emailPassword: {
  user_id: string;
  id: string;
  email_address: string;
  confirmed_at: Date | null;
}) => {
  return createSessionCookie({
    type: "email_passwords",
    uid: emailPassword.user_id,
    cid: emailPassword.id,
    email: emailPassword.email_address,
    confirmed: emailPassword.confirmed_at !== null,
  });
};
