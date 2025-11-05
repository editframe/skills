import { promises as fs } from "node:fs";
import path from "node:path";

export async function getFolderSize(dir: string): Promise<number> {
  const files = await fs.readdir(dir);
  let size = 0;

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stats = await fs.stat(filePath);

    if (stats.isDirectory()) {
      size += await getFolderSize(filePath);
    } else {
      size += stats.size;
    }
  }

  return size;
}
