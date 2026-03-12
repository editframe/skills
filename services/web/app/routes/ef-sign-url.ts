import { z } from "zod";
import { createAnonymousURLToken } from "@/util/createAnonymousURLToken";
import { data } from "react-router";
import type { Route } from "./+types/ef-sign-url";

const schema = z.object({
  url: z.string().url("Invalid URL format"),
  params: z.record(z.string()).optional().default({}),
});

// Validate that URL is for transcoding endpoints
function validateTranscodeUrl(url: string) {
  // Prefer VITE_WEB_HOST (set via docker-compose with worktree domain) over WEB_HOST (from .env)
  const webHost =
    process.env.VITE_WEB_HOST ||
    process.env.WEB_HOST ||
    "http://localhost:3000";
  if (!url.startsWith(`${webHost}/api/v1/transcode`)) {
    throw new Error("Only transcoding URLs are allowed for signing");
  }

  return true;
}

export const action = async ({ request }: Route.ActionArgs) => {
  const { url, params } = schema.parse(await request.json());

  try {
    // Validate URL is for transcoding
    validateTranscodeUrl(url);

    const token = createAnonymousURLToken(url, params, "1hr");

    return {
      token,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw data(
        {
          message: error.message,
          code: "VALIDATION_ERROR",
        },
        { status: 400 },
      );
    }
    throw error;
  }
};
