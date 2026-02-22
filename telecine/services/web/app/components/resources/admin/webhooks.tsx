import { progressiveQuery } from "@/graphql.client";
import { graphql } from "@/graphql";
import type { ResourceView } from ".";
import { useSearchParams } from "react-router";
import clsx from "clsx";
import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
} from "@headlessui/react";
import { ID, CreatedAt } from "../blocks";
import {
  DeliveriesCount,
  DeliveriesTable,
  Status,
  Topic,
  Payload,
} from "../blocks/webhooks";

const IndexQuery = progressiveQuery(
  "ef-admin",
  graphql(`
    query Webhooks(
      $limit: Int!,
      $offset: Int!,
      $where_clause: api_webhook_events_bool_exp
    ) {
      rows: api_webhook_events(
        where: $where_clause,
        order_by: { created_at: desc },
        limit: $limit,
        offset: $offset,
      ) {
        json_payload
        qualified_table
        record_id
        url
        updated_at
        id
        failed_at
        delivered_at
        created_at
        api_key_id
        topic
        deliveries_aggregate {
          aggregate {
            count
          }
        }
      }
    }
  `),
  graphql(`
    query WebhooksCount(
      $limit: Int!,
      $offset: Int!,
      $where_clause: api_webhook_events_bool_exp
    ) {
      page_info: api_webhook_events_aggregate(where: $where_clause) {
        aggregate {
          count
        }
      }
    }
  `),
);

const DetailQuery = progressiveQuery(
  "ef-admin",
  graphql(`
    query Webhook($id: uuid!) {
      record: api_webhook_events_by_pk(id: $id) {
        json_payload
        qualified_table
        record_id
        url
        updated_at
        id
        failed_at
        delivered_at
        created_at
        api_key_id
        topic
        deliveries(order_by: { attempt_number: asc }) {
          id
          created_at
          request_headers
          response_headers
          response_status
          response_text
        }
        deliveries_aggregate {
          aggregate {
            count
          }
        }
      }
    }
  `),
);

function buildWhereClause(searchParams: URLSearchParams) {
  const topics = searchParams.get("topics")?.split(",").filter(Boolean) || [];
  const status = searchParams.get("status") ?? "all";

  const whereClause: {
    topic?: { _in: string[] };
    failed_at?: { _is_null?: boolean };
    delivered_at?: { _is_null?: boolean };
  } = {};

  if (topics.length > 0) {
    whereClause.topic = { _in: topics };
  }
  if (status === "failed") {
    whereClause.failed_at = { _is_null: false };
  } else if (status === "delivered") {
    whereClause.delivered_at = { _is_null: false };
  } else if (status === "pending") {
    whereClause.failed_at = { _is_null: true };
    whereClause.delivered_at = { _is_null: true };
  }
  return whereClause;
}

const Filter = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const status = searchParams.get("status") ?? "all";
  const topics = searchParams.get("topics")?.split(",").filter(Boolean) || [];
  const updateSearchParams = (params: Record<string, string>) => {
    const currentSearchParams = Object.fromEntries(searchParams.entries());
    const nextSearchParams = {
      ...currentSearchParams,
      ...params,
    };
    if (nextSearchParams.topics === "") {
      // biome-ignore lint/performance/noDelete: Low-frequency operation
      delete nextSearchParams.topics;
    }
    setSearchParams(nextSearchParams, { preventScrollReset: true });
  };

  const availableTopics = [
    "render.created",
    "render.completed",
    "render.failed",
    "render.pending",
    "render.rendering",
    "file.created",
    "file.ready",
    "file.failed",
    "file.uploading",
    "file.processing",
    "image_file.created",
    "isobmff_file.created",
    "isobmff_track.created",
    "unprocessed_file.created",
  ];
  const availableStatuses = [
    { id: "all", label: "All" },
    { id: "delivered", label: "Delivered" },
    { id: "failed", label: "Failed" },
    { id: "pending", label: "Pending" },
  ];

  return (
    <table className="w-full border-collapse">
      <thead>
        <tr>
          <td colSpan={5}>
            <div
              className={clsx(
                "flex flex-col sm:flex-row items-start sm:items-center gap-3 pb-3 text-xs transition-colors",
              )}
            >
              <div className="flex items-center gap-2">
                <span
                  className={clsx(
                    "font-medium transition-colors",
                    "text-slate-600 dark:text-slate-400",
                  )}
                >
                  Status:
                </span>
                <Listbox
                  value={status}
                  onChange={(newStatus) => {
                    updateSearchParams({
                      status: newStatus,
                      page: "0",
                    });
                  }}
                >
                  <ListboxButton
                    className={clsx(
                      "rounded-md border px-3 py-1.5 text-xs transition-all duration-150 relative backdrop-blur-sm",
                      "bg-white/95 dark:bg-slate-800/95",
                      "text-slate-900 dark:text-white",
                      "border-slate-300/75 dark:border-slate-700/75",
                      "shadow-[0_1px_2px_0_rgb(0_0_0_/_0.06)] dark:shadow-[0_1px_2px_0_rgb(0_0_0_/_0.3)]",
                      "before:absolute before:inset-0 before:bg-gradient-to-br before:from-amber-50/18 before:via-transparent before:to-transparent",
                      "dark:before:from-blue-950/15 dark:before:via-transparent dark:before:to-transparent",
                      "before:pointer-events-none before:rounded-md",
                      "hover:bg-white dark:hover:bg-slate-800/90",
                      "hover:border-slate-300/85 dark:hover:border-slate-700/85",
                      "hover:shadow-[0_1px_2px_0_rgb(0_0_0_/_0.08)] dark:hover:shadow-[0_1px_2px_0_rgb(0_0_0_/_0.35)]",
                      "focus:outline-none focus:ring-1 focus:ring-blue-500/50 dark:focus:ring-blue-400/50",
                      "focus:border-blue-500/85 dark:focus:border-blue-400/85",
                      "focus:shadow-[0_1px_2px_0_rgb(0_0_0_/_0.08),0_2px_4px_0_rgb(59_130_246_/_0.15)]",
                      "dark:focus:shadow-[0_1px_2px_0_rgb(0_0_0_/_0.35),0_2px_4px_0_rgb(59_130_246_/_0.2)]",
                      "focus:before:from-blue-50/30 dark:focus:before:from-blue-950/22",
                    )}
                  >
                    {availableStatuses.find((s) => s.id === status)?.label ??
                      "All"}
                  </ListboxButton>
                  <ListboxOptions
                    anchor="bottom start"
                    className={clsx(
                      "absolute z-10 mt-1 max-h-60 w-48 overflow-auto rounded-md border py-1 text-xs transition-all backdrop-blur-sm",
                      "bg-white/90 dark:bg-slate-800/90",
                      "border-slate-300/60 dark:border-slate-700/60",
                      "shadow-[0_1px_2px_0_rgb(0_0_0_/_0.08),0_4px_12px_0_rgb(0_0_0_/_0.12)]",
                      "dark:shadow-[0_1px_2px_0_rgb(0_0_0_/_0.4),0_4px_12px_0_rgb(0_0_0_/_0.5)]",
                    )}
                  >
                    {availableStatuses.map((statusOption) => (
                      <ListboxOption
                        key={statusOption.id}
                        value={statusOption.id}
                      >
                        {({ selected, active }) => (
                          <div
                            className={clsx(
                              "flex items-center px-2 py-1 cursor-pointer transition-colors",
                              active && "bg-blue-50 dark:bg-blue-900/30",
                              selected && "font-medium",
                              "text-slate-900 dark:text-white",
                            )}
                          >
                            <span
                              className={clsx(
                                "mr-2 transition-colors",
                                selected
                                  ? "text-blue-500 dark:text-blue-400"
                                  : "text-slate-400 dark:text-slate-500",
                              )}
                            >
                              {selected ? "✓" : "○"}
                            </span>
                            {statusOption.label}
                          </div>
                        )}
                      </ListboxOption>
                    ))}
                  </ListboxOptions>
                </Listbox>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={clsx(
                    "font-medium transition-colors",
                    "text-slate-600 dark:text-slate-400",
                  )}
                >
                  Topics:
                </span>
                <Listbox
                  multiple
                  value={topics}
                  onChange={(newSelectedTopics) => {
                    updateSearchParams({
                      topics: newSelectedTopics.join(","),
                      page: "0",
                    });
                  }}
                >
                  <ListboxButton
                    className={clsx(
                      "rounded-md border px-3 py-1.5 text-xs transition-all duration-150 relative backdrop-blur-sm",
                      "bg-white/95 dark:bg-slate-800/95",
                      "text-slate-900 dark:text-white",
                      "border-slate-300/75 dark:border-slate-700/75",
                      "shadow-[0_1px_2px_0_rgb(0_0_0_/_0.06)] dark:shadow-[0_1px_2px_0_rgb(0_0_0_/_0.3)]",
                      "before:absolute before:inset-0 before:bg-gradient-to-br before:from-amber-50/18 before:via-transparent before:to-transparent",
                      "dark:before:from-blue-950/15 dark:before:via-transparent dark:before:to-transparent",
                      "before:pointer-events-none before:rounded-md",
                      "hover:bg-white dark:hover:bg-slate-800/90",
                      "hover:border-slate-300/85 dark:hover:border-slate-700/85",
                      "hover:shadow-[0_1px_2px_0_rgb(0_0_0_/_0.08)] dark:hover:shadow-[0_1px_2px_0_rgb(0_0_0_/_0.35)]",
                      "focus:outline-none focus:ring-1 focus:ring-blue-500/50 dark:focus:ring-blue-400/50",
                      "focus:border-blue-500/85 dark:focus:border-blue-400/85",
                      "focus:shadow-[0_1px_2px_0_rgb(0_0_0_/_0.08),0_2px_4px_0_rgb(59_130_246_/_0.15)]",
                      "dark:focus:shadow-[0_1px_2px_0_rgb(0_0_0_/_0.35),0_2px_4px_0_rgb(59_130_246_/_0.2)]",
                      "focus:before:from-blue-50/30 dark:focus:before:from-blue-950/22",
                    )}
                  >
                    {topics.length === 0 ||
                    topics.length === availableTopics.length
                      ? "All topics"
                      : `${topics.length} selected`}
                  </ListboxButton>
                  <ListboxOptions
                    anchor="bottom start"
                    className={clsx(
                      "absolute z-10 mt-1 max-h-60 w-48 overflow-auto rounded-md border py-1 text-xs transition-all backdrop-blur-sm",
                      "bg-white/90 dark:bg-slate-800/90",
                      "border-slate-300/60 dark:border-slate-700/60",
                      "shadow-[0_1px_2px_0_rgb(0_0_0_/_0.08),0_4px_12px_0_rgb(0_0_0_/_0.12)]",
                      "dark:shadow-[0_1px_2px_0_rgb(0_0_0_/_0.4),0_4px_12px_0_rgb(0_0_0_/_0.5)]",
                    )}
                  >
                    {availableTopics.map((topic) => (
                      <ListboxOption key={topic} value={topic}>
                        {({ selected, active }) => (
                          <div
                            className={clsx(
                              "flex items-center px-2 py-1 cursor-pointer transition-colors",
                              active && "bg-blue-50 dark:bg-blue-900/30",
                              selected && "font-medium",
                              "text-slate-900 dark:text-white",
                            )}
                          >
                            <span
                              className={clsx(
                                "mr-2 transition-colors",
                                selected
                                  ? "text-blue-500 dark:text-blue-400"
                                  : "text-slate-400 dark:text-slate-500",
                              )}
                            >
                              {selected ? "✓" : "○"}
                            </span>
                            {topic}
                          </div>
                        )}
                      </ListboxOption>
                    ))}
                  </ListboxOptions>
                </Listbox>
              </div>
            </div>
          </td>
        </tr>
      </thead>
    </table>
  );
};

export const Webhooks: ResourceView<typeof IndexQuery, typeof DetailQuery> = {
  index: {
    query: IndexQuery,
    buildWhereClause,
    TableHeader: Filter,
    columns: [
      { name: "Status", content: Status },
      { name: "Topic", content: Topic },
      { name: "Created At", content: CreatedAt },
      { name: "Deliveries", content: DeliveriesCount },
      { name: "ID", content: ID },
    ],
  },
  detail: {
    query: DetailQuery,
    fields: [
      { name: "Status", content: Status },
      { name: "Topic", content: Topic },
      { name: "Created At", content: CreatedAt },
      { name: "Deliveries", content: DeliveriesCount },
      { name: "ID", content: ID },
      { name: "Payload", content: Payload },
      {
        name: "Deliveries",
        content: DeliveriesTable,
        noHighlight: true,
        vertical: true,
      },
    ],
  },
};
