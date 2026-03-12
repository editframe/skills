import {
  chromium,
  type Browser,
  type BrowserContext,
  type Page,
} from "playwright";
import { expect as playwrightExpect } from "@playwright/test";

playwrightExpect.configure({ timeout: 30_000 });
import { beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import { nanoid } from "nanoid";
import { safeRegisterUser } from "@/sql-client.server/safeRegisterUser";
import { safeCreateOrg } from "@/sql-client.server/safeCreateOrg";
import { signInAsEmailAddress as signInAsEmailAddressImpl } from "../util/signInAsEmailAddress";
import { getMostRecentMessage, deleteEmailsForAddress } from "../util/mailhog";
import { waitFor } from "../util/waitForValue";
import type {
  IdentityApiKeys,
  IdentityEmailPasswords,
  IdentityOrgs,
} from "@/sql-client.server/kysely-codegen";
import type { Selectable } from "kysely";
import { createApiKey } from "~/createApiKey.server";
import { v4 } from "uuid";

export { playwrightExpect, deleteEmailsForAddress };

export const BASE_URL = process.env.PLAYWRIGHT_WEB_HOST || "http://web:3000";

let browser: Browser;

interface TestState {
  context: BrowserContext;
  page: Page;
}

const state: TestState = {} as TestState;

export function getPage(): Page {
  return state.page;
}

export function getContext(): BrowserContext {
  return state.context;
}

export function setupBrowser() {
  beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
  });

  afterAll(async () => {
    await browser?.close();
  });

  beforeEach(async () => {
    state.context = await browser.newContext({
      baseURL: BASE_URL,
    });
    state.page = await state.context.newPage();
  });

  afterEach(async () => {
    await state.context?.close();
  });
}

export async function signInAs(user: Selectable<IdentityEmailPasswords>) {
  await signInAsEmailAddressImpl(state.context, user.email_address);
}

export async function signInAsEmail(email: string) {
  await signInAsEmailAddressImpl(state.context, email);
}

export async function signOut() {
  await state.context.clearCookies();
}

export async function waitForEmail(recipient: string, subject: string) {
  const message = await waitFor(
    () => getMostRecentMessage(recipient, subject),
    15_000,
  );
  await state.page.goto("about:blank");
  await state.page.setContent(message.body, {
    waitUntil: "domcontentloaded",
  });
}

export async function followEmailLink(linkText: string) {
  const page = state.page;
  const linkLocator = page.getByRole("link", { name: linkText });
  await playwrightExpect(linkLocator).toBeVisible();
  let link = await linkLocator.getAttribute("href");
  if (!link) {
    throw new Error(`Link not found in email preview: ${linkText}`);
  }
  // Replace any localhost-style origin with the test BASE_URL.
  // Emails may use a worktree domain (e.g. main.localhost) that
  // differs from the .env WEB_HOST.
  link = link.replace(/^https?:\/\/[a-z0-9.-]*localhost:\d+/, BASE_URL);
  await page.goto(link);
}

export async function requiresAuthentication(route: string) {
  await state.page.goto(route, { waitUntil: "domcontentloaded" });
  await playwrightExpect(state.page).toHaveURL(/\/auth\/login/);
}

interface UserFixture extends Selectable<IdentityEmailPasswords> {
  first_name: string | null;
  last_name: string | null;
  org?: Selectable<IdentityOrgs>;
}

export async function createUniqueUser(
  prefix = "unique",
): Promise<UserFixture> {
  const address = `${prefix}-${nanoid(10).toLowerCase()}@example.org`;
  const user = await safeRegisterUser(address, "password123");
  const org = await safeCreateOrg({
    displayName: address,
    primary: user,
    admins: [user],
  });
  return { ...user, org } as UserFixture;
}

export interface OrgFixture extends Selectable<IdentityOrgs> {
  primary: UserFixture;
  admin: UserFixture;
  admins: UserFixture[];
  editor: UserFixture;
  editors: UserFixture[];
  reader: UserFixture;
  readers: UserFixture[];
}

export async function createOrgFixture(prefix = "org"): Promise<OrgFixture> {
  const primary = await createUniqueUser(`${prefix}-admin`);
  const editor = await createUniqueUser(`${prefix}-editor`);
  const reader = await createUniqueUser(`${prefix}-reader`);
  const org = await safeCreateOrg({
    displayName: `${prefix}-${nanoid(6).toLowerCase()}`,
    primary,
    admins: [primary],
    editors: [editor],
    readers: [reader],
  });
  return {
    ...org,
    primary,
    admin: primary,
    admins: [primary],
    editor,
    editors: [editor],
    reader,
    readers: [reader],
  };
}

export interface FullOrgFixture extends OrgFixture {
  apiKey: Selectable<IdentityApiKeys>;
}

async function makeApiKey(
  org: Selectable<IdentityOrgs>,
  user: { user_id: string },
) {
  const token = `ef_${v4().replaceAll("-", "")}`;
  return createApiKey({
    token,
    webhookSecret: "test-secret",
    name: "Test API Key",
    orgId: org.id,
    userId: user.user_id,
    webhookUrl: null,
    webhookEvents: [],
    expired_at: null,
  });
}

export async function createFullOrgFixture(
  prefix = "full-org",
): Promise<FullOrgFixture> {
  const primary = await safeRegisterUser(
    `${prefix}-admin-${nanoid(6).toLowerCase()}@example.org`,
    "password123",
    "Admin",
    "User",
  );
  const editor = await safeRegisterUser(
    `${prefix}-editor-${nanoid(6).toLowerCase()}@example.org`,
    "password123",
    "Editor",
    "User",
  );
  const reader = await safeRegisterUser(
    `${prefix}-reader-${nanoid(6).toLowerCase()}@example.org`,
    "password123",
    "Reader",
    "User",
  );
  const org = await safeCreateOrg({
    displayName: `${prefix}-${nanoid(6).toLowerCase()}`,
    primary,
    admins: [primary],
    editors: [editor],
    readers: [reader],
  });
  const apiKey = await makeApiKey(org, primary);
  return {
    ...org,
    apiKey,
    primary: primary as UserFixture,
    admin: primary as UserFixture,
    admins: [primary as UserFixture],
    editor: editor as UserFixture,
    editors: [editor as UserFixture],
    reader: reader as UserFixture,
    readers: [reader as UserFixture],
  };
}
