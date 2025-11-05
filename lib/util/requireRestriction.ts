import type { LoaderFunction, LoaderFunctionArgs } from "react-router";
import { type APISessionInfo, parseRequestSession } from "./session";
import { data } from "react-router";
import { z } from "zod";
import { formatMs } from "~/ui/formatMs";
import { checkRenderQuota } from "./checkRenderQuota";
import type { TimeInterval } from "./convertIntervalToDate";

const MAX_PIXEL_AREA = 1920 * 1080; // HD
const MAX_DURATION = 1000 * 5 * 60; // 5 minutes
const MAX_RENDERS = 5;
const MAX_RENDERS_INTERVAL = "daily" as TimeInterval;

const schema = z
  .object({
    width: z.number().int(),
    height: z.number().int(),
    duration_ms: z
      .number()
      .int()
      .refine((value) => value < MAX_DURATION, {
        message: `Duration must be less than ${formatMs(MAX_DURATION)}`,
      }),
  })
  .superRefine((data, ctx) => {
    if (data.width * data.height > MAX_PIXEL_AREA) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `The total pixel area (width * height) must not exceed ${MAX_PIXEL_AREA.toLocaleString()} pixels.  This allows for dimensions up to 1920x1080 (HD), or equivalent areas.`,
      });
    }
    if (data.width % 2 !== 0 || data.height % 2 !== 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Both width and height must be divisible by 2.",
      });
    }
  });
export type LoaderFunctionArgsWithAPISession = LoaderFunctionArgs & {
  session: APISessionInfo;
};
export type LoaderWithRestriction = (
  args: LoaderFunctionArgsWithAPISession,
) => ReturnType<LoaderFunction>;

export function requireRestriction<LoaderType extends LoaderWithRestriction>(
  loader: LoaderType,
) {
  return async (args: LoaderFunctionArgs) => {
    const session = await parseRequestSession(args.request);
    if (session?.type !== "api") {
      return data({ message: "Invalid or expired API token" }, { status: 401 });
    }
    if (session.is_paid === false) {
      const quota = await checkRenderQuota(args, {
        threshold: MAX_RENDERS,
        timeInterval: MAX_RENDERS_INTERVAL,
      });
      if (quota) {
        return data(
          {
            message: `You have reached the limit of free ${MAX_RENDERS_INTERVAL} renders. Please upgrade your plan by contacting support at team@editframe.com`,
          },
          { status: 402 },
        );
      }
      const rawPayload = await args.request.json();
      const result = schema.safeParse(rawPayload);
      if (result.success) {
        session.restricted = true;
        return loader({ ...args, session }) as ReturnType<LoaderType>;
      }
      return data(
        {
          message:
            "This feature requires a paid plan, Please upgrade your plan by contacting support at team@editframe.com",
          errors: result.error?.errors.map((e) => e.message),
        },
        { status: 402 },
      );
    }
    return loader({ ...args, session }) as ReturnType<LoaderType>;
  };
}
