import debug from "debug";
import { types } from "mime-types";
import { z } from "zod";

import type { Client } from "../client.js";
import { uploadChunks } from "../uploadChunks.js";

const log = debug("ef:api:image-file");

const MAX_IMAGE_SIZE = 1024 * 1024 * 16; // 16MB

export const ImageFileMimeTypes = z.enum([
  "image/jpeg",
  "image/png",
  "image/jpg",
  "image/webp",
  "image/svg+xml",
]);

function getFileExtension(path: string) {
  const match = path.match(/\.([^.]+)$/);
  return match ? match[1] : null;
}

export const CreateImageFilePayload = z
  .object({
    /**
     * The md5 hash of the image file.
     */
    md5: z.string().optional(),
    /**
     * The height of the image file in pixels.
     */
    height: z.number().int().optional(),
    /**
     * The width of the image file in pixels.
     */
    width: z.number().int().optional(),
    /**
     * The mime type of the image file. Optional if the filename has a known file extension.
     */
    mime_type: ImageFileMimeTypes.optional(),
    /**
     * The filename of the image file.
     */
    filename: z.string(),
    /**
     * The byte size of the image file.
     */
    byte_size: z.number().int().max(MAX_IMAGE_SIZE),
  })
  .superRefine((data, ctx) => {
    const extension = getFileExtension(data.filename);
    const mimeType = extension ? types[extension] : null;
    const parsedMimeType = ImageFileMimeTypes.safeParse(mimeType).data;

    if (parsedMimeType) {
      data.mime_type = parsedMimeType;
    }

    if (!parsedMimeType && !data.mime_type) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "mime_type is required when filename extension doesn't match a known image type",
        path: ["mime_type"],
      });
    }
  });

export type CreateImageFilePayload = z.infer<typeof CreateImageFilePayload>;

export interface CreateImageFileResult {
  /**
   * Whether the image file has been fully uploaded.
   */
  complete: boolean | null;
  /**
   * The byte size of the image file.
   */
  byte_size: number;
  /**
   * The id of the image file.
   */
  id: string;
  /**
   * The md5 hash of the image file.
   */
  md5: string | null;
}

export interface LookupImageFileByMd5Result {
  /**
   * Whether the image file has been fully uploaded.
   */
  complete: boolean | null;
  /**
   * The byte size of the image file.
   */
  byte_size: number;
  /**
   * The id of the image file.
   */
  id: string;
  /**
   * md5 hash of the image file.
   */
  md5: string | null;
  /**
   * The height of the image file in pixels.
   */
  height: number | null;
  /**
   * The width of the image file in pixels.
   */
  width: number | null;
}

export interface GetImageFileMetadataResult extends LookupImageFileByMd5Result {}

export const createImageFile = async (
  client: Client,
  payload: CreateImageFilePayload,
) => {
  log("Creating image file", payload);
  CreateImageFilePayload.parse(payload);
  const response = await client.authenticatedFetch("/api/v1/image_files", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  log("Image file created", response);

  if (response.ok) {
    return (await response.json()) as CreateImageFileResult;
  }

  throw new Error(
    `Failed to create file ${response.status} ${response.statusText}`,
  );
};

export const uploadImageFile = (
  client: Client,
  uploadDetails: {
    id: string;
    byte_size: number;
  },
  fileStream: ReadableStream,
  chunkSizeBytes?: number,
) => {
  log("Uploading image file", uploadDetails.id);

  return uploadChunks(client, {
    url: `/api/v1/image_files/${uploadDetails.id}/upload`,
    fileSize: uploadDetails.byte_size,
    fileStream,
    maxSize: MAX_IMAGE_SIZE,
    chunkSizeBytes,
  });
};

export const getImageFileMetadata = async (
  client: Client,
  id: string,
): Promise<GetImageFileMetadataResult | null> => {
  const response = await client.authenticatedFetch(
    `/api/v1/image_files/${id}.json`,
    {
      method: "GET",
    },
  );

  if (response.ok) {
    return (await response.json()) as LookupImageFileByMd5Result;
  }

  return null;
};

export const lookupImageFileByMd5 = async (
  client: Client,
  md5: string,
): Promise<LookupImageFileByMd5Result | null> => {
  const response = await client.authenticatedFetch(
    `/api/v1/image_files/md5/${md5}`,
    {
      method: "GET",
    },
  );
  log("Image file lookup", response);

  if (response.ok) {
    return (await response.json()) as LookupImageFileByMd5Result;
  }

  if (response.status === 404) {
    return null;
  }

  throw new Error(
    `Failed to lookup image by md5 ${md5} ${response.status} ${response.statusText}`,
  );
};
