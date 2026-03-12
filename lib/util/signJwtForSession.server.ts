import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import type { SessionInfo } from "@/util/session";
import { db } from "@/sql-client.server";
import { logger } from "@/logging";

const APP_JWT_SECRET = process.env.APPLICATION_JWT_SECRET;
if (!APP_JWT_SECRET) {
  throw new Error("APPLICATION_JWT_SECRET is not set");
}

const APP_JWT_SECRET_KEY = crypto.createSecretKey(Buffer.from(APP_JWT_SECRET));

const HASURA_JWT_SECRET = process.env.HASURA_JWT_SECRET;
if (!HASURA_JWT_SECRET) {
  throw new Error("HASURA_JWT_SECRET is not set");
}

const HASURA_JWT_SECRET_KEY = crypto.createSecretKey(
  Buffer.from(HASURA_JWT_SECRET),
);

interface Claims {
  "X-Hasura-user-id": string;
  "X-Hasura-default-role": string;
  "X-Hasura-allowed-roles": string[];
  "X-Hasura-api-key"?: string;
}

export type HasuraSessionInfo = {
  uid: string;
  cid: string | null;
  isAdmin?: boolean;
};

export const signHasuraJwtForSession = (sessionInfo: HasuraSessionInfo) => {
  if (!sessionInfo.uid || typeof sessionInfo.uid !== "string") {
    logger.error("signHasuraJwtForSession called with invalid uid", {
      uid: sessionInfo.uid,
      uidType: typeof sessionInfo.uid,
      cid: sessionInfo.cid,
    });
    throw new Error(
      `Cannot sign JWT: uid must be a non-empty string, got ${sessionInfo.uid} (${typeof sessionInfo.uid})`,
    );
  }

  const roles = [
    "user",
    "org-admin",
    "org-primary",
    "org-editor",
    "org-reader",
  ];
  if (sessionInfo.isAdmin) {
    roles.push("ef-admin");
  }

  const claims: Claims = {
    "X-Hasura-user-id": sessionInfo.uid,
    "X-Hasura-default-role": "user",
    "X-Hasura-allowed-roles": roles,
  };

  if (sessionInfo.cid) {
    claims["X-Hasura-api-key"] = sessionInfo.cid;
  }

  return jwt.sign(
    {
      "https://hasura.io/jwt/claims": claims,
    },
    HASURA_JWT_SECRET_KEY,
    { algorithm: "HS256" },
  );
};

export const signJwtForSession = (sessionInfo: SessionInfo) => {
  return jwt.sign(sessionInfo, APP_JWT_SECRET, {
    algorithm: "HS256",
  });
};

export const verifyJwtForSession = async (token: string) => {
  // Try APP_JWT_SECRET first — covers email_passwords, api, and anonymous_url tokens.
  // This avoids making DB queries driven by unverified JWT claims.
  try {
    const verified = jwt.verify(token, APP_JWT_SECRET_KEY) as jwt.JwtPayload;

    if (verified.type === "anonymous_url") {
      return {
        type: "anonymous_url" as const,
        url: verified.url,
        params: verified.params,
        cid: null,
        oid: null,
        uid: null,
      };
    }

    return verified;
  } catch {
    // APP_JWT_SECRET verification failed — may be a URL token signed with an API key hash
  }

  // Fallback: decode without verification to check if this is a URL token.
  // Only URL tokens use per-API-key signing keys.
  const decoded = jwt.decode(token);
  if (typeof decoded === "string" || decoded === null) {
    throw new Error("Invalid token");
  }

  if (decoded.type !== "url") {
    throw new Error("Invalid token");
  }

  const apiTokenId = decoded.cid;
  if (typeof apiTokenId !== "string") {
    throw new Error("Invalid token: missing cid");
  }

  const apiKey = await db
    .selectFrom("identity.api_keys")
    .where("id", "=", apiTokenId)
    .select("hash")
    .executeTakeFirst();

  if (!apiKey) {
    logger.error({ apiTokenId }, "Failed to find API key");
    throw new Response("Failed to find API key", { status: 401 });
  }

  jwt.verify(token, crypto.createSecretKey(apiKey.hash));
  return {
    type: "url" as const,
    url: decoded.url,
    params: decoded.params,
    cid: decoded.cid,
    oid: decoded.oid,
    uid: decoded.uid,
  };
};
