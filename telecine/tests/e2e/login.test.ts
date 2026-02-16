import { describe, test, beforeAll } from "vitest";
import {
  setupBrowser,
  getPage,
  signInAs,
  waitForEmail,
  followEmailLink,
  createUniqueUser,
  playwrightExpect,
} from "./setup";
import type { Selectable } from "kysely";
import type { IdentityEmailPasswords } from "@/sql-client.server/kysely-codegen";

setupBrowser();

interface UserFixture extends Selectable<IdentityEmailPasswords> {
  first_name: string | null;
  last_name: string | null;
}

let uniqueUser: UserFixture;

beforeAll(async () => {
  uniqueUser = await createUniqueUser("login");
});

describe("login", () => {
  test("redirects to welcome if signed in", async () => {
    const page = getPage();
    await signInAs(uniqueUser);
    await page.goto("/auth/login");
    // After login redirect, should no longer be on /auth/login
    await playwrightExpect(page).not.toHaveURL(/\/auth\/login/);
  });

  test("Successful login", async () => {
    const page = getPage();
    await page.goto("/auth/login");
    await page.getByLabel("Email address").fill(uniqueUser.email_address);
    await page.getByLabel("Password").fill("password123");
    await page.getByRole("button", { name: "Login" }).last().click();
    await playwrightExpect(
      page.getByRole("heading", { name: "Welcome" }),
    ).toBeVisible();
  });

  test("login for non-existing user", async () => {
    const page = getPage();
    await page.goto("/auth/login");
    await page.getByLabel("Email address").fill("not-a-user@example.org");
    await page.getByLabel("Password").fill("password123");
    await page.getByRole("button", { name: "Login" }).last().click();
    await playwrightExpect(
      page.getByText("Incorrect email address or password"),
    ).toBeVisible();
  });

  test("login with wrong password", async () => {
    const page = getPage();
    await page.goto("/auth/login");
    await page.getByLabel("Email address").fill(uniqueUser.email_address);
    await page.getByLabel("Password").fill("wrong-password");
    await page.getByRole("button", { name: "Login" }).last().click();
    await playwrightExpect(
      page.getByText("Incorrect email address or password"),
    ).toBeVisible();
  });

  test("login using magic link", async () => {
    const page = getPage();
    await page.goto("/auth/magic-link");
    await page.getByLabel("Email address").fill(uniqueUser.email_address);
    await page.getByRole("button", { name: "Send a magic link" }).click();
    await playwrightExpect(
      page.getByText("Magic link sent to your email address."),
    ).toBeVisible();
    await waitForEmail(
      uniqueUser.email_address,
      "[Editframe] Login with magic link",
    );
    await followEmailLink("Login with magic link");
    await playwrightExpect(
      page.getByRole("heading", { name: "Welcome" }),
    ).toBeVisible();
  });
});
