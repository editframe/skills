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
  org = await createFullOrgFixture("apikey-new");
});

describe("api keys - new", () => {
  test("Requires authentication", async () => {
    await requiresAuthentication("/resource/api_keys/new?org=123");
  });

  test("Requires editor permissions", async () => {
    const page = getPage();
    await signInAs(org.reader);
    await page.goto(`/resource/api_keys/new?org=${org.id}`);

    await playwrightExpect(
      page.getByText(/You don't have permission/),
    ).toBeVisible();
    await playwrightExpect(
      page.getByRole("button", { name: "Create API key" }),
    ).not.toBeVisible();
    await page.getByRole("link", { name: "Go back" }).click();
    await playwrightExpect(page).toHaveURL(/\/resource\/api_keys/);
  });

  test("Displays API key creation form for admin", async () => {
    const page = getPage();
    await signInAs(org.primary);
    await page.goto(`/resource/api_keys/new?org=${org.id}`);

    await playwrightExpect(
      page.getByRole("heading", { name: "New API Key" }),
    ).toBeVisible();

    const nameInput = page.getByLabel("name");
    const expiresSelect = page.getByRole("button", { name: "Expires at" });
    const webhookUrlInput = page.getByPlaceholder("Enter your Webhook URL");

    await playwrightExpect(nameInput).toBeVisible();
    await playwrightExpect(expiresSelect).toBeVisible();
    await playwrightExpect(webhookUrlInput).toBeVisible();
  });

  test("Creates new API key with basic info", async () => {
    const page = getPage();
    await signInAs(org.primary);
    await page.goto(`/resource/api_keys/new?org=${org.id}`);

    await page.getByLabel("name").fill("Test API Key");
    await page.getByRole("button", { name: "Expires at" }).click();
    await page.getByRole("option", { name: "month" }).click();

    await page.getByRole("button", { name: "Create API key" }).click();
    await playwrightExpect(page).not.toHaveURL(/\/new/);

    await playwrightExpect(
      page.getByText("API Key: Test API Key"),
    ).toBeVisible();
    await playwrightExpect(
      page.getByText(/will expire in \d+ days? from now/),
    ).toBeVisible();
  });

  test.skip("Shows secrets to be copied after creation", async () => {
    const page = getPage();
    await signInAs(org.primary);
    await page.goto(`/resource/api_keys/new?org=${org.id}`);

    await page.getByLabel("name").fill("Test API Key");
    await page.getByRole("button", { name: "Expires at" }).click();
    await page.getByRole("option", { name: "month" }).click();
    await page
      .getByPlaceholder("Enter your Webhook URL")
      .fill("https://example.com/webhook");

    await page.getByText("render.created").click();
    await page.getByText("render.failed").click();

    await page.getByRole("button", { name: "Create API key" }).click();

    await playwrightExpect(
      page.getByText("API Key: Test API Key"),
    ).toBeVisible();
    await playwrightExpect(page.getByLabel("Copy API Token")).toBeVisible();
    await playwrightExpect(
      page.getByLabel("Copy Webhook Signing Secret"),
    ).toBeVisible();
  });

  test("Creates API key with webhook configuration", async () => {
    const page = getPage();
    await signInAs(org.primary);
    await page.goto(`/resource/api_keys/new?org=${org.id}`);

    await page.getByLabel("name").fill("Webhook API Key");
    await page.getByRole("button", { name: "Expires at" }).click();
    await page.getByRole("option", { name: "month" }).click();
    await page
      .getByPlaceholder("Enter your Webhook URL")
      .fill("https://example.com/webhook");

    await page.getByLabel("render.created").check();
    await page.getByLabel("render.failed").check();

    await page.getByRole("button", { name: "Create API key" }).click();

    // Wait for redirect to detail page
    await playwrightExpect(page).not.toHaveURL(/\/new/);
    await playwrightExpect(
      page.getByText("API Key: Webhook API Key"),
    ).toBeVisible();
  });

  test("Validates required fields", async () => {
    const page = getPage();
    await signInAs(org.primary);
    await page.goto(`/resource/api_keys/new?org=${org.id}`);

    await page.getByRole("button", { name: "Create API key" }).click();

    await playwrightExpect(
      page.getByText("Name cannot be blank"),
    ).toBeVisible();
  });

  test("Validates webhook URL format", async () => {
    const page = getPage();
    await signInAs(org.primary);
    await page.goto(`/resource/api_keys/new?org=${org.id}`);

    await page.getByLabel("name").fill("Test Key");
    await page.getByRole("button", { name: "Expires at" }).click();
    await page.getByRole("option", { name: "month" }).click();
    await page.getByPlaceholder("Enter your Webhook URL").fill("not-a-url");

    await page.getByRole("button", { name: "Create API key" }).click();

    await playwrightExpect(
      page.getByText("Must be a valid URL starting with http:// or https://"),
    ).toBeVisible();
  });
});
