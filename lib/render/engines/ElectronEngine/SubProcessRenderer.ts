import type { ChildProcessByStdio } from "node:child_process";
import type { Readable } from "node:stream";

import { spawnElectronExecutor } from "@/electron-exec/spawnElectronExecutor";
import type { RenderInfo } from "../../renderWithStrategy";

export class SubProcessRenderer {
  static async create(renderInfo: RenderInfo) {
    return new SubProcessRenderer(
      await spawnElectronExecutor(
        "/app/lib/render/engines/ElectronEngine/exec-render.ts",
        ["--render-info", JSON.stringify(renderInfo)],
      ),
    );
  }

  get stdout() {
    return this.renderProcess.stdout;
  }

  get stderr() {
    return this.renderProcess.stderr;
  }

  private stderrBuffer: string[] = [];

  constructor(
    private renderProcess: ChildProcessByStdio<null, Readable, Readable>,
  ) {
    this.renderProcess.stdout.on("data", (data) => {
      console.log("[stdout]", data.toString());
    });
    this.renderProcess.stderr.on("data", (data) => {
      if (
        !data.includes(" Failed to connect to the bus") &&
        !data.includes("Failed to connect to the bus") &&
        !data.includes(
          "Exiting GPU process due to errors during initialization",
        )
      ) {
        console.log("[stderr]", data.toString());
      }
      this.stderrBuffer.push(data.toString());
    });
  }

  whenCompleted = new Promise<void>((resolve, reject) => {
    this.renderProcess.on("exit", (code) => {
      console.log(`Renderer process exited code=${code}`);
      if (code === 0) {
        resolve();
      } else {
        if (
          this.stderrBuffer
            .join("")
            // This is a known issue with Electron and can be safely ignored
            .includes(
              "Unable to find existing allocation for shared memory segment to unmap",
            )
        ) {
          resolve();
        } else {
          console.error(`Renderer exited with code ${code}`);
          console.error("stderr buffer", this.stderrBuffer.join(""));
          reject(new Error(`Renderer exited with code ${code}`));
        }
      }
    });
    this.renderProcess.on("error", reject);
  });

  ensureShutdown() {
    this.renderProcess.kill(9);
  }
}
