import { test, expect } from "@playwright/test";
import { nanoid } from "nanoid";
import { safeRegisterUser } from "../../lib/sql-client.server/safeRegisterUser";
import { signInAsEmailAddress } from "../util/signInAsEmailAddress";

test.beforeEach(async () => {
  await safeRegisterUser("login-test@example.org", "password123");
});

test("redirects to welcome if signed in", async ({ page, context }) => {
  await signInAsEmailAddress(context, "login-test@example.org");

  await page.goto("/auth/register");

  await expect(page.getByText("Welcome login-test@example.org")).toBeVisible();
});

test("Successful registration", async ({ page }) => {
  const unique = nanoid(8);
  await page.goto("/auth/register");

  const email = `test-${unique}@example.org`;

  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("password123");
  await page.getByLabel("Confirm password").fill("password123");

  await page.getByRole("button", { name: "Register" }).click();

  await page.getByLabel("First name").fill("Test");
  await page.getByLabel("Last name").fill("User");
  await page.getByLabel("Organization name").fill("Test Org");
  await page.getByRole("button", { name: "Continue" }).click();

  await page.getByRole("button", { name: "Finish setup" }).click();

  await expect(page.getByText(`Welcome ${email}`)).toBeVisible();

  await page.goto("/organizations");

  await expect(page.getByText("Test Org")).toBeVisible();
});
test("Successful registration and skipping referrer", async ({ page }) => {
  const unique = nanoid(8);
  await page.goto("/auth/register");

  const email = `test-${unique}@example.org`;

  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("password123");
  await page.getByLabel("Confirm password").fill("password123");

  await page.getByRole("button", { name: "Register" }).click();

  await page.getByLabel("First name").fill("Test");
  await page.getByLabel("Last name").fill("User");
  await page.getByLabel("Organization name").fill("Test Org");
  await page.getByRole("button", { name: "Continue" }).click();

  await page.getByRole("link", { name: "Skip for now" }).click();

  await expect(page.getByText(`Welcome ${email}`)).toBeVisible();

  await page.goto("/organizations");

  await expect(page.getByText("Test Org")).toBeVisible();
});

test("Failed duplicate registration", async ({ page }) => {
  await safeRegisterUser("dup@example.org", "password123");

  await page.goto("/auth/register");

  await page.getByLabel("Email address").fill("dup@example.org");
  await page.getByLabel("Password", { exact: true }).fill("password123");
  await page.getByLabel("Confirm password").fill("password123");

  await page.getByRole("button", { name: "Register" }).click();

  await expect(page.getByText("Email address already in use")).toBeVisible();
});

test("Failed short password", async ({ page }) => {
  await page.goto("/auth/register");

  await page.getByLabel("Email address").fill("test@example.org");

  await page.getByLabel("Password", { exact: true }).fill("123");
  await page.getByLabel("Confirm password").fill("123");

  await page.getByRole("button", { name: "Register" }).click();

  await expect(page.locator("input[name=password]:invalid")).toBeVisible();
  await expect(
    page.locator("input[name=password_confirmation]:invalid"),
  ).toBeVisible();
});

test("Validates email input", async ({ page }) => {
  await page.goto("/auth/register");

  await page.getByLabel("Email address").fill("test");

  await page.getByLabel("Password", { exact: true }).fill("password123");
  await page.getByLabel("Confirm password").fill("password123");

  await page.getByRole("button", { name: "Register" }).click();

  await expect(page.locator("input[name=email_address]:invalid")).toBeVisible();
});
