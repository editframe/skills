import { progressiveQuery } from "@/graphql.client";
import { graphql } from "@/graphql";
import type { ResourceView } from ".";
import { Button } from "~/components/Button";
import { Key } from "@phosphor-icons/react";
import { Link } from "react-router";
import { CreatedAt, RelatedOrg, RelatedUser } from "../blocks";
import { ExpiresIn, Name, WebhookURL } from "../blocks/api-keys";

const IndexQuery = progressiveQuery(
  "ef-admin",
  graphql(`
    query APIKeys($limit: Int!, $offset: Int!) {
      page_info: identity_api_keys_aggregate {
        aggregate {
          count
        }
      }
      rows: identity_api_keys(order_by: {created_at: desc}, limit: $limit, offset: $offset) {
        id
        user_id
        created_at
        name
        updated_at
        webhook_url
        webhook_events
        expired_at
        user {
          id
          email_passwords {
            email_address
          }
        }
        org {
          id
          display_name
        }
      }
    }
  `),
);

const detailQuery = progressiveQuery(
  "ef-admin",
  graphql(`
    query APIKey($id: uuid!) {
      record: identity_api_keys_by_pk(id: $id) {
        id
        user_id
        created_at
        name
        updated_at
        webhook_url
        webhook_events
        expired_at
        org {
          id
          display_name
        }
      }
    }
  `),
);

const TableHeader = () => {
  return (
    <div className="flex justify-start py-2">
      <Link to="/resource/api_keys/new">
        <Button mode="creative" icon={Key}>
          Create API key
        </Button>
      </Link>
    </div>
  );
};

export const ApiKeys: ResourceView<typeof IndexQuery, typeof detailQuery> = {
  index: {
    query: IndexQuery,
    TableHeader,
    columns: [
      { name: "Name", content: Name },
      { name: "Organization", content: RelatedOrg },
      { name: "User", content: RelatedUser },
      { name: "Webhook URL", content: WebhookURL },
      { name: "Created At", content: CreatedAt },
      { name: "Expires In", content: ExpiresIn },
    ],
  },
  detail: {
    query: detailQuery,
    fields: [
      { name: "Name", content: Name },
      { name: "Organization", content: RelatedOrg },
      { name: "User", content: RelatedUser },
      { name: "Webhook URL", content: WebhookURL },
      { name: "Created At", content: CreatedAt },
      { name: "Expires In", content: ExpiresIn },
    ],
  },
};
