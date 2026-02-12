import { describe, test, beforeAll } from "vitest";
import {
  setupBrowser,
  getPage,
  signInAs,
  requiresAuthentication,
  createFullOrgFixture,
  playwrightExpect,
  type FullOrgFixture,
} from "./setup";

setupBrowser();

let org: FullOrgFixture;

beforeAll(async () => {
  org = await createFullOrgFixture("welcome");
});

describe("welcome page", () => {
  test("Requires authentication", async () => {
    await requiresAuthentication("/welcome");
  });

  test("Does not show member/invite links to non-admins", async () => {
    const page = getPage();
    await signInAs(org.reader);
    await page.goto("/welcome");
    await playwrightExpect(page.getByText("Members")).not.toBeVisible();
    await playwrightExpect(page.getByText("Invites")).not.toBeVisible();
  });
});
