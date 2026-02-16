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
  org = await createFullOrgFixture("apikey-detail");
});

describe("api keys - detail", () => {
  test("Requires authentication", async () => {
    await requiresAuthentication("/resource/api_keys/123");
  });

  test("Requires editor permissions", async () => {
    const page = getPage();
    await signInAs(org.reader);
    await page.goto(
      `/resource/api_keys/${org.apiKey.id}?org=${org.id}`,
    );

    await playwrightExpect(
      page.getByText(/You don't have permission/),
    ).toBeVisible();
    await playwrightExpect(
      page.getByRole("button", { name: "Save changes" }),
    ).not.toBeVisible();
    await page.getByRole("link", { name: "Go back" }).click();
    await playwrightExpect(page).toHaveURL(/\/resource\/api_keys/);
  });

  test("Displays API key details for admin", async () => {
    const page = getPage();
    await signInAs(org.primary);
    await page.goto(
      `/resource/api_keys/${org.apiKey.id}?org=${org.id}`,
    );

    await playwrightExpect(
      page.getByText(`API Key: ${org.apiKey.name}`),
    ).toBeVisible();
    await playwrightExpect(
      page.getByText(/This API key will/),
    ).toBeVisible();
  });

  test.skip("Can regenerate API token", async () => {
    const freshOrg = await createFullOrgFixture("apikey-regen");
    const page = getPage();
    await signInAs(freshOrg.primary);
    await page.goto(
      `/resource/api_keys/${freshOrg.apiKey.id}?org=${freshOrg.id}`,
    );

    await page.getByRole("button", { name: "Regenerate Token" }).click();
    await page
      .getByLabel(/Type .* to confirm/)
      .fill(freshOrg.apiKey.name);
    await page
      .getByRole("button", { name: "Regenerate", exact: true })
      .click();

    await playwrightExpect(page.getByText("Regenerated!")).toBeVisible();
    await playwrightExpect(
      page.getByText("Copy API Token"),
    ).toBeVisible();
  });

  test("Can update API key details", async () => {
    const page = getPage();
    await signInAs(org.primary);
    await page.goto(
      `/resource/api_keys/${org.apiKey.id}?org=${org.id}`,
    );

    await page.getByLabel("name").fill("Updated API Key");
    await page.getByRole("button", { name: "Save changes" }).click();

    await playwrightExpect(
      page.getByText("API Key: Updated API Key"),
    ).toBeVisible();
  });

  test.skip("Can configure webhooks", async () => {
    const freshOrg = await createFullOrgFixture("apikey-webhook");
    const page = getPage();
    await signInAs(freshOrg.primary);
    await page.goto(
      `/resource/api_keys/${freshOrg.apiKey.id}?org=${freshOrg.id}`,
    );

    await page
      .getByLabel("Webhook URL")
      .fill("https://example.com/webhook");
    await page.getByText("render.created").click();
    await page.getByText("render.failed").click();

    await page.getByRole("button", { name: "Save changes" }).click();

    await playwrightExpect(
      page.getByRole("heading", {
        name: "API key updated successfully",
      }),
    ).toBeVisible();
  });

  test.skip("Can regenerate webhook signing secret", async () => {
    const freshOrg = await createFullOrgFixture("apikey-wh-regen");
    const page = getPage();
    await signInAs(freshOrg.primary);
    await page.goto(
      `/resource/api_keys/${freshOrg.apiKey.id}?org=${freshOrg.id}`,
    );

    await page
      .getByRole("button", { name: "Regenerate Webhook Secret" })
      .click();
    await page
      .getByLabel(/Type .* to confirm/)
      .fill(freshOrg.apiKey.name);
    await page
      .getByRole("button", { name: "Regenerate", exact: true })
      .click();

    await playwrightExpect(page.getByText("Regenerated!")).toBeVisible();
    await playwrightExpect(
      page.getByText("Copy Webhook Signing Secret"),
    ).toBeVisible();
  });

  describe("extend expiration", () => {
    let extendOrg: FullOrgFixture;

    beforeAll(async () => {
      extendOrg = await createFullOrgFixture("apikey-extend");
    });

    test.skip("Can extend expiration", async () => {
      const page = getPage();
      await signInAs(extendOrg.primary);
      await page.goto(
        `/resource/api_keys/${extendOrg.apiKey.id}?org=${extendOrg.id}`,
        { waitUntil: "domcontentloaded" },
      );

      const extendButton = page.getByRole("button", { name: "Extend Expiration" });
      await extendButton.waitFor({ state: "visible" });
      await extendButton.click();

      const dialog = page.getByRole("dialog");
      await dialog.waitFor({ state: "visible" });
      await dialog.getByLabel("Extension period").click();
      await page.getByRole("option", { name: /day/ }).click();
      await dialog.getByRole("button", { name: "Extend Expiration" }).click();

      await playwrightExpect(
        page.getByText(/will expire in/),
      ).toBeVisible();
    });
  });

  test.skip("Can delete API key", async () => {
    const freshOrg = await createFullOrgFixture("apikey-delete");
    const page = getPage();
    await signInAs(freshOrg.primary);
    await page.goto(
      `/resource/api_keys/${freshOrg.apiKey.id}?org=${freshOrg.id}`,
    );

    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await page
      .getByLabel(/Type .* to confirm/)
      .fill(freshOrg.apiKey.name);
    await page
      .getByLabel("Delete API key for Test API")
      .getByRole("button", { name: "Delete", exact: true })
      .click();

    await playwrightExpect(page.getByText("API key deleted")).toBeVisible();
  });

  test("Validates webhook URL format when updating", async () => {
    const page = getPage();
    await signInAs(org.primary);
    await page.goto(
      `/resource/api_keys/${org.apiKey.id}?org=${org.id}`,
    );

    await page.getByLabel("Webhook URL").fill("not-a-url");
    await page.getByRole("button", { name: "Save changes" }).click();

    await playwrightExpect(
      page.getByText(
        "Must be a valid URL starting with http:// or https://",
      ),
    ).toBeVisible();
  });
});
