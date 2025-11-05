import { Probe } from "@editframe/assets";
import { program } from "commander";

program
  .command("mux <path>")
  .description("Mux a file into multiple audio/video tracks.")
  .action(async (path: string) => {
    const probe = await Probe.probePath(path);
    console.log(probe);
  });
