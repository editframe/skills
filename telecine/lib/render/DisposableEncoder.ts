import { raceTimeout } from "@/util/raceTimeout";
import { type ChildProcessByStdio, spawn } from "child_process";
import type { Writable } from "stream";
import { FFMPEG_ANALYZE_ARGS } from "./FFMPEG_ARGS";
import { FFMPEG_ARGS } from "./FFMPEG_ARGS";
import { executeSpan } from "@/tracing";

export class DisposableEncoder {
  public process: ChildProcessByStdio<Writable, null, null>;

  constructor(private encoderArgs: string[]) {
    // biome-ignore format: strict command line format
    this.process = spawn(
      "ffmpeg",
      [...FFMPEG_ARGS, ...FFMPEG_ANALYZE_ARGS, ...this.encoderArgs],
      {
        stdio: ["pipe", "inherit", "inherit"],
      },
    );
  }

  closeAndAwaitExit() {
    return executeSpan("DisposableEncoder.closeAndAwaitExit", async (span) => {
      span.setAttribute("process", this.process.spawnfile);

      return new Promise<void>((resolve, reject) => {
        this.process.once("exit", (code, _signal) => {
          span.setAttribute("exitCode", code ?? 0);
          if (code === 0 || code === null) {
            resolve();
          } else {
            reject(
              new Error(
                `${this.process.spawnfile} exited with code ${code} ${this.process.spawnargs.join(" ")}`,
              ),
            );
          }
        });
        this.process.stdin.end();
      });
    });
  }

  [Symbol.asyncDispose] = async () => {
    await raceTimeout(
      5000,
      `${this.process.spawnfile} failed to exit within 5 seconds ${this.process.spawnargs.join(" ")}`,
      new Promise<void>((resolve) => {
        if (this.process.exitCode !== null) {
          resolve();
        }
        this.process.once("exit", () => {
          resolve();
        });
        this.process.kill(9);
      }),
    );
  };
}
