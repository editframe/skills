import path from "node:path";
import { spawn } from "node:child_process";
import { program } from "commander";
import { PreviewServer } from "../utils/startPreviewServer.js";

program
  .command("preview [directory]")
  .description("Preview a directory's index.html file")
  .action(async (projectDirectory = ".") => {
    // If running from the dev script (via tsx), use PreviewServer for source resolution
    // Otherwise, use standard vite
    if (process.env.ORIGINAL_CWD) {
      const previewServer = await PreviewServer.start(projectDirectory);
      console.log(`Preview server started at ${previewServer.url}`);
      // Keep process alive
      await new Promise(() => {});
    } else {
      // Standard mode - just run vite
      const baseCwd = process.cwd();
      const resolvedProjectDir = path.resolve(baseCwd, projectDirectory);
      
      spawn("npx", ["vite", "dev"], { 
        cwd: resolvedProjectDir, 
        stdio: "inherit" 
      });
    }
  });
