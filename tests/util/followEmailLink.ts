import { expect, type Page } from "@playwright/test";

export async function followEmailLink(page: Page, linkText: string) {
  // Pulling the url out of the link because the link will open a new tab,
  // which is harder to test.
  const linkLocator = page.getByRole("link", { name: linkText });

  await expect(linkLocator).toBeVisible();

  let link = await linkLocator.getAttribute("href");

  if (!link) {
    throw new Error(`Link not found in email preview: ${linkText}`);
  }

  // Tests may be running in either the local or the docker-compose environment.
  // So we need to replace the host in the link with the correct one for that test environment.
  link = link.replace(process.env.WEB_HOST!, process.env.PLAYWRIGHT_WEB_HOST!);

  await page.goto(link!);
}
