import { test, expect, type Locator } from "../util/test";

const adminDashboardTest = test.extend<{
  confirmationLink: Locator;
  emailAddressField: Locator;
  passwordField: Locator;
  loginButton: Locator;
  welcomeMessage: Locator;
}>({
  confirmationLink: async ({ page }, use) => {
    await use(page.getByRole("link", { name: "Confirm your email address" }));
  },
  emailAddressField: async ({ page }, use) => {
    await use(page.getByLabel("Email address"));
  },
  passwordField: async ({ page }, use) => {
    await use(page.getByLabel("Password"));
  },
  loginButton: async ({ page }, use) => {
    await use(page.getByRole("button", { name: "Login" }).last());
  },
  welcomeMessage: async ({ page, uniqueUser }, use) => {
    await use(page.getByText(`Welcome ${uniqueUser.email_address}`));
  },
});

// adminDashboardTest(
//   "Editframe admin non registered user",
//   async ({
//     page,
//     waitForEmail,
//     confirmationLink,
//     uniqueUser,
//     emailAddressField,
//   }) => {
//     await page.goto("/auth/register");

//     const email = `${Math.random()}@editframe.com`;

//     await emailAddressField.fill(email);
//     await page.getByLabel("Password", { exact: true }).fill("password123");
//     await page.getByLabel("Confirm password").fill("password123");

//     await page.getByRole("button", { name: "Register" }).click();

//     await page.getByLabel("First name").fill("Test");
//     await page.getByLabel("Last name").fill("User");
//     await page.getByLabel("Organization name").fill("Editframe");
//     await page.getByRole("button", { name: "Continue" }).click();

//     await page.getByRole("button", { name: "Finish setup" }).click();

//     await expect(page.getByText(`Welcome ${email}`)).toBeVisible();

//     await waitForEmail(uniqueUser.email_address, "Confirm your email address");
//     await confirmationLink.click();

//     await page.goto("/admin");
//     await expect(page.getByText(`Welcome ${email}`)).toBeVisible();
//   },
// );
// adminDashboardTest(
//   "Editframe admin registered user",
//   async ({ page, emailAddressField }) => {
//     await page.goto("/auth/register");
//     const email = `collin@editframe.com`;

//     await emailAddressField.fill(email);
//     await page.getByLabel("Password", { exact: true }).fill("password123");
//     await page.getByLabel("Confirm password").fill("password123");

//     await page.getByRole("button", { name: "Register" }).click();

//     await page.getByLabel("First name").fill("Test");
//     await page.getByLabel("Last name").fill("User");
//     await page.getByLabel("Organization name").fill("Editframe");
//     await page.getByRole("button", { name: "Continue" }).click();

//     await page.getByRole("button", { name: "Finish setup" }).click();

//     await expect(page.getByText(`Welcome ${email}`)).toBeVisible();

//     await page.goto("/admin");
//     await expect(page.getByText("Back Office")).toBeVisible();
//   },
// );
adminDashboardTest.skip(
  "Editframe non admin user",
  async ({
    page,
    waitForEmail,
    confirmationLink,
    uniqueUser,
    emailAddressField,
  }) => {
    await page.goto("/auth/register");

    const email = "collin@editframe.com";

    await emailAddressField.fill(email);
    await page.getByLabel("Password", { exact: true }).fill("password123");
    await page.getByLabel("Confirm password").fill("password123");

    await page.getByRole("button", { name: "Register" }).click();

    await page.getByLabel("First name").fill("Test");
    await page.getByLabel("Last name").fill("User");
    await page.getByLabel("Organization name").fill("Editframe");
    await page.getByRole("button", { name: "Continue" }).click();

    await page.getByRole("button", { name: "Finish setup" }).click();

    await expect(page.getByText(`Welcome ${email}`)).toBeVisible();

    await waitForEmail(
      uniqueUser.email_address,
      "[Editframe] Confirm your email address",
    );
    await confirmationLink.click();

    await page.goto("/admin");
    await expect(page.getByText(`Welcome ${email}`)).toBeVisible();
  },
);
