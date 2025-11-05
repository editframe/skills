import jwt from "jsonwebtoken";
import { z } from "zod";

import { db } from "@/sql-client.server";

import type { Route } from "./+types/url-token";
import { requireAPIToken } from "@/util/requireAPIToken";

const schema = z.object({
  url: z.string(),
  params: z.record(z.string()).optional(),
});

export const action = async ({ request }: Route.ActionArgs) => {
  const session = await requireAPIToken(request);
  const apiKey = await db
    .selectFrom("identity.api_keys")
    .where("id", "=", session.cid)
    .select(["hash"])
    .executeTakeFirst();

  if (!apiKey) {
    throw Response.json({ message: "Invalid or expired API token" }, { status: 401 });
  }

  const { url, params } = schema.parse(await request.json());

  // Always use unified format: URL prefix + parameters (params can be empty)
  const jwtPayload = {
    type: "url",
    url: url,
    params: params || {}, // Default to empty object for exhaustive matching
    cid: session.cid,
    oid: session.oid,
    uid: session.uid,
  };

  const signedToken = jwt.sign(
    jwtPayload,
    apiKey.hash,
    { algorithm: "HS256", expiresIn: "1hr" },
  );

  return {
    token: signedToken,
  };
};
