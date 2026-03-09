import path from "node:path";
import { spawn } from "node:child_process";
import { program } from "commander";

program
  .command("preview [directory]")
  .description("Preview a directory's index.html file")
  .action(async (projectDirectory = ".") => {
    // If running from the dev script (via tsx), ORIGINAL_CWD contains the user's actual directory
    // Resolve projectDirectory relative to where the user actually ran the command
    const baseCwd = process.env.ORIGINAL_CWD || process.cwd();
    const resolvedProjectDir = path.resolve(baseCwd, projectDirectory);

    spawn("npx", ["vite", "dev"], {
      cwd: resolvedProjectDir,
      shell: true,
      stdio: "inherit",
    });
  });
