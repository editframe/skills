import { spawnElectronExecutor } from "@/electron-exec/spawnElectronExecutor";
import path from "node:path";
import os from "node:os";
import type { ChildProcessByStdio } from "node:child_process";
import type { Readable } from "node:stream";
import { z } from "zod";
import { readFile } from "node:fs/promises";
import { logger } from "@/logging";

export const ExtractionInfo = z.object({
  id: z.string(),
  orgId: z.string(),
  rendererPath: z.string(),
});

export type ExtractionInfo = z.infer<typeof ExtractionInfo>;

export const RenderInfo = z.object({
  width: z.number(),
  height: z.number(),
  durationMs: z.number(),
  assets: z.object({
    efMediaSrcs: z.array(z.string()),
    efImageSrcs: z.array(z.string()),
  }),
});

export type RenderInfo = z.infer<typeof RenderInfo>;

export class RenderInfoExtractor {
  static async create(extractionInfo: ExtractionInfo) {
    const outputPath = path.join(
      os.tmpdir(),
      `render-info-${extractionInfo.id}`,
    );
    return new RenderInfoExtractor(
      await spawnElectronExecutor("/app/lib/render/getRenderInfo.ts", [
        "--extraction-info",
        JSON.stringify(extractionInfo),
        "--output-path",
        outputPath,
      ]),
      outputPath,
    );
  }

  constructor(
    private extractorProcess: ChildProcessByStdio<null, Readable, Readable>,
    private outputPath: string,
  ) {
    this.extractorProcess.stdout.on("data", (data) => {
      logger.info(`[stdout] ${data.toString()}`);
    });

    this.extractorProcess.stderr.on("data", (data) => {
      logger.info(`[stderr] ${data.toString()}`);
    });
  }

  async whenCompleted() {
    return new Promise<void>((resolve, reject) => {
      const checkFile = async () => {
        try {
          await readFile(this.outputPath, "utf-8");
          this.extractorProcess.kill();
          resolve();
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code === "ENOENT") {
            setTimeout(checkFile, 100); // Poll every 100ms
          } else {
            this.extractorProcess.kill();
            reject(error);
          }
        }
      };

      this.extractorProcess.on("error", (error) => {
        this.extractorProcess.kill();
        reject(error);
      });

      checkFile();
    });
  }

  async getRenderInfo() {
    const renderInfo = await readFile(this.outputPath, "utf-8");
    return RenderInfo.parse(JSON.parse(renderInfo));
  }
}
