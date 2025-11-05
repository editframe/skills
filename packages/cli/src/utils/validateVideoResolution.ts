import debug from "debug";
import ora from "ora";
import { z } from "zod";

const log = debug("ef:cli:validateVideoResolution");

type VideoPayload = {
  width: number;
  height: number;
};

const schema = z
  .object({
    width: z.number().int(),
    height: z.number().int(),
  })
  .refine((data) => data.width % 2 === 0, {
    message: "Width must be divisible by 2",
    path: ["width"],
  })
  .refine((data) => data.height % 2 === 0, {
    message: "Height must be divisible by 2",
  });
export const validateVideoResolution = async (rawPayload: VideoPayload) => {
  const spinner = ora("Validating video resolution").start();
  const result = schema.safeParse(rawPayload);
  if (result.success) {
    spinner.succeed("Video resolution is valid");
    return result.data;
  }
  spinner.fail("Invalid video resolution");
  process.stderr.write(result.error?.errors.map((e) => e.message).join("\n"));
  process.stderr.write("\n");
  log("Error:", result.error?.errors.map((e) => e.message).join("\n"));
  process.exit(1);
};
