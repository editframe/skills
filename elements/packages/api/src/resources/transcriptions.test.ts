import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, test } from "vitest";

import { Client } from "../client.js";
import { createTranscription } from "./transcriptions.js";

const server = setupServer();
const client = new Client("ef_TEST_TOKEN", "http://localhost");

describe("Transcriptions", () => {
  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  describe("createTranscription", () => {
    test("throws if server returns an error", async () => {
      server.use(
        http.post("http://localhost/api/v1/transcriptions", () =>
          HttpResponse.text("Internal Server Error", { status: 500 }),
        ),
      );

      await expect(
        createTranscription(client, { file_id: "test", track_id: 1 }),
      ).rejects.toThrowError(
        "Failed to create transcription 500 Internal Server Error",
      );
    });

    test("returns json data from the http response", async () => {
      server.use(
        http.post("http://localhost/api/v1/transcriptions", () =>
          HttpResponse.json(
            { testResponse: "test" },
            { status: 200, statusText: "OK" },
          ),
        ),
      );

      const response = await createTranscription(client, {
        file_id: "test",
        track_id: 1,
      });

      expect(response).toEqual({ testResponse: "test" });
    });
  });
});
