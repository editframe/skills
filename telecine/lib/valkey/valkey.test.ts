import { describe, expect, test } from "vitest";
import { valkey } from "./valkey";

describe("valkey connection", () => {
  test("can connect to valkey", async () => {
    const info = await valkey.info();
    expect(info).to.include("server_name:valkey");
  });
});
