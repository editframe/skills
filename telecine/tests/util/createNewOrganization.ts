import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

export const createNewOrganizationTest = async (
  page: Page,
  displayName: string,
) => {
  await page.goto("/organizations/new");

  await page.getByLabel("Display Name").fill(displayName);

  await page.getByRole("button", { name: "Create Organization" }).click();

  await page.waitForTimeout(1000);

  await expect(page.locator("h1")).toHaveText(`Organization: ${displayName}`);
};
