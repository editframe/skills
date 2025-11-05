import { test, expect, type Locator } from "../util/test";

const loginTest = test.extend<{
  emailAddressField: Locator;
  passwordField: Locator;
  loginButton: Locator;
  welcomeMessage: Locator;
  loginFailedMessage: Locator;
  loginMagicLinkMessage: Locator;
  magicLink: Locator;
  magicLinkButton: Locator;
}>({
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
  loginFailedMessage: async ({ page }, use) => {
    await use(page.getByText("Incorrect email address or password"));
  },
  loginMagicLinkMessage: async ({ page }, use) => {
    await use(page.getByText("Magic link sent to your email address."));
  },
  magicLink: async ({ page }, use) => {
    await use(page.getByRole("link", { name: "Login with magic link" }));
  },
  magicLinkButton: async ({ page }, use) => {
    await use(page.getByRole("button", { name: "Send a magic link" }));
  },
});

loginTest(
  "redirects to welcome if signed in",
  async ({ page, uniqueUser, signInAs, welcomeMessage }) => {
    await signInAs(uniqueUser);
    await page.goto("/auth/login");
    await expect(welcomeMessage).toBeVisible();
  },
);

loginTest(
  "Successful login",
  async ({
    page,
    uniqueUser,
    emailAddressField,
    passwordField,
    loginButton,
    welcomeMessage,
  }) => {
    await page.goto("/auth/login");
    await emailAddressField.fill(uniqueUser.email_address);
    await passwordField.fill("password123");
    await loginButton.click();
    await expect(welcomeMessage).toBeVisible();
  },
);

loginTest(
  "login for non-existing user",
  async ({
    page,
    emailAddressField,
    passwordField,
    loginButton,
    loginFailedMessage,
  }) => {
    await page.goto("/auth/login");
    await emailAddressField.fill("not-a-user@example.org");
    await passwordField.fill("password123");
    await loginButton.click();
    await expect(loginFailedMessage).toBeVisible();
  },
);

loginTest(
  "login with wrong password",
  async ({
    page,
    uniqueUser,
    emailAddressField,
    passwordField,
    loginButton,
    loginFailedMessage,
  }) => {
    await page.goto("/auth/login");
    await emailAddressField.fill(uniqueUser.email_address);
    await passwordField.fill("wrong-password");
    await loginButton.click();
    await expect(loginFailedMessage).toBeVisible();
  },
);

loginTest(
  "login using magic link",
  async ({
    page,
    uniqueUser,
    emailAddressField,
    magicLinkButton,
    loginMagicLinkMessage,
    waitForEmail,
    magicLink,
    welcomeMessage,
  }) => {
    await page.goto("/auth/magic-link");
    await emailAddressField.fill(uniqueUser.email_address);
    await magicLinkButton.click();
    await expect(loginMagicLinkMessage).toBeVisible();
    await waitForEmail(
      uniqueUser.email_address,
      "[Editframe] Login with magic link",
    );
    await magicLink.click();
    await expect(welcomeMessage).toBeVisible();
  },
);
