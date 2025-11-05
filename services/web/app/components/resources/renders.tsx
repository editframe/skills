import { progressiveQuery } from "@/graphql.client";
import { graphql } from "@/graphql";
import type { ResourceView } from ".";
import { Button } from "~/components/Button";
import { VideoCameraIcon } from "@heroicons/react/24/outline";
import { Link } from "react-router";
import { CreatedAt } from "./blocks";
import {
  CompletedAt,
  DetailStatus,
  Download,
  DownloadBundle,
  Duration,
  Preview,
  ProcessingDuration,
  Resolution,
  Status,
  Output,
} from "./blocks/renders";

const IndexQuery = progressiveQuery(
  "org-reader",
  graphql(`
    query Renders($orgId: uuid!, $limit: Int!, $offset: Int!) {
      org: orgs_by_pk(id: $orgId) {
        page_info: renders_aggregate {
          aggregate {
            count
          }
        }
        rows: renders(order_by: {created_at: desc}, limit: $limit, offset: $offset) {
          id
          status
          created_at
          completed_at
          failed_at
          duration_ms
          width
          height
          org_id
          output_config
        }
      }
    }
  `),
);

const DetailQuery = progressiveQuery(
  "org-reader",
  graphql(`
    query Render($id: uuid!, $orgId: uuid!) {
      record: video2_renders(where: { id: { _eq: $id }, org_id: { _eq: $orgId } }) {
        id
        status
        created_at
        completed_at
        failed_at
        duration_ms
        width
        height
        org_id
        output_config
      }
    }
  `),
);

const TableHeader = () => {
  return (
    <div className="flex justify-start py-2">
      <Link to="/resource/renders/new">
        <Button mode="creative" icon={VideoCameraIcon}>
          Create Render
        </Button>
      </Link>
    </div>
  );
};

export const Renders: ResourceView<typeof IndexQuery, typeof DetailQuery> = {
  index: {
    query: IndexQuery,
    TableHeader,
    columns: [
      { name: "Status", content: Status },
      { name: "Output", content: Output },
      { name: "Resolution", content: Resolution },
      { name: "Duration", content: Duration },
      { name: "Created", content: CreatedAt },
    ],
  },
  detail: {
    query: DetailQuery,
    fields: [
      { name: "Status", content: DetailStatus },
      { name: "Resolution", content: Resolution },
      { name: "Duration", content: Duration },
      { name: "Created", content: CreatedAt },
      { name: "Completed", content: CompletedAt },
      { name: "Processing Time", content: ProcessingDuration },
      { name: "Download", content: Download },
      { name: "Download Bundle", content: DownloadBundle },
      { name: "Preview", content: Preview, noHighlight: true },
    ],
  },
};
