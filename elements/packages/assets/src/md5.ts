import { type ReadStream, createReadStream } from "node:fs";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import crypto from "node:crypto";
import type { Ora } from "ora";

// Recursively calculate the MD5 hash of all files in a directory
export async function md5Directory(directory: string, spinner?: Ora) {
  const shouldEndSpinner = !spinner;
  if (!spinner) {
    const { default: ora } = await import("ora");
    spinner = ora("⚡️ Calculating MD5").start();
  }
  spinner.suffixText = directory;
  const files = await readdir(directory, { withFileTypes: true });
  const hashes = await Promise.all(
    files.map(async (file) => {
      const filePath = join(directory, file.name);
      if (file.isDirectory()) {
        return md5Directory(filePath, spinner);
      }
      spinner.suffixText = filePath;
      return md5FilePath(filePath);
    }),
  );

  const hash = crypto.createHash("md5");
  for (const fileHash of hashes) {
    hash.update(fileHash);
  }

  if (shouldEndSpinner) {
    spinner.succeed("MD5 calculated");
    spinner.suffixText = directory;
  }
  return addDashesToUUID(hash.digest("hex"));
}

export async function md5FilePath(filePath: string) {
  const readStream = createReadStream(filePath);
  return md5ReadStream(readStream);
}

export function md5ReadStream(readStream: ReadStream) {
  return new Promise<string>((resolve, reject) => {
    const hash = crypto.createHash("md5");
    readStream.on("data", (data) => {
      hash.update(data);
    });
    readStream.on("error", reject);
    readStream.on("end", () => {
      resolve(addDashesToUUID(hash.digest("hex")));
    });
  });
}

export function md5Buffer(buffer: Buffer) {
  const hash = crypto.createHash("md5");
  hash.update(buffer);
  return addDashesToUUID(hash.digest("hex"));
}

function addDashesToUUID(uuidWithoutDashes: string) {
  if (uuidWithoutDashes.length !== 32) {
    throw new Error("Invalid UUID without dashes. Expected 32 characters.");
  }

  return (
    // biome-ignore lint/style/useTemplate: using a template makes a long line
    uuidWithoutDashes.slice(0, 8) +
    "-" +
    uuidWithoutDashes.slice(8, 12) +
    "-" +
    uuidWithoutDashes.slice(12, 16) +
    "-" +
    uuidWithoutDashes.slice(16, 20) +
    "-" +
    uuidWithoutDashes.slice(20, 32)
  );
}
