import { z } from "zod";
import type { Selectable } from "kysely";
import { OutputConfiguration } from "@editframe/api";

import type {
  Video2Renders,
  Video2ImageFiles,
  Video2IsobmffFiles,
  Video2IsobmffTracks,
  Video2UnprocessedFiles,
} from "@/sql-client.server/kysely-codegen";
import { downloadRenderURL } from "@/util/apiPaths";

const renderStatusTopics = {
  created: "render.created",
  complete: "render.completed",
  failed: "render.failed",
  pending: "render.pending",
  rendering: "render.rendering",
} as const;

export const hookedTables = z.object({
  schema: z.literal("video2"),
  name: z.enum([
    "renders",
    "image_files",
    "isobmff_files",
    "isobmff_tracks",
    "unprocessed_files",
  ]),
});

export const opSchema = z.enum(["insert", "update", "delete"]);

type Operations = z.infer<typeof opSchema>;

export type HookedTable = z.infer<typeof hookedTables>;

interface RenderWebhookPayload extends Pick<
  Selectable<Video2Renders>,
  | "id"
  | "status"
  | "created_at"
  | "completed_at"
  | "failed_at"
  | "width"
  | "height"
  | "fps"
  | "byte_size"
  | "duration_ms"
  | "md5"
  | "metadata"
> {
  download_url: string | null;
}

interface ImageFileWebhookPayload extends Pick<
  Selectable<Video2ImageFiles>,
  "id" | "width" | "height" | "mime_type" | "byte_size" | "filename"
> {}

interface IsobmffFileWebhookPayload extends Pick<
  Selectable<Video2IsobmffFiles>,
  "id" | "filename" | "fragment_index_complete" | "md5"
> {}

interface IsobmffTrackWebhookPayload extends Pick<
  Selectable<Video2IsobmffTracks>,
  | "file_id"
  | "track_id"
  | "complete"
  | "byte_size"
  | "next_byte"
  | "codec_name"
  | "duration_ms"
  | "type"
  | "probe_info"
> {}

interface UnprocessedFileWebhookPayload extends Pick<
  Selectable<Video2UnprocessedFiles>,
  "id" | "byte_size" | "next_byte" | "md5" | "filename" | "completed_at"
> {}

export interface WebhookPayload<PayloadData, EventData = undefined> {
  topic: string;
  data: PayloadData;
  event?: EventData;
}

const buildRenderPayload = (
  render: Selectable<Video2Renders>,
): WebhookPayload<RenderWebhookPayload> => {
  if (!(render.status in renderStatusTopics)) {
    throw new Error(`Unsupported render status: ${render.status}`);
  }
  // Allowing type assertion here because we' checked it above
  const topic =
    renderStatusTopics[render.status as keyof typeof renderStatusTopics];

  const outputConfiguration = OutputConfiguration.parse(render.output_config);

  return {
    topic,
    data: {
      id: render.id,
      status: render.status,
      created_at: render.created_at,
      completed_at: render.completed_at,
      failed_at: render.failed_at,
      width: render.width,
      height: render.height,
      fps: render.fps,
      byte_size: render.byte_size,
      duration_ms: render.duration_ms,
      md5: render.md5,
      metadata: render.metadata,
      download_url: render.completed_at
        ? downloadRenderURL(render.id, outputConfiguration)
        : null,
    },
  };
};
export const webhookBuilders: Partial<
  Record<
    `${HookedTable["schema"]}.${HookedTable["name"]}.${Operations}`,
    (newData: any, oldData?: any) => WebhookPayload<any, any>
  >
> = {
  "video2.renders.insert": buildRenderPayload,
  "video2.renders.update": buildRenderPayload,
  "video2.image_files.insert": (
    imageFile: Selectable<Video2ImageFiles>,
  ): WebhookPayload<ImageFileWebhookPayload> => {
    return {
      topic: "image_file.created",
      data: {
        id: imageFile.id,
        width: imageFile.width,
        height: imageFile.height,
        mime_type: imageFile.mime_type,
        byte_size: imageFile.byte_size,
        filename: imageFile.filename,
      },
    };
  },
  "video2.isobmff_files.insert": (
    isobmffFile: Selectable<Video2IsobmffFiles>,
  ): WebhookPayload<IsobmffFileWebhookPayload> => {
    return {
      topic: "isobmff_file.created",
      data: {
        id: isobmffFile.id,
        filename: isobmffFile.filename,
        fragment_index_complete: isobmffFile.fragment_index_complete,
        md5: isobmffFile.md5,
      },
    };
  },
  "video2.isobmff_tracks.insert": (
    isobmffTrack: Selectable<Video2IsobmffTracks>,
  ): WebhookPayload<IsobmffTrackWebhookPayload> => {
    return {
      topic: "isobmff_track.created",
      data: {
        file_id: isobmffTrack.file_id,
        track_id: isobmffTrack.track_id,
        complete: isobmffTrack.complete,
        byte_size: isobmffTrack.byte_size,
        next_byte: isobmffTrack.next_byte,
        codec_name: isobmffTrack.codec_name,
        duration_ms: isobmffTrack.duration_ms,
        probe_info: isobmffTrack.probe_info,
        type: isobmffTrack.type,
      },
    };
  },
  "video2.unprocessed_files.insert": (
    unprocessedFile: Selectable<Video2UnprocessedFiles>,
  ): WebhookPayload<UnprocessedFileWebhookPayload> => {
    return {
      topic: "unprocessed_file.created",
      data: {
        id: unprocessedFile.id,
        byte_size: unprocessedFile.byte_size,
        next_byte: unprocessedFile.next_byte,
        md5: unprocessedFile.md5,
        filename: unprocessedFile.filename,
        completed_at: unprocessedFile.completed_at,
      },
    };
  },
} as const;
