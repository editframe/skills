import { progressiveQuery } from "@/graphql.client";
import { graphql } from "@/graphql";
import type { ResourceView } from ".";
import { Trash, Upload } from "@phosphor-icons/react";
import { Button } from "~/components/Button";
import { Link } from "react-router";
import { useFetcher } from "react-router";
import { type ContentBlock, CreatedAt, ExpiresAt } from "./blocks";
import {
  Dimensions,
  Filename,
  FileSize,
  MimeType,
  Preview,
} from "./blocks/image-files";

const IndexQuery = progressiveQuery(
  "org-reader",
  graphql(`
    query Images($orgId: uuid!, $limit: Int!, $offset: Int!, $where_clause: video2_image_files_bool_exp) {
      org: orgs_by_pk(id: $orgId) {
        page_info: image_files_aggregate(where: $where_clause) {
          aggregate {
            count
          }
        }
        rows: image_files(where: $where_clause, order_by: {created_at: desc}, limit: $limit, offset: $offset) {
          id
          created_at
          filename
          width
          height
          byte_size
          mime_type
          expires_at
        }
      }
    }
  `),
);

const DetailQuery = progressiveQuery(
  "org-reader",
  graphql(`
    query Image($id: uuid!, $orgId: uuid!) {
      record: video2_image_files(where: { id: { _eq: $id }, org_id: { _eq: $orgId } }) {
        id
        created_at
        filename
        width
        height
        byte_size
        mime_type
        expires_at
      }
    }
  `),
);

function buildWhereClause() {
  return { expires_at: { _is_null: true } };
}

const Actions: ContentBlock<{ id: string; filename: string }> = ({
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
          title: `Delete image ${filename}`,
          description: "This action cannot be undone.",
          confirmText: "Delete",
          cancelText: "Don't delete",
          challengeText: filename,
        }}
        onConfirm={() => {
          fetcher.submit(
            {},
            { method: "POST", action: `/api/v1/image_files/${id}/delete` },
          );
        }}
      >
        Delete Image
      </Button>
    </div>
  );
};

const TableHeader = () => {
  return (
    <div className="flex items-center pb-2">
      <Link to="/resource/images/upload">
        <Button mode="creative" icon={Upload}>
          Upload Image
        </Button>
      </Link>
    </div>
  );
};

export const ImageFiles: ResourceView<typeof IndexQuery, typeof DetailQuery> = {
  index: {
    query: IndexQuery,
    TableHeader,
    buildWhereClause,
    columns: [
      { name: "Filename", content: Filename },
      { name: "Created At", content: CreatedAt },
      { name: "Expires At", content: ExpiresAt },
      { name: "Dimensions", content: Dimensions },
      { name: "File Size", content: FileSize },
      { name: "MIME Type", content: MimeType },
      { name: "", content: Actions },
    ],
  },
  detail: {
    query: DetailQuery,
    fields: [
      { name: "Preview", content: Preview },
      { name: "Dimensions", content: Dimensions },
      { name: "File Size", content: FileSize },
      { name: "Created At", content: CreatedAt },
      { name: "Expires At", content: ExpiresAt },
      { name: "", content: Actions, noHighlight: true, vertical: true },
    ],
  },
};
