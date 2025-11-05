import type { ActionFunction, ActionFunctionArgs } from "react-router";
import type { z } from "zod";

import { logger } from "@/logging";

export const validatePayload = <Output, Input>(
  schema: z.ZodType<Output, z.ZodTypeDef, Input>,
  fn: (
    args: ActionFunctionArgs & { payload: Output },
  ) => ReturnType<ActionFunction>,
) => {
  return async (args: ActionFunctionArgs) => {
    if (!args.request.body) {
      return new Response("No body found", { status: 400 });
    }

    const contentType = args.request.headers.get("content-type");
    let rawPayload: unknown;
    if (contentType === "application/json") {
      rawPayload = await args.request.json();
    } else if (contentType?.startsWith("application/x-www-form-urlencoded")) {
      rawPayload = Object.fromEntries(await args.request.formData());
    } else {
      return new Response("Unsupported content type", { status: 415 });
    }
    const result = schema.safeParse(rawPayload);
    if (result.success) {
      return fn({ ...args, payload: result.data });
    }
    logger.error(
      { rawPayload, error: result.error },
      "Failed to validate payload",
    );
    return new Response(result.error.message, { status: 400 });
  };
};

export const validateParams = <Output, Input>(
  schema: z.ZodType<Output, z.ZodTypeDef, Input>,
  fn: (
    args: Omit<ActionFunctionArgs, "params"> & {
      params: Output;
      rawParams: Input;
    },
  ) => ReturnType<ActionFunction>,
) => {
  return async (args: ActionFunctionArgs) => {
    const result = schema.safeParse(args.params);
    if (result.success) {
      return fn({ ...args, params: result.data, rawParams: args.params as Input });
    }
    return new Response(result.error.message, { status: 400 });
  };
};

export const requireBody = (
  fn: (
    args: ActionFunctionArgs & { body: ReadableStream<Uint8Array> },
  ) => ReturnType<ActionFunction>,
) => {
  return async (args: ActionFunctionArgs) => {
    if (!args.request.body) {
      return new Response("No body found", { status: 400 });
    }
    return fn({ ...args, body: args.request.body });
  };
};
