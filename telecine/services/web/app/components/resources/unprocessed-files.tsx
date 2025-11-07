import { Link } from "../Link";
import { progressiveQuery } from "@/graphql.client";
import { graphql } from "@/graphql";
import type { ResourceView } from ".";
import { Button } from "~/components/Button";
import { Trash, Upload, Link as LinkIcon } from "@phosphor-icons/react";
import { useFetcher } from "react-router";
import { CompletedAt, type ContentBlock, CreatedAt, ID, MD5 } from "./blocks";
import {
  ByteSize,
  BytesUploaded,
  Filename,
  ProcessedFile,
  ProcessISOBMFF,
  UploadTime,
} from "./blocks/unprocessed-files";

const IndexQuery = progressiveQuery(
  "org-reader",
  graphql(`
    query UnprocessedFiles($orgId: uuid!, $limit: Int!, $offset: Int!) {
      org: orgs_by_pk(id: $orgId) {
        page_info: unprocessed_files_aggregate {
          aggregate {
            count
          }
        }
        rows: unprocessed_files(
          order_by: {created_at: desc}
          limit: $limit
          offset: $offset
        ) {
          id
          md5
          created_at
          completed_at
          filename
          complete
          byte_size
          next_byte
          process_isobmff {
            id
            isobmff_file_id
            isobmff_file {
              id
            }
          }
        }
      }
    }
  `),
);

const DetailQuery = progressiveQuery(
  "org-reader",
  graphql(`
    query UnprocessedFile($id: uuid!, $orgId: uuid!) {
      record: video2_unprocessed_files(where: { id: { _eq: $id }, org_id: { _eq: $orgId } }) {
        id
        md5
        created_at
        completed_at
        filename
        complete
        byte_size
        next_byte
        process_isobmff {
          id
          isobmff_file_id
          isobmff_file {
            id
          }
        }
      }
    }
  `),
);

const Actions: ContentBlock<{ filename: string }> = ({
  id,
  record: { filename },
}) => {
  const fetcher = useFetcher();
  const isLoading = fetcher.state !== "idle";

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        mode="destructive"
        icon={Trash}
        disabled={isLoading}
        loading={isLoading}
        confirmation={{
          title: `Delete file ${filename}`,
          description: "This action cannot be undone.",
          confirmText: "Delete",
          cancelText: "Don't delete",
          challengeText: filename,
        }}
        onConfirm={() => {
          fetcher.submit(
            {},
            {
              method: "POST",
              action: `/api/v1/unprocessed_files/${id}/delete`,
            },
          );
        }}
      >
        Delete File
      </Button>
    </div>
  );
};

const TableHeader = () => {
  return (
    <div className="flex items-center gap-2 pb-2">
      <Link to="/resource/isobmff_files/upload">
        <Button mode="creative" icon={Upload}>
          Upload File
        </Button>
      </Link>
      <Link to="/resource/isobmff_files/ingest">
        <Button mode="creative" icon={LinkIcon}>
          Ingest URL
        </Button>
      </Link>
    </div>
  );
};

export const UnprocessedFiles: ResourceView<
  typeof IndexQuery,
  typeof DetailQuery
> = {
  index: {
    query: IndexQuery,
    TableHeader,
    columns: [
      { name: "Filename", content: Filename },
      { name: "Byte Size", content: ByteSize },
      { name: "Bytes Uploaded", content: BytesUploaded },
      { name: "Created At", content: CreatedAt },
      { name: "Completed At", content: CompletedAt },
      { name: "Processing Time", content: UploadTime },
      { name: "Processed File", content: ProcessedFile },
      { name: "Process ISOBMFF", content: ProcessISOBMFF },
      { name: "MD5", content: MD5 },
      { name: "", content: Actions },
    ],
  },
  detail: {
    query: DetailQuery,
    fields: [
      { name: "Filename", content: Filename },
      { name: "Created At", content: CreatedAt },
      { name: "Completed At", content: CompletedAt },
      { name: "Upload duration", content: UploadTime },
      { name: "Processed File", content: ProcessedFile },
      { name: "Process ISOBMFF", content: ProcessISOBMFF },
      { name: "Byte Size", content: ByteSize },
      { name: "Bytes Uploaded", content: BytesUploaded },
      { name: "MD5", content: MD5 },
      { name: "ID", content: ID },
      { name: "", content: Actions, noHighlight: true, vertical: true },
    ],
  },
};
