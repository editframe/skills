import { test, expect, type Locator } from "../../util/test";
import { v4 } from "uuid";
import { uploadFragmentIndex, createISOBMFFFile } from "@editframe/api";
import { setupServer } from "msw/node";
import { webReadableFromBuffers } from "../../util/readableFromBuffers";
import { http, passthrough } from "msw";
import { Client } from "@editframe/api";
import { createISOBMFFTrack, uploadISOBMFFTrack } from "@editframe/api";

function createTestTrack(
  options: Partial<Parameters<typeof createISOBMFFTrack>[1]> = {},
) {
  return Object.assign(
    {
      file_id: "test-id",
      track_id: 1,
      type: "audio",
      probe_info: {
        channels: 2,
        sample_rate: "44100",
        duration: 1000,
        duration_ts: 1000,
        start_time: 0,
        start_pts: 0,
        r_frame_rate: "100",
        channel_layout: "stereo",
        codec_tag_string: "mp3",
        codec_long_name: "MP3",
        codec_type: "audio",
        codec_tag: "0x0000",
        codec_name: "aac",
        bits_per_sample: 16,
        index: 0,
        sample_fmt: "s16",
        time_base: "100",
        avg_frame_rate: "100",
        disposition: {},
        bit_rate: "100",
      },
      duration_ms: 1000,
      codec_name: "mp3",
      byte_size: 1024 * 1024 * 5,
    } as const,
    options,
  );
}
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
  "Upload an fragement index file and tracks and delete it",
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
    const isoFile = await createISOBMFFFile(client, {
      md5,
      filename: "test.mp4",
    });

    const uploadUrl = `http://web:3000/api/v1/isobmff_files/${isoFile.id}/index/upload`;

    let requestCount = 0;
    server.use(
      http.all(uploadUrl, () => {
        requestCount++;
        return passthrough();
      }),
    );

    await uploadFragmentIndex(
      client,
      isoFile.id,
      webReadableFromBuffers(buffer),
      buffer.byteLength,
    );

    const track = await createISOBMFFTrack(
      client,
      createTestTrack({
        file_id: isoFile.id,
        track_id: 0,
        byte_size: buffer.byteLength,
      }),
    );

    await uploadISOBMFFTrack(
      client,
      track.file_id,
      track.track_id,
      webReadableFromBuffers(buffer),
      buffer.byteLength,
    ).whenUploaded();

    await page.goto(`/assets/${isoFile.id}/details`);
    // click on the Delete button
    await page.getByRole("button", { name: "Delete Asset" }).click();
    // confirm the deletion
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await expect(assetsPageLink).toBeVisible();
  },
);
assetsTest(
  "Upload an fragement index file and delete it",
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
    const isoFile = await createISOBMFFFile(client, {
      md5,
      filename: "test.mp4",
    });

    const uploadUrl = `http://web:3000/api/v1/isobmff_files/${isoFile.id}/index/upload`;

    let requestCount = 0;
    server.use(
      http.all(uploadUrl, () => {
        requestCount++;
        return passthrough();
      }),
    );

    await uploadFragmentIndex(
      client,
      isoFile.id,
      webReadableFromBuffers(buffer),
      buffer.byteLength,
    );
    await page.goto(`/assets/${isoFile.id}/details`);
    await page.getByRole("button", { name: "Delete Asset" }).click();

    await page.getByRole("button", { name: "Delete", exact: true }).click();

    await expect(assetsPageLink).toBeVisible();

    await expect(
      page.getByText(`Asset ${isoFile.id} has been deleted`),
    ).toBeVisible({
      timeout: 30000,
    });
  },
);
