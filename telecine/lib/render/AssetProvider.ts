import type { Readable } from "node:stream";
import {
  storageProvider,
  type PersistentStorage,
  type StorageStreamOptions,
} from "@/util/storageProvider.server";

export interface AssetProvider {
  createReadStream(key: string, opts?: StorageStreamOptions): Promise<Readable>;
  readFile(key: string): Promise<Buffer>;
}

export class StorageAssetProvider implements AssetProvider {
  constructor(private storage: PersistentStorage = storageProvider) {}

  async createReadStream(
    key: string,
    opts?: StorageStreamOptions,
  ): Promise<Readable> {
    return this.storage.createReadStream(key, opts);
  }

  async readFile(key: string): Promise<Buffer> {
    return this.storage.readFile(key);
  }
}

export class BundledAssetProvider implements AssetProvider {
  constructor(private basePath: string) {}

  async createReadStream(
    key: string,
    opts?: StorageStreamOptions,
  ): Promise<Readable> {
    const { createReadStream } = await import("node:fs");
    const path = `${this.basePath}/${key}`;
    return createReadStream(path, opts);
  }

  async readFile(key: string): Promise<Buffer> {
    const { readFile } = await import("node:fs/promises");
    const path = `${this.basePath}/${key}`;
    return readFile(path);
  }
}

export const defaultAssetProvider = new StorageAssetProvider();
