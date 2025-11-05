import { progressiveQuery } from "@/graphql.client";
import { graphql } from "@/graphql";
import type { ResourceView } from ".";
import { CompletedAt, CreatedAt, FailedAt, StartedAt } from "./blocks";
import {
  Attempts,
  IsobmffFileLink,
  TotalDuration,
  UnprocessedFile,
  SourceType,
  SourceUrl,
  DetailStatus,
} from "./blocks/process-isobmff";

const IndexQuery = progressiveQuery(
  "org-reader",
  graphql(`
    query ProcessIsoBmff($orgId: uuid!, $limit: Int!, $offset: Int!) {
      org: orgs_by_pk(id: $orgId) {
        page_info: process_isobmffs_aggregate {
          aggregate {
            count
          }
        }
        rows: process_isobmffs(
          order_by: {created_at: desc}
          limit: $limit
          offset: $offset
        ) {
          id
          created_at
          started_at
          completed_at
          failed_at
          unprocessed_file_id
          source_type
          url
          isobmff_file_id
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
    query ProcessIsoBmff($id: uuid!, $orgId: uuid!) {
      record: video2_process_isobmff(where: { id: { _eq: $id }, org_id: { _eq: $orgId } }) {
        id
        created_at
        started_at
        completed_at
        failed_at
        unprocessed_file_id
        isobmff_file_id
        source_type
        url
        attempts(order_by: {attempt_number: asc}) {
          id
          attempt_number
          started_at
          completed_at
          failed_at
          public_error
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

export const ProcessIsoBmff: ResourceView<
  typeof IndexQuery,
  typeof DetailQuery
> = {
  index: {
    query: IndexQuery,
    columns: [
      { name: "Created At", content: CreatedAt },
      { name: "Started At", content: StartedAt },
      { name: "Completed At", content: CompletedAt },
      { name: "Failed At", content: FailedAt },
      { name: "Unprocessed File", content: UnprocessedFile },
      { name: "Isobmff File", content: IsobmffFileLink },
      { name: "Attempts", content: Attempts },
    ],
  },
  detail: {
    query: DetailQuery,
    fields: [
      { name: "Status", content: DetailStatus },
      { name: "Created At", content: CreatedAt },
      { name: "Started At", content: StartedAt },
      { name: "Completed At", content: CompletedAt },
      { name: "Failed At", content: FailedAt },
      { name: "Source Type", content: SourceType },
      { name: "URL", content: SourceUrl },
      { name: "Total Duration", content: TotalDuration },
      { name: "Unprocessed File", content: UnprocessedFile },
      { name: "Isobmff File", content: IsobmffFileLink },
    ],
  },
};
