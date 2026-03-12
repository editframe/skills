import { describe, test } from "vitest";
import { safeRegisterUser } from "@/sql-client.server/safeRegisterUser";
import {
  setupBrowser,
  getPage,
  getContext,
  waitForEmail,
  playwrightExpect,
} from "./setup";
import { signInAsEmailAddress } from "../util/signInAsEmailAddress";

setupBrowser();

describe.skip("update account", () => {
  test("Successful account update", async () => {
    const email = `${Date.now()}@example.org`;
    await safeRegisterUser(email, "password123");
    const context = getContext();
    await signInAsEmailAddress(context, email);
    const page = getPage();

    await page.goto("/settings");
    await page.getByLabel("First name").fill("John");
    await page.getByLabel("Last name").fill("Doe");
    const newEmail = `${Date.now()}@example.org`;
    await page.getByLabel("Email").fill(newEmail);
    await page.getByRole("button", { name: "Save changes" }).click();

    await playwrightExpect(
      page.getByText("User updated successfully!"),
    ).toBeVisible();

    await waitForEmail(
      newEmail,
      "[Editframe] Confirm your updated email address",
    );
  });

  test("Failed account update", async () => {
    const email = `${Date.now()}@example.org`;
    await safeRegisterUser(email, "password123");
    const context = getContext();
    await signInAsEmailAddress(context, email);
    const page = getPage();

    await page.goto("/settings");
    await page.getByLabel("First name").fill("John");
    await page.getByLabel("Last name").fill("Doe");
    await page.getByLabel("Email").fill("invalid-email");
    await page.getByRole("button", { name: "Save changes" }).click();

    await playwrightExpect(
      page.getByText(
        "There was an error updating your account. Please try again.",
      ),
    ).toBeVisible();
  });
});
