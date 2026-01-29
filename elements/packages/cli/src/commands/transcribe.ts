import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { program } from "commander";
import ora from "ora";
import chalk from "chalk";
import { generateCaptionDataFromPath } from "@editframe/assets";

program
  .command("transcribe <input>")
  .description("Generate captions from audio/video file using whisper_timestamped")
  .option("-o, --output <file>", "Output JSON file", "captions.json")
  .option("-l, --language <lang>", "Language code (e.g., en, es, fr)", "en")
  .action(async (input: string, options: { output: string; language: string }) => {
    const spinner = ora("Generating captions...").start();
    
    try {
      const absoluteInput = resolve(input);
      const absoluteOutput = resolve(options.output);
      
      spinner.text = `Transcribing ${input}...`;
      
      // Generate captions using the same function as the vite plugin
      const captionData = await generateCaptionDataFromPath(absoluteInput);
      
      spinner.text = `Writing captions to ${options.output}...`;
      await writeFile(absoluteOutput, captionData, "utf-8");
      
      spinner.succeed(
        chalk.green(`✓ Captions generated successfully: ${options.output}`)
      );
      
      // Parse to show stats
      const parsed = JSON.parse(captionData);
      console.log(chalk.dim(`  ${parsed.segments.length} segments`));
      console.log(chalk.dim(`  ${parsed.word_segments.length} words`));
    } catch (error) {
      spinner.fail(chalk.red("Failed to generate captions"));
      
      if ((error as Error).message.includes("whisper_timestamped")) {
        console.error(chalk.red("\nwhisper_timestamped is not installed or not in PATH"));
        console.error(chalk.yellow("\nInstall it with:"));
        console.error(chalk.white("  pip3 install whisper-timestamped"));
        console.error(chalk.dim("\nOr check installation instructions at:"));
        console.error(chalk.dim("  https://github.com/linto-ai/whisper-timestamped#installation"));
      } else {
        console.error(chalk.red(`\n${(error as Error).message}`));
      }
      
      process.exit(1);
    }
  });
