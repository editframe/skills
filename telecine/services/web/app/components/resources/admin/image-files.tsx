import { progressiveQuery } from "@/graphql.client";
import { graphql } from "@/graphql";
import type { ResourceView } from ".";
import { CreatedAt, ID, RelatedOrg, RelatedUser } from "../blocks";
import {
  Dimensions,
  FileSize,
  MimeType,
  Preview,
  Filename,
} from "../blocks/image-files";

const IndexQuery = progressiveQuery(
  "ef-admin",
  graphql(`
    query Images($limit: Int!, $offset: Int!) {
      rows: video2_image_files(order_by: {created_at: desc}, limit: $limit, offset: $offset) {
        id
        created_at
        filename 
        width
        height
        byte_size
        mime_type
        org {
          display_name
        }
        user {
          first_name
          last_name
        }
      }
    }
  `),
);

const DetailQuery = progressiveQuery(
  "ef-admin",
  graphql(`
    query Image($id: uuid!) {
      record: video2_image_files_by_pk(id: $id) {
        id
        created_at
        filename
        width
        height
        byte_size
        mime_type
        org {
          display_name
        }
        user {
          first_name
          last_name
        }
      }
    }
  `),
);

const TableHeader = () => {
  return <div className="flex justify-start py-2" />;
};

export const ImageFiles: ResourceView<typeof IndexQuery, typeof DetailQuery> = {
  index: {
    query: IndexQuery,
    TableHeader,
    columns: [
      { name: "Filename", content: Filename },
      { name: "Created At", content: CreatedAt },
      { name: "Dimensions", content: Dimensions },
      { name: "File Size", content: FileSize },
      { name: "MIME Type", content: MimeType },
      { name: "User", content: RelatedUser },
      { name: "Org", content: RelatedOrg },
    ],
  },
  detail: {
    query: DetailQuery,
    fields: [
      { name: "ID", content: ID },
      { name: "Preview", content: Preview },
      { name: "Dimensions", content: Dimensions },
      { name: "File Size", content: FileSize },
      { name: "Created At", content: CreatedAt },
      { name: "User", content: RelatedUser },
      { name: "Org", content: RelatedOrg },
    ],
  },
};
