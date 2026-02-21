import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { writeFile, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { IncomingMessage, ServerResponse } from "node:http";
import { sendTaskResult } from "./sendTaskResult.js";

function makeReq(headers: Record<string, string> = {}): IncomingMessage {
  return {
    headers,
    method: "GET",
  } as IncomingMessage;
}

function makeRes(): ServerResponse & { _body: string; _statusCode: number } {
  const chunks: Buffer[] = [];
  const res = {
    writeHead: vi.fn(function (this: any, code: number) {
      this._statusCode = code;
    }),
    end: vi.fn(function (this: any, data?: string | Buffer) {
      if (data) this._body = data.toString();
    }),
    setHeader: vi.fn(),
    pipe: vi.fn(),
    _statusCode: 0,
    _body: "",
  } as unknown as ServerResponse & { _body: string; _statusCode: number };
  return res;
}

describe("sendTaskResult", () => {
  let tmpDir: string;
  let testFile: string;

  beforeEach(async () => {
    tmpDir = join(tmpdir(), `ef-send-test-${Date.now()}`);
    await mkdir(tmpDir, { recursive: true });
    testFile = join(tmpDir, "test.mp4");
    await writeFile(testFile, "fake video content");
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("sends 500 response when file does not exist", () => {
    const req = makeReq();
    const res = makeRes();
    const missingFile = join(tmpDir, "does-not-exist.mp4");

    sendTaskResult(req, res, { cachePath: missingFile, md5Sum: "abc123" });

    expect(res.writeHead).toHaveBeenCalledWith(500, expect.objectContaining({ "Content-Type": expect.any(String) }));
    expect(res.end).toHaveBeenCalled();
  });

  it("sends 200 response for existing file", () => {
    const req = makeReq();
    const res = makeRes();

    // pipe is called for successful file sends, not end directly
    sendTaskResult(req, res, { cachePath: testFile, md5Sum: "abc123" });

    expect(res.writeHead).toHaveBeenCalledWith(200, expect.any(Object));
  });
});
