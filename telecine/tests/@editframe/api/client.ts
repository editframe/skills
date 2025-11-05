import { nanoid } from "nanoid";
import { v4 } from "uuid";

import { Client } from "@editframe/api";
import { safeRegisterUser } from "@/sql-client.server/safeRegisterUser";
import { safeCreateOrg } from "@/sql-client.server/safeCreateOrg";
import { createApiKey } from "~/createApiKey.server";

const uniqueAddress = `${nanoid(10).toLowerCase()}@example.org`;
const primary = await safeRegisterUser(uniqueAddress, "password123");
export const org = await safeCreateOrg({
  displayName: uniqueAddress,
  primary: primary,
  admins: [primary],
});

const generatedToken = `ef_${v4().replaceAll("-", "")}`;
const webhookSecret = "test";

export const apiKey = await createApiKey({
  token: generatedToken,
  webhookSecret,
  name: "test",
  orgId: org.id,
  userId: primary.user_id,
  webhookUrl: null,
  webhookEvents: [],
  expired_at: null,
});

const token = `${generatedToken}_${apiKey.id}`;

export const client = new Client(token, process.env.PLAYWRIGHT_WEB_HOST);
