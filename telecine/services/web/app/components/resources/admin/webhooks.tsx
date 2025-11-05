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
            <div className="flex items-center gap-4 p-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-600">Status:</span>
                <Listbox
                  value={status}
                  onChange={(newStatus) => {
                    updateSearchParams({
                      status: newStatus,
                      page: "0",
                    });
                  }}
                >
                  <ListboxButton className="rounded border border-gray-300 bg-white px-2 py-1 text-xs hover:bg-gray-50">
                    {availableStatuses.find((s) => s.id === status)?.label ??
                      "All"}
                  </ListboxButton>
                  <ListboxOptions
                    anchor="bottom start"
                    className="absolute z-10 mt-1 max-h-60 w-48 overflow-auto rounded border border-gray-300 bg-white py-1 text-xs shadow-lg"
                  >
                    {availableStatuses.map((statusOption) => (
                      <ListboxOption
                        key={statusOption.id}
                        value={statusOption.id}
                      >
                        {({ selected, active }) => (
                          <div
                            className={clsx(
                              "flex items-center px-2 py-1 cursor-pointer",
                              active && "bg-blue-50",
                              selected && "font-medium",
                            )}
                          >
                            <span
                              className={clsx(
                                "mr-2",
                                selected ? "text-blue-500" : "text-gray-400",
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
                <span className="font-medium text-gray-600">Topics:</span>
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
                  <ListboxButton className="rounded border border-gray-300 bg-white px-2 py-1 text-xs hover:bg-gray-50">
                    {topics.length === 0 ||
                    topics.length === availableTopics.length
                      ? "All topics"
                      : `${topics.length} selected`}
                  </ListboxButton>
                  <ListboxOptions
                    anchor="bottom start"
                    className="absolute z-10 mt-1 max-h-60 w-48 overflow-auto rounded border border-gray-300 bg-white py-1 text-xs shadow-lg"
                  >
                    {availableTopics.map((topic) => (
                      <ListboxOption key={topic} value={topic}>
                        {({ selected, active }) => (
                          <div
                            className={clsx(
                              "flex items-center px-2 py-1 cursor-pointer",
                              active && "bg-blue-50",
                              selected && "font-medium",
                            )}
                          >
                            <span
                              className={clsx(
                                "mr-2",
                                selected ? "text-blue-500" : "text-gray-400",
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
