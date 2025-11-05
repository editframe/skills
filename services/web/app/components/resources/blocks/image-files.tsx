import { ByteSizeDisplay } from "~/components/ByteSizeDisplay";
import type { ContentBlock } from ".";

export const Filename: ContentBlock<{ filename: string }> = ({
  record: { filename },
}) => <>{filename}</>;

export const Dimensions: ContentBlock<{
  width: number | null;
  height: number | null;
}> = ({ record: { width, height } }) => (
  <>{width && height ? `${width}×${height}` : "—"}</>
);

export const FileSize: ContentBlock<{ byte_size: number }> = ({
  record: { byte_size },
}) => <ByteSizeDisplay bytes={byte_size} />;

export const MimeType: ContentBlock<{ mime_type: string }> = ({
  record: { mime_type },
}) => <>{mime_type}</>;

export const Preview: ContentBlock<{ id: string }> = ({ record: { id } }) => (
  <img
    src={`/api/v1/image_files/${id}`}
    alt="Image preview"
    className="max-w-md max-h-[32rem] rounded-lg shadow-sm object-contain"
  />
);
