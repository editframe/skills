import { test, expect } from "TEST/util/test";

test("Requires authentication", async ({ requiresAuthentication }) => {
  await requiresAuthentication("/welcome");
});

test("Does not show member/invite links to non-admins", async ({
  page,
  signInAs,
  org,
}) => {
  await signInAs(org.reader);
  await page.goto("/welcome");
  await expect(page.getByText("Members")).not.toBeVisible();
  await expect(page.getByText("Invites")).not.toBeVisible();
});
