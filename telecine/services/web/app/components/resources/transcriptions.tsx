import { progressiveQuery } from "@/graphql.client";
import { graphql } from "@/graphql";
import type { ResourceView } from ".";
import { CompletedAt, FailedAt, CreatedAt } from "./blocks";
import { Filename, Fragments, Status } from "./blocks/transcriptions";

const IndexQuery = progressiveQuery(
  "org-reader",
  graphql(`
    query Transcriptions($orgId: uuid!, $limit: Int!, $offset: Int!) {
      org: orgs_by_pk(id: $orgId) {
        page_info: transcriptions_aggregate {
          aggregate {
            count
          }
        }
        rows: transcriptions(order_by: {created_at: desc}, limit: $limit, offset: $offset) {
          id
          file_id
          created_at
          completed_at
          failed_at
        }
      }
    }
  `),
);

const DetailQuery = progressiveQuery(
  "org-reader",
  graphql(`
    query Transcription($id: uuid!, $orgId: uuid!) {
      record: video2_transcriptions(where: { id: { _eq: $id }, org_id: { _eq: $orgId } }) {
        id
        created_at
        completed_at
        failed_at
        file_id
        fragments_aggregate {
          aggregate {
            count
          }
        }
      }
    }
  `),
);

export const Transcriptions: ResourceView<
  typeof IndexQuery,
  typeof DetailQuery
> = {
  index: {
    query: IndexQuery,
    columns: [
      { name: "Filename", content: Filename },
      { name: "Status", content: Status },
      { name: "Created At", content: CreatedAt },
      { name: "Completed At", content: CompletedAt },
      { name: "Failed At", content: FailedAt },
    ],
  },
  detail: {
    query: DetailQuery,
    fields: [
      { name: "Status", content: Status },
      { name: "Created At", content: CreatedAt },
      { name: "Completed At", content: CompletedAt },
      { name: "Fragments", content: Fragments },
    ],
  },
};
