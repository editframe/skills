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
import { ID, CreatedAt } from "./blocks";
import {
  DeliveriesCount,
  DeliveriesTable,
  Status,
  Topic,
  Payload,
} from "./blocks/webhooks";

const IndexQuery = progressiveQuery(
  "org-reader",
  graphql(`
    query Webhooks(
      $orgId: uuid!,
      $limit: Int!,
      $offset: Int!,
      $where_clause: api_webhook_events_bool_exp
    ) {
      org: orgs_by_pk(id: $orgId) {
        page_info: webhook_events_aggregate {
          aggregate {
            count
          }
        }
        rows: webhook_events(
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
    }
  `),
);

const DetailQuery = progressiveQuery(
  "org-reader",
  graphql(`
    query Webhook($id: uuid!, $orgId: uuid!) {
      record: api_webhook_events(
        where: {
          id: { _eq: $id },
          org_id: { _eq: $orgId }
        }
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
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 p-2 text-xs">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
                <span className="font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">Status:</span>
                <Listbox
                  value={status}
                  onChange={(newStatus) => {
                    updateSearchParams({
                      status: newStatus,
                      page: "0",
                    });
                  }}
                >
                  <ListboxButton className={clsx(
                    "w-full sm:w-auto rounded border px-2 py-1 text-xs transition-colors",
                    "bg-white dark:bg-slate-800",
                    "text-slate-900 dark:text-white",
                    "border-slate-300 dark:border-slate-600",
                    "hover:bg-slate-50 dark:hover:bg-slate-700"
                  )}>
                    {availableStatuses.find((s) => s.id === status)?.label ??
                      "All"}
                  </ListboxButton>
                  <ListboxOptions
                    anchor="bottom start"
                    className={clsx(
                      "absolute z-10 mt-1 max-h-60 w-48 overflow-auto rounded border py-1 text-xs shadow-lg",
                      "bg-white dark:bg-slate-800",
                      "border-slate-300 dark:border-slate-700",
                      "ring-slate-200 dark:ring-slate-700"
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
                              active && "bg-slate-100 dark:bg-slate-700",
                              selected && "font-medium",
                            )}
                          >
                            <span
                              className={clsx(
                                "mr-2",
                                selected ? "text-blue-600 dark:text-blue-400" : "text-slate-400 dark:text-slate-500",
                              )}
                            >
                              {selected ? "✓" : "○"}
                            </span>
                            <span className="text-slate-900 dark:text-white">{statusOption.label}</span>
                          </div>
                        )}
                      </ListboxOption>
                    ))}
                  </ListboxOptions>
                </Listbox>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
                <span className="font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">Topics:</span>
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
                  <ListboxButton className={clsx(
                    "w-full sm:w-auto rounded border px-2 py-1 text-xs transition-colors",
                    "bg-white dark:bg-slate-800",
                    "text-slate-900 dark:text-white",
                    "border-slate-300 dark:border-slate-600",
                    "hover:bg-slate-50 dark:hover:bg-slate-700"
                  )}>
                    {topics.length === 0 ||
                    topics.length === availableTopics.length
                      ? "All topics"
                      : `${topics.length} selected`}
                  </ListboxButton>
                  <ListboxOptions
                    anchor="bottom start"
                    className={clsx(
                      "absolute z-10 mt-1 max-h-60 w-48 overflow-auto rounded border py-1 text-xs shadow-lg",
                      "bg-white dark:bg-slate-800",
                      "border-slate-300 dark:border-slate-700",
                      "ring-slate-200 dark:ring-slate-700"
                    )}
                  >
                    {availableTopics.map((topic) => (
                      <ListboxOption key={topic} value={topic}>
                        {({ selected, active }) => (
                          <div
                            className={clsx(
                              "flex items-center px-2 py-1 cursor-pointer transition-colors",
                              active && "bg-slate-100 dark:bg-slate-700",
                              selected && "font-medium",
                            )}
                          >
                            <span
                              className={clsx(
                                "mr-2",
                                selected ? "text-blue-600 dark:text-blue-400" : "text-slate-400 dark:text-slate-500",
                              )}
                            >
                              {selected ? "✓" : "○"}
                            </span>
                            <span className="text-slate-900 dark:text-white">{topic}</span>
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
      { name: "Payload", content: Payload },
      { name: "ID", content: ID },
      {
        name: "Deliveries",
        content: DeliveriesTable,
        noHighlight: true,
        vertical: true,
      },
    ],
  },
};
