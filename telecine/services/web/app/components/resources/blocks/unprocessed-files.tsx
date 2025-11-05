import { Link } from "~/components/Link";
import type { ContentBlock } from ".";
import { relatedResourceUrl } from "..";
import { ByteSizeDisplay } from "~/components/ByteSizeDisplay";
import { ProcessDuration } from "~/ui/timeAgoInWords";

export const Filename: ContentBlock<{ filename: string }> = ({
  record: { filename },
}) => {
  return filename;
};
export const ProcessedFile: ContentBlock<{
  process_isobmff: { isobmff_file_id: string | null } | null;
  id: string;
}> = ({ record: { process_isobmff, id }, resourceType, resourceId }) => {
  return process_isobmff?.isobmff_file_id ? (
    <Link
      to={relatedResourceUrl(
        resourceType ?? "unprocessed_files",
        resourceId ?? id,
        "isobmff_files",
        process_isobmff.isobmff_file_id,
      )}
    >
      View
    </Link>
  ) : (
    "—"
  );
};
export const ProcessISOBMFF: ContentBlock<{
  process_isobmff: { id: string | null } | null;
  id: string;
}> = ({ record: { process_isobmff, id }, resourceType, resourceId }) => {
  return process_isobmff?.id ? (
    <Link
      to={relatedResourceUrl(
        resourceType ?? "unprocessed_files",
        resourceId ?? id,
        "process_isobmff",
        process_isobmff.id,
      )}
    >
      View
    </Link>
  ) : (
    "—"
  );
};
export const ByteSize: ContentBlock<{ byte_size: number }> = ({
  record: { byte_size },
}) => {
  return <ByteSizeDisplay bytes={byte_size} />;
};
export const BytesUploaded: ContentBlock<{
  completed_at: string | null;
  next_byte: number | null;
}> = ({ record: { completed_at, next_byte } }) => {
  return completed_at ? "All" : <ByteSizeDisplay bytes={next_byte ?? 0} />;
};
export const UploadTime: ContentBlock<{
  completed_at: string | null;
  created_at: string;
}> = ({ record: { completed_at, created_at } }) => {
  return <ProcessDuration startedAt={created_at} completedAt={completed_at} />;
};
