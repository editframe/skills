import "dotenv/config";
import { deleteAllEmails } from "../util/mailhog";
import { db } from "@/sql-client.server";
import { sql } from "kysely";

const BASE_URL = process.env.PLAYWRIGHT_WEB_HOST || "http://web:3000";

async function warmUpServer() {
  const maxAttempts = 30;
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(`${BASE_URL}/auth/login`);
      if (response.ok || response.status === 302) {
        return;
      }
    } catch {
      // Server not ready yet
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`Web server at ${BASE_URL} did not become ready`);
}

async function cleanupTestData() {
  // All E2E test users use @example.org addresses.
  // Delete in dependency order. Each step is independent so partial
  // cleanup still helps if an unexpected FK prevents one step.
  const testUserIds = sql`
    SELECT u.id FROM identity.users u
    JOIN identity.email_passwords ep ON u.id = ep.user_id
    WHERE ep.email_address LIKE '%@example.org'
  `;

  const testOrgIds = sql`
    SELECT DISTINCT m.org_id FROM identity.memberships m
    WHERE m.user_id IN (${testUserIds})
  `;

  const testApiKeyIds = sql`
    SELECT id FROM identity.api_keys WHERE org_id IN (${testOrgIds})
  `;

  const steps: [string, ReturnType<typeof sql>][] = [
    // Null out FK refs from other schemas to api_keys
    [
      "null renders.api_key_id",
      sql`UPDATE video2.renders SET api_key_id = NULL WHERE api_key_id IN (${testApiKeyIds})`,
    ],
    [
      "null process_html.api_key_id",
      sql`UPDATE video2.process_html SET api_key_id = NULL WHERE api_key_id IN (${testApiKeyIds})`,
    ],
    // Delete identity tables in dependency order
    [
      "api_keys",
      sql`DELETE FROM identity.api_keys WHERE org_id IN (${testOrgIds})`,
    ],
    [
      "invites",
      sql`DELETE FROM identity.invites WHERE org_id IN (${testOrgIds})`,
    ],
    [
      "memberships",
      sql`DELETE FROM identity.memberships WHERE user_id IN (${testUserIds})`,
    ],
    ["orgs", sql`DELETE FROM identity.orgs WHERE id IN (${testOrgIds})`],
    [
      "password_resets",
      sql`DELETE FROM identity.password_resets WHERE user_id IN (${testUserIds})`,
    ],
    [
      "email_confirmations",
      sql`DELETE FROM identity.email_confirmations WHERE user_id IN (${testUserIds})`,
    ],
    [
      "magic_link_tokens",
      sql`DELETE FROM identity.magic_link_tokens WHERE user_id IN (${testUserIds})`,
    ],
    [
      "email_passwords",
      sql`DELETE FROM identity.email_passwords WHERE user_id IN (${testUserIds})`,
    ],
    ["users", sql`DELETE FROM identity.users WHERE id IN (${testUserIds})`],
  ];

  for (const [name, query] of steps) {
    try {
      await query.execute(db);
    } catch (err: any) {
      console.warn(
        `Cleanup step "${name}" failed: ${err.detail || err.message}`,
      );
    }
  }
}

export default async function setup() {
  await Promise.all([deleteAllEmails(), warmUpServer(), cleanupTestData()]);
}
