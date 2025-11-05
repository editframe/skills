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
};

export const signHasuraJwtForSession = (sessionInfo: HasuraSessionInfo) => {
  const claims: Claims = {
    "X-Hasura-user-id": sessionInfo.uid,
    "X-Hasura-default-role": "user",
    "X-Hasura-allowed-roles": [
      "user",
      "org-admin",
      "org-primary",
      "org-editor",
      "org-reader",
      "ef-admin",
    ],
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
  const decoded = jwt.decode(token);
  if (typeof decoded === "string") {
    throw new Error("Invalid token");
  }

  if (
    decoded !== null &&
    typeof decoded === "object" &&
    decoded.type === "url"
  ) {
    const apiTokenId = decoded.cid;
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
      type: "url",
      url: decoded.url,
      params: decoded.params,
      cid: decoded.cid,
      oid: decoded.oid,
      uid: decoded.uid,
    };
  }

  if (
    decoded !== null &&
    typeof decoded === "object" &&
    decoded.type === "anonymous_url"
  ) {
    // For anonymous URL tokens, verify with APPLICATION_JWT_SECRET
    // No database lookup required
    jwt.verify(token, APP_JWT_SECRET_KEY);
    return {
      type: "anonymous_url",
      url: decoded.url,
      params: decoded.params,
      // Anonymous tokens don't have user context
      cid: null,
      oid: null,
      uid: null,
    };
  }

  jwt.verify(token, APP_JWT_SECRET_KEY);
  return decoded;
};
