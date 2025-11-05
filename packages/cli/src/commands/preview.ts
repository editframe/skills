import { spawn } from "node:child_process";
import { program } from "commander";

program
  .command("preview [directory]")
  .description("Preview a directory's index.html file")
  .action(async (projectDirectory = ".") => {
    spawn("npx", ["vite", "dev"], { cwd: projectDirectory, stdio: "inherit" });
  });
