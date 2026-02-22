import debug from "debug";
import { z } from "zod";
import type { Client } from "../client.js";
import { CompletionIterator } from "../ProgressIterator.js";
import { assertTypesMatch } from "../utils/assertTypesMatch.ts";

const log = debug("ef:api:renders");

const H264Configuration = z.object({
  codec: z.literal("h264"),
});

const AACConfiguration = z.object({
  codec: z.literal("aac"),
});

const MP4Configuration = z.object({
  container: z.literal("mp4"),
  video: H264Configuration,
  audio: AACConfiguration,
});

const JpegConfiguration = z.object({
  container: z.literal("jpeg"),
  quality: z.number().int().min(1).max(100).default(80).optional(),
});

const PngConfiguration = z.object({
  container: z.literal("png"),
  compression: z.number().int().min(1).max(100).default(80).optional(),
  transparency: z.boolean().default(false).optional(),
});

const WebpConfiguration = z.object({
  container: z.literal("webp"),
  quality: z.number().int().min(1).max(100).default(80).optional(),
  compression: z.number().int().min(0).max(6).default(4).optional(),
  transparency: z.boolean().default(false).optional(),
});

export const RenderOutputConfiguration = z.discriminatedUnion("container", [
  MP4Configuration,
  JpegConfiguration,
  PngConfiguration,
  WebpConfiguration,
]);

export type RenderOutputConfiguration = z.infer<
  typeof RenderOutputConfiguration
>;

export const CreateRenderPayload = z.object({
  md5: z.string().optional(),
  fps: z.number().int().min(1).max(120).default(30).optional(),
  width: z.number().int().min(2).optional(),
  height: z.number().int().min(2).optional(),
  work_slice_ms: z
    .number()
    .int()
    .min(1000)
    .max(10_000)
    .default(4_000)
    .optional(),
  html: z.string().optional(),
  metadata: z.record(z.string(), z.string()).optional(),
  duration_ms: z.number().int().optional(),
  strategy: z.enum(["v1"]).default("v1").optional(),
  backend: z.enum(["cpu", "gpu"]).default("cpu").optional(),
  output: RenderOutputConfiguration.default({
    container: "mp4",
    video: {
      codec: "h264",
    },
    audio: {
      codec: "aac",
    },
  }).optional(),
});

export const CreateRenderPayloadWithOutput = CreateRenderPayload.extend({
  output: RenderOutputConfiguration,
});

export class OutputConfiguration {
  static parse(input?: any) {
    const output = RenderOutputConfiguration.parse(
      input ?? {
        container: "mp4",
        video: {
          codec: "h264",
        },
        audio: {
          codec: "aac",
        },
      },
    );
    return new OutputConfiguration(output);
  }

  constructor(public readonly output: RenderOutputConfiguration) {}

  get isStill() {
    return (
      this.output.container === "jpeg" ||
      this.output.container === "png" ||
      this.output.container === "webp"
    );
  }

  get isVideo() {
    return this.output.container === "mp4";
  }

  get fileExtension() {
    return this.output.container;
  }

  get contentType() {
    if (this.isStill) {
      return `image/${this.fileExtension}`;
    }
    return `video/${this.fileExtension}`;
  }

  get container() {
    return this.output.container;
  }

  get jpegConfig() {
    return this.output.container === "jpeg" ? this.output : null;
  }

  get pngConfig() {
    return this.output.container === "png" ? this.output : null;
  }

  get webpConfig() {
    return this.output.container === "webp" ? this.output : null;
  }

  get mp4Config() {
    return this.output.container === "mp4" ? this.output : null;
  }
}

export interface CreateRenderPayload {
  md5?: string;
  fps?: number;
  width?: number;
  height?: number;
  work_slice_ms?: number;
  html?: string;
  duration_ms?: number;
  metadata?: Record<string, string>;
  strategy?: "v1";
  backend?: "cpu" | "gpu";
  output?: z.infer<typeof RenderOutputConfiguration>;
}

assertTypesMatch<CreateRenderPayload, z.infer<typeof CreateRenderPayload>>(
  true,
);

export interface CreateRenderResult {
  id: string;
  md5: string | null;
  status: "complete" | "created" | "failed" | "pending" | "rendering" | string;
  metadata: Record<string, string>;
}

export interface LookupRenderByMd5Result {
  id: string;
  md5: string | null;
  status: "complete" | "created" | "failed" | "pending" | "rendering" | string;
  metadata: Record<string, string>;
}

export const createRender = async (
  client: Client,
  payload: CreateRenderPayload,
) => {
  log("Creating render", payload);
  // FIXME: The order of optional/default matters in zod
  // And if we set the default last, the type is not inferred correctly
  // Manually applying defaults here is a hack
  payload.strategy ??= "v1";
  payload.work_slice_ms ??= 4_000;
  payload.output ??= {
    container: "mp4",
    video: {
      codec: "h264",
    },
    audio: {
      codec: "aac",
    },
  };

  const response = await client.authenticatedFetch("/api/v1/renders", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  log("Render created", response);
  if (response.ok) {
    return (await response.json()) as CreateRenderResult;
  }

  throw new Error(
    `Failed to create render ${response.status} ${response.statusText} ${await response.text()}`,
  );
};

export const uploadRender = async (
  client: Client,
  renderId: string,
  fileStream: ReadableStream,
) => {
  log("Uploading render", renderId);
  const response = await client.authenticatedFetch(
    `/api/v1/renders/${renderId}/upload`,
    {
      method: "POST",
      body: fileStream,
      duplex: "half",
    },
  );

  if (response.ok) {
    return response.json();
  }

  throw new Error(
    `Failed to upload render ${response.status} ${response.statusText}`,
  );
};

export const getRenderInfo = async (client: Client, id: string) => {
  const response = await client.authenticatedFetch(`/api/v1/renders/${id}`);
  return response.json() as Promise<LookupRenderByMd5Result>;
};

export const lookupRenderByMd5 = async (
  client: Client,
  md5: string,
): Promise<LookupRenderByMd5Result | null> => {
  const response = await client.authenticatedFetch(
    `/api/v1/renders/md5/${md5}`,
    {
      method: "GET",
    },
  );

  if (response.ok) {
    return (await response.json()) as LookupRenderByMd5Result;
  }

  if (response.status === 404) {
    return null;
  }

  throw new Error(
    `Failed to lookup render by md5 ${md5} ${response.status} ${response.statusText}`,
  );
};

export const getRenderProgress = async (client: Client, id: string) => {
  const eventSource = await client.authenticatedEventSource(
    `/api/v1/renders/${id}/progress`,
  );

  return new CompletionIterator(eventSource);
};

export const downloadRender = async (client: Client, id: string) => {
  const response = await client.authenticatedFetch(`/api/v1/renders/${id}.mp4`);

  if (response.ok) {
    return response;
  }

  throw new Error(
    `Failed to download render ${id} ${response.status} ${response.statusText}`,
  );
};
