import { describe, test, beforeEach, afterEach } from "vitest";
import { v4 } from "uuid";
import {
  createImageFile,
  uploadImageFile,
  createCaptionFile,
  uploadCaptionFile,
  createISOBMFFFile,
  uploadFragmentIndex,
  createISOBMFFTrack,
  uploadISOBMFFTrack,
  createUnprocessedFile,
  uploadUnprocessedReadableStream,
  Client,
} from "@editframe/api";
import { setupServer } from "msw/node";
import { http, passthrough } from "msw";
import { webReadableFromBuffers } from "../util/readableFromBuffers";
import {
  setupBrowser,
  getPage,
  signInAs,
  requiresAuthentication,
  createUniqueUser,
  playwrightExpect,
  BASE_URL,
} from "./setup";

const server = setupServer();

setupBrowser();

beforeEach(() => {
  server.listen({ onUnhandledRequest: "bypass" });
});

afterEach(() => {
  server.resetHandlers();
  server.close();
});

async function createApiTokenViaUI() {
  const user = await createUniqueUser("asset");
  const page = getPage();
  await signInAs(user);
  await page.goto("/organizations/new");

  const displayName = `New Organization ${user.email_address}`;
  await page.getByLabel("Display Name").fill(displayName);
  await page.getByRole("button", { name: "Create Organization" }).click();

  await playwrightExpect(
    page.getByText(`Organization: ${displayName}`),
  ).toBeVisible();

  await page.goto("/developers/new");
  await page.getByLabel("name", { exact: true }).fill("test");
  await page.getByRole("button", { name: "Create API key" }).click();

  const token =
    (await page
      .getByRole("textbox", { name: "Token", exact: true })
      .inputValue()) || "";

  return { user, token, page };
}

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

describe("assets", () => {
  test("requires authentication", async () => {
    await requiresAuthentication("/assets");
  });

  test("Upload an image file and delete it", async () => {
    const { token, page } = await createApiTokenViaUI();
    const data = "ABCDEFGHI_________0123456789--------||||||||||";
    const buffer = Buffer.from(data);
    const md5 = v4();
    const client = new Client(token, BASE_URL);

    const imageFile = await createImageFile(client, {
      md5,
      byte_size: buffer.byteLength,
      width: 100,
      height: 100,
      mime_type: "image/jpeg",
      filename: "test.jpg",
    });

    const uploadUrl = `http://web:3000/api/v1/image_files/${imageFile.id}/upload`;
    server.use(http.all(uploadUrl, () => passthrough()));

    await uploadImageFile(
      client,
      { id: imageFile.id, byte_size: buffer.byteLength },
      webReadableFromBuffers(buffer),
    ).whenUploaded();

    await page.goto(`/images/${imageFile.id}/details`);
    await page.getByRole("button", { name: "Delete Asset" }).click();
    await page.getByRole("button", { name: "Delete", exact: true }).click();

    await playwrightExpect(
      page.getByRole("link", { name: "Assets" }),
    ).toBeVisible();
    await playwrightExpect(
      page.getByText(`Asset ${imageFile.id} has been deleted`),
    ).toBeVisible({ timeout: 30000 });
  });

  test("Upload a caption file and delete it", async () => {
    const { token, page } = await createApiTokenViaUI();
    const data = "ABCDEFGHI_________0123456789--------||||||||||";
    const buffer = Buffer.from(data);
    const md5 = v4();
    const client = new Client(token, BASE_URL);

    const captionFile = await createCaptionFile(client, {
      md5,
      byte_size: 1024,
      filename: "test.json",
    });

    const uploadUrl = `http://web:3000/api/v1/caption_files/${captionFile.id}/upload`;
    server.use(http.all(uploadUrl, () => passthrough()));

    await uploadCaptionFile(
      client,
      captionFile.id,
      webReadableFromBuffers(buffer),
      buffer.byteLength,
    );

    await page.goto(`/captions/${captionFile.id}/details`);
    await page.getByRole("button", { name: "Delete Asset" }).click();
    await page.getByRole("button", { name: "Delete", exact: true }).click();

    await playwrightExpect(
      page.getByRole("link", { name: "Assets" }),
    ).toBeVisible();
    await playwrightExpect(
      page.getByText(`Asset ${captionFile.id} has been deleted`),
    ).toBeVisible({ timeout: 30000 });
  });

  test("Upload a fragment index file and tracks and delete it", async () => {
    const { token, page } = await createApiTokenViaUI();
    const data = "ABCDEFGHI_________0123456789--------||||||||||";
    const buffer = Buffer.from(data);
    const md5 = v4();
    const client = new Client(token, BASE_URL);

    const isoFile = await createISOBMFFFile(client, {
      md5,
      filename: "test.mp4",
    });

    const uploadUrl = `http://web:3000/api/v1/isobmff_files/${isoFile.id}/index/upload`;
    server.use(http.all(uploadUrl, () => passthrough()));

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
    await page.getByRole("button", { name: "Delete Asset" }).click();
    await page.getByRole("button", { name: "Delete", exact: true }).click();

    await playwrightExpect(
      page.getByRole("link", { name: "Assets" }),
    ).toBeVisible();
  });

  test("Upload a fragment index file and delete it", async () => {
    const { token, page } = await createApiTokenViaUI();
    const data = "ABCDEFGHI_________0123456789--------||||||||||";
    const buffer = Buffer.from(data);
    const md5 = v4();
    const client = new Client(token, BASE_URL);

    const isoFile = await createISOBMFFFile(client, {
      md5,
      filename: "test.mp4",
    });

    const uploadUrl = `http://web:3000/api/v1/isobmff_files/${isoFile.id}/index/upload`;
    server.use(http.all(uploadUrl, () => passthrough()));

    await uploadFragmentIndex(
      client,
      isoFile.id,
      webReadableFromBuffers(buffer),
      buffer.byteLength,
    );

    await page.goto(`/assets/${isoFile.id}/details`);
    await page.getByRole("button", { name: "Delete Asset" }).click();
    await page.getByRole("button", { name: "Delete", exact: true }).click();

    await playwrightExpect(
      page.getByRole("link", { name: "Assets" }),
    ).toBeVisible();
    await playwrightExpect(
      page.getByText(`Asset ${isoFile.id} has been deleted`),
    ).toBeVisible({ timeout: 30000 });
  });

  test("Upload an unprocessed file and delete it", async () => {
    const { token, page } = await createApiTokenViaUI();
    const data = "ABCDEFGHI_________0123456789--------||||||||||";
    const buffer = Buffer.from(data);
    const md5 = v4();
    const client = new Client(token, BASE_URL);

    const unprocessedFile = await createUnprocessedFile(client, {
      md5,
      byte_size: buffer.byteLength,
      filename: "test.jpg",
    });

    const uploadUrl = `http://web:3000/api/v1/unprocessed_files/${unprocessedFile.id}/upload`;
    server.use(http.all(uploadUrl, () => passthrough()));

    await uploadUnprocessedReadableStream(
      client,
      { id: unprocessedFile.id, byte_size: buffer.byteLength },
      webReadableFromBuffers(buffer),
    ).whenUploaded();

    await page.goto(`/unprocessed/${unprocessedFile.id}/details`);
    await page.getByRole("button", { name: "Delete Asset" }).click();
    await page.getByRole("button", { name: "Delete", exact: true }).click();

    await playwrightExpect(
      page.getByRole("link", { name: "Assets" }),
    ).toBeVisible();
    await playwrightExpect(
      page.getByText(`Asset ${unprocessedFile.id} has been deleted`),
    ).toBeVisible({ timeout: 30000 });
  });
});
