import path from "node:path";
import fs from "node:fs";
import type { Plugin } from "vite";

export const copyLuaScripts = (luaDir: string, distLuaDir: string): Plugin => ({
  name: 'copy-lua-scripts',
  writeBundle() {
    if (!fs.existsSync(distLuaDir)) {
      fs.mkdirSync(distLuaDir, { recursive: true });
    }

    const files = fs.readdirSync(luaDir);
    for (const file of files) {
      if (file.endsWith('.lua')) {
        fs.copyFileSync(
          path.join(luaDir, file),
          path.join(distLuaDir, file)
        );
      }
    }
  }
});

