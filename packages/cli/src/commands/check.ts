import { exec } from "node:child_process";
import os from "node:os";
import chalk from "chalk";
import { program } from "commander";
import ora from "ora";

interface CheckDescriptor {
  check(): Promise<boolean>;
  message(): string[];
}

const checks: Record<string, CheckDescriptor> = {
  ffmpeg: {
    message: () => {
      const platform = os.platform();
      const message = [
        "Processing assets for <ef-video>, <ef-audio>, <ef-captions>, and <ef-waveform>\n elements requires ffmpeg to be installed.",
      ];
      switch (platform) {
        case "darwin": {
          message.push(
            "On platform=darwin you can install ffmpeg using Homebrew:",
          );
          message.push(" - brew install ffmpeg");
          message.push(
            "Or you can download ffmpeg from https://ffmpeg.org/download.html",
          );
          break;
        }
        case "linux": {
          message.push(
            "You can install ffmpeg using your distribution's package manager.",
          );
          break;
        }
        case "win32": {
          message.push(
            "You can download ffmpeg from https://ffmpeg.org/download.html",
          );
          message.push(
            "You can use package managers like Chocolatey or Scoop to install ffmpeg.",
          );
          message.push(" - choco install ffmpeg-full");
          message.push(" - scoop install ffmpeg");
          message.push(" - winget install ffmpeg");
          break;
        }
        default: {
          message.push(`Unrecognized platform ${platform}`);
          message.push(
            "You can download ffmpeg from https://ffmpeg.org/download.html",
          );
          message.push(
            "Or try installing it from your operating system's package manager",
          );
          break;
        }
      }
      return message;
    },
    check: async () => {
      return new Promise((resolve, reject) => {
        exec("ffmpeg -version", (error: any, stdout: any, _stderr: any) => {
          if (error) {
            reject(error);
            return;
          }
          resolve(stdout);
        });
      });
    },
  },

  whisper_timestamped: {
    message: () => {
      const message = [
        "<ef-captions> Requires whisper_timestamped to be installed.",
      ];

      message.push("whisper_timestamped depends on python3");

      message.push(" - pip3 install whisper_timestamped");

      message.push("Alternate installation instructions are availble at:");
      message.push(
        "https://github.com/linto-ai/whisper-timestamped#installation",
      );

      return message;
    },
    check: async () => {
      return new Promise((resolve, reject) => {
        exec(
          "whisper_timestamped --version",
          (error: any, stdout: any, _stderr: any) => {
            if (error) {
              reject(error);
              return;
            }
            resolve(stdout);
          },
        );
      });
    },
  },
};

program
  .command("check")
  .description("Check on dependencies and other requirements")
  .action(async () => {
    for (const checkName in checks) {
      const check = checks[checkName];
      if (!check) {
        continue;
      }
      const spinner = ora(`Checking ${checkName}`).start();
      try {
        await check.check();
        spinner.succeed(
          chalk.white.bgGreen(` Check for ${checkName} passed  `),
        );
      } catch (_error) {
        spinner.fail(chalk.white.bgRed(`  Check for ${checkName} failed  `));
        process.stderr.write(chalk.red(check.message().join("\n\n")));
        process.stderr.write("\n");
      }
    }
  });
