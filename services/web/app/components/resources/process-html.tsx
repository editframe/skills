import { progressiveQuery } from "@/graphql.client";
import { graphql } from "@/graphql";
import type { ResourceView } from ".";
import { CompletedAt, FailedAt, StartedAt } from "./blocks";
import { Attempts } from "./blocks/process-isobmff";

const IndexQuery = progressiveQuery(
  "org-reader",
  graphql(`
    query ProcessHtml($orgId: uuid!, $limit: Int!, $offset: Int!) {
      org: orgs_by_pk(id: $orgId) {
        page_info: process_htmls_aggregate {
          aggregate {
            count
          }
        }
        rows: process_htmls(
          order_by: {started_at: desc}
          limit: $limit
          offset: $offset
        ) {
          id
          started_at
          completed_at
          failed_at
          attempts_aggregate {
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
    query ProcessHtml($id: uuid!, $orgId: uuid!) {
      record: video2_process_html(where: { id: { _eq: $id }, org_id: { _eq: $orgId } }) {
        id
        started_at
        completed_at
        failed_at
        attempts(order_by: {attempt_number: asc}) {
          id
          attempt_number
          started_at
          completed_at
          failed_at
        }
        attempts_aggregate {
          aggregate {
            count
          }
        }
      }
    }
  `),
);

export const ProcessHtml: ResourceView<typeof IndexQuery, typeof DetailQuery> =
  {
    index: {
      query: IndexQuery,
      columns: [
        { name: "Started At", content: StartedAt },
        { name: "Completed At", content: CompletedAt },
        { name: "Failed At", content: FailedAt },
        { name: "Attempts", content: Attempts },
      ],
    },
    detail: {
      query: DetailQuery,
      fields: [
        { name: "Started At", content: StartedAt },
        { name: "Completed At", content: CompletedAt },
        { name: "Failed At", content: FailedAt },
      ],
    },
  };
