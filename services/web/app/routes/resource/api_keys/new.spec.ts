import { test, expect } from "TEST/util/test";

test("Requires authentication", async ({ requiresAuthentication }) => {
  await requiresAuthentication("/resource/api_keys/new?org=123");
});

test("Requires editor permissions", async ({ page, signInAs, org }) => {
  await signInAs(org.reader);
  await page.goto(`/resource/api_keys/new?org=${org.id}`);

  // Should show permission denied message
  await expect(page.getByText(/You don't have permission/)).toBeVisible();
  // Create button should not be visible
  await expect(
    page.getByRole("button", { name: "Create API key" }),
  ).not.toBeVisible();
  // Go back button should be visible
  await page.getByRole("link", { name: "Go back" }).click();
  // Should redirect to the API keys page
  expect(page.url()).toMatch(/\/resource\/api_keys/);
});

test("Displays API key creation form for admin", async ({
  page,
  signInAs,
  org,
}) => {
  await signInAs(org.primary);
  await page.goto(`/resource/api_keys/new?org=${org.id}`);

  await expect(
    page.getByRole("heading", { name: "New API Key" }),
  ).toBeVisible();

  const nameInput = page.getByLabel("name");
  const expiresSelect = page.getByRole("button", { name: "Expires at" });
  const webhookUrlInput = page.getByPlaceholder("Enter your Webhook URL");

  await expect(nameInput).toBeVisible();
  await expect(expiresSelect).toBeVisible();
  await expect(webhookUrlInput).toBeVisible();
});

test("Creates new API key with basic info", async ({ page, signInAs, org }) => {
  await signInAs(org.primary);
  await page.goto(`/resource/api_keys/new?org=${org.id}`);

  await page.getByLabel("name").fill("Test API Key");
  await page.getByRole("button", { name: "Expires at" }).click();
  await page.getByRole("option", { name: "month" }).click();

  await page.getByRole("button", { name: "Create API key" }).click();

  await expect(page.getByText("API Key: Test API Key")).toBeVisible();
  await expect(page.getByText(/will expire in 29 days/)).toBeVisible();
});

test("Shows secrets to be copied after creation", async ({
  page,
  signInAs,
  org,
}) => {
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

  await expect(page.getByText("API Key: Test API Key")).toBeVisible();

  // Verify the format of both secret
  await expect(page.getByLabel("Copy API Token")).toBeVisible();
  await expect(page.getByLabel("Copy Webhook Signing Secret")).toBeVisible();
});

test("Creates API key with webhook configuration", async ({
  page,
  signInAs,
  org,
}) => {
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

  await expect(page.getByText("API Key: Test API Key")).toBeVisible();
});

test("Validates required fields", async ({ page, signInAs, org }) => {
  await signInAs(org.primary);
  await page.goto(`/resource/api_keys/new?org=${org.id}`);

  // Try to submit without required fields
  await page.getByRole("button", { name: "Create API key" }).click();

  // Should show validation errors
  await expect(page.getByText("Name cannot be blank")).toBeVisible();
});

test("Validates webhook URL format", async ({ page, signInAs, org }) => {
  await signInAs(org.primary);
  await page.goto(`/resource/api_keys/new?org=${org.id}`);

  await page.getByLabel("name").fill("Test Key");
  await page.getByRole("button", { name: "Expires at" }).click();
  await page.getByRole("option", { name: "month" }).click();
  await page.getByPlaceholder("Enter your Webhook URL").fill("not-a-url");

  await page.getByRole("button", { name: "Create API key" }).click();

  await expect(
    page.getByText("Must be a valid URL starting with http:// or https://"),
  ).toBeVisible();
});
