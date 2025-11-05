import { createReadStream } from "node:fs";
import type { Readable } from "node:stream";
import { join } from "node:path";

import { Storage } from "@google-cloud/storage";

const storage = new Storage();
const bucket = storage.bucket(process.env.PUBLIC_STORAGE_BUCKET!);
export const UPLOAD_TO_BUCKET = process.env.UPLOAD_TO_BUCKET === "true";

interface StorageStreamOptions {
  start: number;
  end: number;
}

interface PersistantStorage {
  createReadStream(key: string, opts?: StorageStreamOptions): Promise<Readable>;
}

const OnHostStorage: PersistantStorage = {
  async createReadStream(key: string, opts?: StorageStreamOptions) {
    const path = join(process.cwd(), "data", key);
    return createReadStream(path, opts);
  },
};

const GCSStorage: PersistantStorage = {
  async createReadStream(key: string, opts?: StorageStreamOptions) {
    const file = bucket.file(key);
    return file.createReadStream({
      start: opts?.start,
      end: opts?.end,
    });
  },
};

export const storageProvider = UPLOAD_TO_BUCKET ? GCSStorage : OnHostStorage;
