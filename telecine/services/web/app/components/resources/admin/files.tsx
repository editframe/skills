import { progressiveQuery } from "@/graphql.client";
import { graphql } from "@/graphql";
import type { ResourceView } from ".";
import { CreatedAt, CompletedAt, ExpiresAt, ID, MD5, RelatedOrg, RelatedUser } from "../blocks";
import {
  Dimensions,
  FileSize,
  MimeType,
  Filename,
  Progress,
  Status,
  Type,
} from "../blocks/files";
import { useDebouncedSearchParams } from "~/hooks/useDebouncedSearchParams";
import clsx from "clsx";

const IndexQuery = progressiveQuery(
  "ef-admin",
  graphql(`
    query AdminFiles(
      $limit: Int!
      $offset: Int!
      $where_clause: video2_files_bool_exp
    ) {
      page_info: video2_files_aggregate(where: $where_clause) {
        aggregate {
          count
        }
      }
      rows: video2_files(
        where: $where_clause
        order_by: { created_at: desc }
        limit: $limit
        offset: $offset
      ) {
        id
        type
        status
        filename
        byte_size
        next_byte
        md5
        mime_type
        width
        height
        created_at
        completed_at
        expires_at
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
    query AdminFile($id: uuid!) {
      record: video2_files_by_pk(id: $id) {
        id
        type
        status
        filename
        byte_size
        next_byte
        md5
        mime_type
        width
        height
        created_at
        completed_at
        expires_at
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

function buildWhereClause(searchParams: URLSearchParams) {
  const filename = searchParams.get("filename")?.trim();
  const type = searchParams.get("type")?.trim();

  const whereClause: {
    filename?: { _ilike: string };
    type?: { _eq: string };
  } = {};

  if (filename) {
    whereClause.filename = { _ilike: `%${filename}%` };
  }
  if (type) {
    whereClause.type = { _eq: type };
  }

  return whereClause;
}

const Filter = () => {
  const [filename, setFilename] = useDebouncedSearchParams("filename");
  const [type, setType] = useDebouncedSearchParams("type");

  return (
    <div
      className={clsx(
        "flex items-center gap-4 pb-3 text-xs transition-colors",
      )}
    >
      <div className="flex items-center gap-2">
        <span
          className={clsx(
            "font-medium transition-colors",
            "text-slate-600 dark:text-slate-400",
          )}
        >
          Filename:
        </span>
        <input
          type="text"
          value={filename}
          placeholder="Search filename..."
          className={clsx(
            "px-3 py-1.5 border rounded-md text-xs transition-all duration-150 relative",
            "bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm",
            "text-slate-900 dark:text-white",
            "border-slate-300/75 dark:border-slate-700/75",
            "placeholder:text-slate-400 dark:placeholder:text-slate-500",
            "shadow-[0_1px_2px_0_rgb(0_0_0_/_0.06)] dark:shadow-[0_1px_2px_0_rgb(0_0_0_/_0.3)]",
            "focus:outline-none focus:ring-1 focus:ring-blue-500/50 dark:focus:ring-blue-400/50",
            "focus:border-blue-500/85 dark:focus:border-blue-400/85",
          )}
          onChange={(e) => setFilename(e.target.value)}
        />
      </div>
      <div className="flex items-center gap-2">
        <span
          className={clsx(
            "font-medium transition-colors",
            "text-slate-600 dark:text-slate-400",
          )}
        >
          Type:
        </span>
        <input
          type="text"
          value={type}
          placeholder="Filter by type..."
          className={clsx(
            "px-3 py-1.5 border rounded-md text-xs transition-all duration-150 relative",
            "bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm",
            "text-slate-900 dark:text-white",
            "border-slate-300/75 dark:border-slate-700/75",
            "placeholder:text-slate-400 dark:placeholder:text-slate-500",
            "shadow-[0_1px_2px_0_rgb(0_0_0_/_0.06)] dark:shadow-[0_1px_2px_0_rgb(0_0_0_/_0.3)]",
            "focus:outline-none focus:ring-1 focus:ring-blue-500/50 dark:focus:ring-blue-400/50",
            "focus:border-blue-500/85 dark:focus:border-blue-400/85",
          )}
          onChange={(e) => setType(e.target.value)}
        />
      </div>
    </div>
  );
};

const TableHeader = () => <Filter />;

export const Files: ResourceView<typeof IndexQuery, typeof DetailQuery> = {
  index: {
    query: IndexQuery,
    TableHeader,
    buildWhereClause,
    columns: [
      { name: "Type", content: Type },
      { name: "Status", content: Status },
      { name: "Filename", content: Filename },
      { name: "Progress", content: Progress },
      { name: "Created At", content: CreatedAt },
      { name: "File Size", content: FileSize },
      { name: "User", content: RelatedUser },
      { name: "Org", content: RelatedOrg },
    ],
  },
  detail: {
    query: DetailQuery,
    fields: [
      { name: "Progress", content: Progress, noHighlight: true, vertical: true },
      { name: "ID", content: ID },
      { name: "Type", content: Type },
      { name: "Status", content: Status },
      { name: "Filename", content: Filename },
      { name: "Dimensions", content: Dimensions },
      { name: "File Size", content: FileSize },
      { name: "MIME Type", content: MimeType },
      { name: "MD5", content: MD5 },
      { name: "Created At", content: CreatedAt },
      { name: "Completed At", content: CompletedAt },
      { name: "Expires At", content: ExpiresAt },
      { name: "User", content: RelatedUser },
      { name: "Org", content: RelatedOrg },
    ],
  },
};
