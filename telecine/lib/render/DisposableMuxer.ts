import { promiseWithResolvers } from "@/util/promiseWithResolvers";
import { raceTimeout } from "@/util/raceTimeout";
import { BufferList } from "bl";
import { type ChildProcessByStdio, spawn } from "child_process";
import type { Readable } from "stream";
import { FFMPEG_ANALYZE_ARGS } from "./FFMPEG_ARGS";
import { FFMPEG_ARGS } from "./FFMPEG_ARGS";

export class DisposableMuxer {
  public process: ChildProcessByStdio<null, Readable, Readable>;

  private resolvers = promiseWithResolvers<ArrayBuffer>();

  muxedBufferPromise = this.resolvers.promise;

  constructor(private muxerArgs: string[]) {
    // biome-ignore format: strict command line format
    this.process = spawn(
      "ffmpeg",
      [...FFMPEG_ARGS, ...FFMPEG_ANALYZE_ARGS, ...this.muxerArgs],
      { stdio: ["inherit", "pipe", "pipe"] },
    );

    const buffer = new BufferList();
    let stderrOutput = "";

    this.process.stdout.on("data", (data: Buffer) => {
      buffer.append(data);
    });

    this.process.stderr.on("data", (data: Buffer) => {
      stderrOutput += data.toString();
    });

    this.process.on("close", (code, _signal) => {
      if (code === 0 || code === null) {
        this.resolvers.resolve(buffer.slice().buffer as ArrayBuffer);
      } else {
        this.resolvers.reject(
          new Error(`Muxer exited with code ${code}. Stderr: ${stderrOutput}`),
        );
      }
    });
  }

  [Symbol.asyncDispose] = async () => {
    await raceTimeout(
      5000,
      "Muxer failed to exit within 5 seconds",
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
