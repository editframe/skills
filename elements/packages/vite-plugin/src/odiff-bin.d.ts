declare module "odiff-bin" {
  export interface ODiffOptions {
    /** Sensitivity threshold (0-1, lower = stricter) */
    threshold?: number;
    /** Ignore anti-aliased pixels */
    antialiasing?: boolean;
    /** Color for diff highlights (hex) */
    diffColor?: string;
    /** Output only the diff mask */
    outputDiffMask?: boolean;
    /** Fail on layout/dimension differences */
    failOnLayoutDiff?: boolean;
    /** Don't throw on missing files */
    noFailOnFsErrors?: boolean;
    /** Capture line indices with differences */
    captureDiffLines?: boolean;
    /** Use less memory (may be slower) */
    reduceRamUsage?: boolean;
    /** Regions to ignore in comparison */
    ignoreRegions?: Array<{ x1: number; y1: number; x2: number; y2: number }>;
  }

  export type ODiffResult =
    | { match: true }
    | { match: false; reason: "layout-diff" }
    | {
        match: false;
        reason: "pixel-diff";
        diffCount: number;
        diffPercentage: number;
        diffLines?: number[];
      }
    | { match: false; reason: "file-not-exists"; file: string };

  export function compare(
    baseImage: string,
    compareImage: string,
    diffOutput: string,
    options?: ODiffOptions,
  ): Promise<ODiffResult>;

  export class ODiffServer {
    constructor(binaryPath?: string);
    compare(
      baseImage: string,
      compareImage: string,
      diffOutput: string,
      options?: ODiffOptions,
    ): Promise<ODiffResult>;
    compareBuffers(
      baseBuffer: Buffer,
      compareBuffer: Buffer,
      options?: ODiffOptions,
    ): Promise<ODiffResult>;
    stop(): void;
  }
}
