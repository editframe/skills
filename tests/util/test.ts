import { type Locator, expect, test as playwrightTest } from "@playwright/test";

import { safeCreateOrg } from "@/sql-client.server/safeCreateOrg";
import { safeRegisterUser } from "@/sql-client.server/safeRegisterUser";
import { signInAsEmailAddress } from "./signInAsEmailAddress";
import { nanoid } from "nanoid";
import { waitFor } from "./waitForValue";
import { getMostRecentMessage } from "./mailhog";
import { followEmailLink } from "./followEmailLink";
import type {
  IdentityApiKeys,
  IdentityEmailPasswords,
  IdentityOrgs,
} from "@/sql-client.server/kysely-codegen";
import type { Selectable } from "kysely";
import { createApiKey } from "~/createApiKey.server";
import { v4 } from "uuid";
import { executeSpan, setSpanAttributes } from "@/tracing";

interface UserFixture extends Selectable<IdentityEmailPasswords> {
  first_name: string | null;
  last_name: string | null;
  org?: Selectable<IdentityOrgs>;
}

export interface OrgFixture extends Selectable<IdentityOrgs> {
  primary: UserFixture;
  admins: UserFixture[];
  admin: UserFixture;
  editors: UserFixture[];
  editor: UserFixture;
  readers: UserFixture[];
  reader: UserFixture;
  apiKey: Selectable<IdentityApiKeys>;
}

interface AppFixtures {
  signInAs: (
    emailPassword: Selectable<IdentityEmailPasswords>,
  ) => Promise<void>;
  signOut: () => Promise<void>;
  requiresAuthentication: (route: string) => Promise<void>;
  waitForEmail(recipient: string, subject: string): Promise<void>;
  followEmailLink: (linkText: string) => Promise<void>;
  uniqueUser: UserFixture;
  otherUser: UserFixture;
  loginFormLocator: Locator;
  org: OrgFixture & { reader: UserFixture };
  otherOrg: OrgFixture;
}

export * from "@playwright/test";

export function makeUserFixture(prefix: string) {
  return async ({ }, use: (r: UserFixture) => Promise<void>) => {
    const uniqueAddress = `${prefix}-${nanoid(10).toLowerCase()}@example.org`;
    const user = await safeRegisterUser(uniqueAddress, "password123");
    const org = await safeCreateOrg({
      displayName: uniqueAddress,
      primary: user,
      admins: [user],
    });
    await use({ ...user, org });
  };
}

export function makeOrgFixture(prefix: string) {
  return async ({ }, use: (r: OrgFixture) => Promise<void>) => {
    const uniqueAddress = `${prefix}-${nanoid(10).toLowerCase()}@example.org`;
    const primary = await safeRegisterUser(uniqueAddress, "password123");
    const editor = await safeRegisterUser(
      `${prefix}-editor@example.org`,
      "password123",
    );
    const reader = await safeRegisterUser(
      `${prefix}-reader@example.org`,
      "password123",
    );
    const org = await safeCreateOrg({
      displayName: uniqueAddress,
      primary: primary,
      admins: [primary],
      editors: [editor],
      readers: [reader],
    });

    const apiKey = await makeApiKey(org, primary);

    await use({
      ...org,
      apiKey,
      primary,
      admins: [primary],
      admin: primary,
      editors: [editor],
      editor,
      readers: [reader],
      reader,
    });
  };
}

export const test = playwrightTest.extend<AppFixtures>({
  loginFormLocator: async ({ page }, use) => {
    use(page.getByRole("heading", { name: "Login" }));
  },
  requiresAuthentication: async ({ page, loginFormLocator }, use) => {
    await use(async (route: string) => {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await expect(loginFormLocator).toBeVisible();
    });
  },
  signInAs: async ({ context }, use) => {
    await use(async (emailPassword: Selectable<IdentityEmailPasswords>) => {
      await signInAsEmailAddress(context, emailPassword.email_address);
    });
    await context.clearCookies();
  },
  signOut: async ({ context }, use) => {
    await use(async () => await context.clearCookies());
  },
  waitForEmail: async ({ page }, use) => {
    await use(async (recipient: string, subject: string) => {
      const [message] = await Promise.all([
        waitFor(() => getMostRecentMessage(recipient, subject)),
        page.goto("about:blank"),
      ]);
      await page.setContent(message.body, { waitUntil: "domcontentloaded" });
    });
  },
  followEmailLink: async ({ page }, use) => {
    await use(async (linkText: string) => {
      await followEmailLink(page, linkText);
    });
  },
  uniqueUser: makeUserFixture("unique"),
  otherUser: makeUserFixture("other-user"),
  org: async ({ }, use) => {
    const [orgReader, orgEditor, orgAdmin] = await Promise.all([
      safeRegisterUser(
        "org-reader@example.org",
        "password123",
        "Reader",
        "User",
      ),
      safeRegisterUser(
        "org-editor@example.org",
        "password123",
        "Editor",
        "User",
      ),
      safeRegisterUser("org-admin@example.org", "password123", "Admin", "User"),
    ]);

    const testOrg = await safeCreateOrg({
      displayName: "Test Org",
      primary: orgAdmin,
      admins: [orgAdmin],
      editors: [orgEditor],
      readers: [orgReader],
    });

    const apiKey = await makeApiKey(testOrg, orgAdmin);

    await use({
      ...testOrg,
      apiKey,
      primary: orgAdmin,
      admins: [orgAdmin],
      admin: orgAdmin,
      editors: [orgEditor],
      editor: orgEditor,
      readers: [orgReader],
      reader: orgReader,
    });
  },

  otherOrg: makeOrgFixture("other-org"),
});

export async function makeApiKey(
  org: Selectable<IdentityOrgs>,
  user: Awaited<ReturnType<typeof safeRegisterUser>>,
) {
  const token = `ef_${v4().replaceAll("-", "")}`;
  const apiKey = await createApiKey({
    token,
    webhookSecret: "test-secret",
    name: "Test API Key",
    orgId: org.id,
    userId: user.user_id,
    webhookUrl: null,
    webhookEvents: [],
    expired_at: null,
  });
  return apiKey;
}

export interface TestAgent {
  user: Awaited<ReturnType<typeof safeRegisterUser>>,
  org: Selectable<IdentityOrgs>,
  apiKey: Selectable<IdentityApiKeys>,
}

export async function makeTestAgent(name: string): Promise<TestAgent> {
  return executeSpan("makeTestAgent", async () => {
    const user = await safeRegisterUser(name, "password123");
    setSpanAttributes({ user });

    const org = await safeCreateOrg({
      displayName: name,
      primary: user,
      admins: [user],
    });

    setSpanAttributes({ org });

    const apiKey = await makeApiKey(org, user);
    setSpanAttributes({ apiKey })

    return { user, org, apiKey };
  });
}