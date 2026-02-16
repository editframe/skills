import { progressiveQuery } from "@/graphql.client";
import { graphql } from "@/graphql";
import type { ResourceView } from ".";
import { Trash, Upload } from "@phosphor-icons/react";
import { Button } from "~/components/Button";
import { Link, useFetcher } from "react-router";
import {
  type ContentBlock,
  CreatedAt,
  CompletedAt,
  ExpiresAt,
  ID,
  MD5,
} from "./blocks";
import {
  Dimensions,
  Filename,
  FileSize,
  MimeType,
  Preview,
  Progress,
  Status,
  Type,
} from "./blocks/files";
import { useSearchParams } from "react-router";
import clsx from "clsx";
import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
} from "@headlessui/react";

export const IndexQuery = progressiveQuery(
  "org-reader",
  graphql(`
    query Files(
      $orgId: uuid!
      $limit: Int!
      $offset: Int!
      $where_clause: video2_files_bool_exp
    ) {
      org: orgs_by_pk(id: $orgId) {
        page_info: files_aggregate(where: $where_clause) {
          aggregate {
            count
          }
        }
        rows: files(
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
          mime_type
          width
          height
          created_at
          expires_at
        }
      }
    }
  `),
);

export const DetailQuery = progressiveQuery(
  "org-reader",
  graphql(`
    query File($id: uuid!, $orgId: uuid!) {
      record: video2_files(
        where: { id: { _eq: $id }, org_id: { _eq: $orgId } }
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
      }
    }
  `),
);

function buildWhereClause(searchParams: URLSearchParams) {
  const type = searchParams.get("type")?.trim();
  const status = searchParams.get("status")?.trim();

  const whereClause: {
    type?: { _eq: string };
    status?: { _eq: string };
    expires_at: { _is_null: boolean };
  } = { expires_at: { _is_null: true } };

  if (type) {
    whereClause.type = { _eq: type };
  }
  if (status) {
    whereClause.status = { _eq: status };
  }

  return whereClause;
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
          title: `Delete file ${filename}`,
          description: "This action cannot be undone.",
          confirmText: "Delete",
          cancelText: "Don't delete",
          challengeText: filename,
        }}
        onConfirm={() => {
          fetcher.submit(
            {},
            { method: "POST", action: `/api/v1/files/${id}/delete` },
          );
        }}
      >
        Delete
      </Button>
    </div>
  );
};

const typeOptions = [
  { id: "all", label: "All types" },
  { id: "video", label: "Video" },
  { id: "image", label: "Image" },
  { id: "caption", label: "Caption" },
];

const statusOptions = [
  { id: "all", label: "All statuses" },
  { id: "ready", label: "Ready" },
  { id: "processing", label: "Processing" },
  { id: "failed", label: "Failed" },
  { id: "created", label: "Created" },
  { id: "uploading", label: "Uploading" },
];

const listboxButtonClass = clsx(
  "rounded border px-2 py-1 text-xs transition-colors",
  "bg-white dark:bg-slate-800",
  "border-slate-300 dark:border-slate-700",
  "text-slate-900 dark:text-white",
);

const listboxOptionsClass = clsx(
  "z-50 mt-1 max-h-60 w-40 overflow-auto rounded border py-1 text-xs shadow-lg",
  "bg-white dark:bg-slate-800",
  "border-slate-300 dark:border-slate-700",
);

const Filter = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const type = searchParams.get("type") ?? "all";
  const status = searchParams.get("status") ?? "all";

  const updateFilter = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value === "all" || !value) {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    next.set("page", "0");
    setSearchParams(next, { preventScrollReset: true });
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 text-xs">
      <div className="flex items-center gap-2">
        <span className="font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
          Type:
        </span>
        <Listbox
          value={type}
          onChange={(v) => updateFilter("type", v)}
          name="type"
        >
          <ListboxButton className={listboxButtonClass}>
            {typeOptions.find((o) => o.id === type)?.label ?? "All types"}
          </ListboxButton>
          <ListboxOptions anchor="bottom start" className={listboxOptionsClass}>
            {typeOptions.map((opt) => (
              <ListboxOption key={opt.id} value={opt.id}>
                {({ selected, focus }) => (
                  <div
                    className={clsx(
                      "flex items-center px-2 py-1 cursor-pointer transition-colors",
                      focus && "bg-slate-100 dark:bg-slate-700",
                      selected && "font-medium",
                    )}
                  >
                    <span
                      className={clsx(
                        "mr-2",
                        selected
                          ? "text-blue-600 dark:text-blue-400"
                          : "text-slate-400 dark:text-slate-500",
                      )}
                    >
                      {selected ? "✓" : "○"}
                    </span>
                    <span className="text-slate-900 dark:text-white">
                      {opt.label}
                    </span>
                  </div>
                )}
              </ListboxOption>
            ))}
          </ListboxOptions>
        </Listbox>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
          Status:
        </span>
        <Listbox
          value={status}
          onChange={(v) => updateFilter("status", v)}
          name="status"
        >
          <ListboxButton className={listboxButtonClass}>
            {statusOptions.find((o) => o.id === status)?.label ??
              "All statuses"}
          </ListboxButton>
          <ListboxOptions anchor="bottom start" className={listboxOptionsClass}>
            {statusOptions.map((opt) => (
              <ListboxOption key={opt.id} value={opt.id}>
                {({ selected, focus }) => (
                  <div
                    className={clsx(
                      "flex items-center px-2 py-1 cursor-pointer transition-colors",
                      focus && "bg-slate-100 dark:bg-slate-700",
                      selected && "font-medium",
                    )}
                  >
                    <span
                      className={clsx(
                        "mr-2",
                        selected
                          ? "text-blue-600 dark:text-blue-400"
                          : "text-slate-400 dark:text-slate-500",
                      )}
                    >
                      {selected ? "✓" : "○"}
                    </span>
                    <span className="text-slate-900 dark:text-white">
                      {opt.label}
                    </span>
                  </div>
                )}
              </ListboxOption>
            ))}
          </ListboxOptions>
        </Listbox>
      </div>
    </div>
  );
};

const TableHeader = () => (
  <div className="flex items-center justify-between pb-2">
    <Filter />
    <Link to="/resource/upload-file">
      <Button mode="creative" icon={Upload}>
        Upload File
      </Button>
    </Link>
  </div>
);

const StatusFilter = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const status = searchParams.get("status") ?? "all";

  const updateFilter = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value === "all" || !value) {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    next.set("page", "0");
    setSearchParams(next, { preventScrollReset: true });
  };

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
        Status:
      </span>
      <Listbox
        value={status}
        onChange={(v) => updateFilter("status", v)}
        name="status"
      >
        <ListboxButton className={listboxButtonClass}>
          {statusOptions.find((o) => o.id === status)?.label ?? "All statuses"}
        </ListboxButton>
        <ListboxOptions anchor="bottom start" className={listboxOptionsClass}>
          {statusOptions.map((opt) => (
            <ListboxOption key={opt.id} value={opt.id}>
              {({ selected, focus }) => (
                <div
                  className={clsx(
                    "flex items-center px-2 py-1 cursor-pointer transition-colors",
                    focus && "bg-slate-100 dark:bg-slate-700",
                    selected && "font-medium",
                  )}
                >
                  <span
                    className={clsx(
                      "mr-2",
                      selected
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-slate-400 dark:text-slate-500",
                    )}
                  >
                    {selected ? "✓" : "○"}
                  </span>
                  <span className="text-slate-900 dark:text-white">
                    {opt.label}
                  </span>
                </div>
              )}
            </ListboxOption>
          ))}
        </ListboxOptions>
      </Listbox>
    </div>
  );
};

const fileDetailFields = [
  { name: "Preview", content: Preview, noHighlight: true, vertical: true },
  { name: "Progress", content: Progress, noHighlight: true, vertical: true },
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
  { name: "ID", content: ID },
  { name: "", content: Actions, noHighlight: true, vertical: true },
] as const;

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
      { name: "", content: Actions },
    ],
  },
  detail: {
    query: DetailQuery,
    fields: [...fileDetailFields],
  },
};

export function createFileTypeView(
  fileType: string,
  uploadPath: string,
): ResourceView<typeof IndexQuery, typeof DetailQuery> {
  const SubtypeTableHeader = () => (
    <div className="flex items-center justify-between pb-2">
      <StatusFilter />
      <Link to={uploadPath}>
        <Button mode="creative" icon={Upload}>
          Upload File
        </Button>
      </Link>
    </div>
  );

  return {
    index: {
      query: IndexQuery,
      TableHeader: SubtypeTableHeader,
      buildWhereClause(searchParams: URLSearchParams) {
        const status = searchParams.get("status")?.trim();
        const whereClause: {
          type: { _eq: string };
          status?: { _eq: string };
          expires_at: { _is_null: boolean };
        } = { type: { _eq: fileType }, expires_at: { _is_null: true } };
        if (status) {
          whereClause.status = { _eq: status };
        }
        return whereClause;
      },
      columns: [
        { name: "Status", content: Status },
        { name: "Filename", content: Filename },
        { name: "Progress", content: Progress },
        { name: "Created At", content: CreatedAt },
        { name: "File Size", content: FileSize },
        { name: "", content: Actions },
      ],
    },
    detail: {
      query: DetailQuery,
      fields: [...fileDetailFields],
    },
  };
}

export const VideoFiles = createFileTypeView("video", "/resource/upload-file");
export const ImageFiles = createFileTypeView("image", "/resource/upload-file");
export const CaptionFiles = createFileTypeView("caption", "/resource/upload-file");
