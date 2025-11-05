import { v4 } from "uuid";
import { setupServer } from "msw/node";
import { http, passthrough } from "msw";

import { Client, createUnprocessedFile, uploadUnprocessedReadableStream } from "@editframe/api";

import { test, expect, type Locator } from "../../util/test";
import { webReadableFromBuffers } from "../../util/readableFromBuffers";

const server = setupServer();
const assetsTest = test.extend<{
  assetsPageLink: Locator;
  assetsList: Locator;
  displayNameField: Locator;
  submitButton: Locator;
}>({
  assetsPageLink: async ({ page }, use) => {
    await use(page.getByRole("link", { name: "Assets" }));
  },
  assetsList: async ({ page }, use) => {
    await use(page.getByRole("list", { name: "Assets List" }));
  },
  displayNameField: async ({ page }, use) => {
    use(page.getByLabel("Display Name"));
  },
  submitButton: async ({ page }, use) => {
    use(page.getByRole("button", { name: "Create Organization" }));
  },
});

assetsTest("requires authentication", async ({ requiresAuthentication }) => {
  await requiresAuthentication("/assets");
});

assetsTest(
  "Upload an unprocessed file and delete it",
  async ({
    page,
    assetsPageLink,
    signInAs,
    uniqueUser,
    displayNameField,
    submitButton,
  }) => {
    await signInAs(uniqueUser);
    await page.goto("/organizations/new");

    const displayName = `New Organization ${uniqueUser.email_address}`;

    await displayNameField.fill(displayName);
    await submitButton.click();
    await expect(page.getByText(`Organization: ${displayName}`)).toBeVisible();

    await page.goto("/developers/new");
    await page.getByLabel("name", { exact: true }).fill("test");
    await page.getByRole("button", { name: "Create API key" }).click();
    const token =
      (await page
        .getByRole("textbox", { name: "Token", exact: true })
        .inputValue()) || "";
    const data = "ABCDEFGHI_________0123456789--------||||||||||";
    const buffer = Buffer.from(data);
    const md5 = v4();
    const client = new Client(token, process.env.PLAYWRIGHT_WEB_HOST);
    const unprocessedFile = await createUnprocessedFile(client, {
      md5,
      byte_size: buffer.byteLength,
      filename: "test.jpg",
    });

    const uploadUrl = `http://web:3000/api/v1/unprocessed_files/${unprocessedFile.id}/upload`;

    let requestCount = 0;
    server.use(
      http.all(uploadUrl, () => {
        requestCount++;
        return passthrough();
      }),
    );

    await uploadUnprocessedReadableStream(
      client,
      {
        id: unprocessedFile.id,
        byte_size: buffer.byteLength,
      },
      webReadableFromBuffers(buffer),
    ).whenUploaded();
    await page.goto(`/unprocessed/${unprocessedFile.id}/details`);

    await page.getByRole("button", { name: "Delete Asset" }).click();

    await page.getByRole("button", { name: "Delete", exact: true }).click();

    await expect(assetsPageLink).toBeVisible();
    await expect(
      page.getByText(`Asset ${unprocessedFile.id} has been deleted`),
    ).toBeVisible({
      timeout: 30000,
    });
  },
);
