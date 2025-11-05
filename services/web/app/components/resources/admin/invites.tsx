import { graphql } from "@/graphql";

import { progressiveQuery } from "@/graphql.client";
import type { ResourceView } from ".";
import { AcceptedAt, DeniedAt, Email, Role, Status } from "../blocks/invites";
import { useSearchParams } from "react-router";
import { CreatedAt, RelatedOrg } from "../blocks";
import { useDebouncedSearchParams } from "~/hooks/useDebouncedSearchParams";

const IndexQuery = progressiveQuery(
  "ef-admin",
  graphql(`
    query AdminInvites($limit: Int!, $offset: Int!, $where_clause: invites_bool_exp) {
      rows: invites(
        where: $where_clause,
        order_by: {created_at: desc},
        limit: $limit,
        offset: $offset
      ) {
        id
        email_address
        role
        created_at
        accepted_at
        denied_at
        org {
          id
          display_name
        }
        user {
          id
          first_name
          last_name
          email_passwords {
            email_address
          }
        }
      }
    }
  `),
);

const detailQuery = progressiveQuery(
  "ef-admin",
  graphql(`
    query AdminInvite($id: uuid!) {
      record: invites_by_pk(id: $id) {
        id
        email_address
        role
        created_at
        accepted_at
        denied_at
        org {
          id
          display_name
        }
        user {
          id
          first_name
          last_name
          email_passwords {
            email_address
          }
        }
      }
    }
  `),
);

const Filter = () => {
  const [search, setSearch] = useDebouncedSearchParams("search");

  return (
    <div className="flex items-center gap-4 p-2 text-xs">
      <div className="flex items-center gap-2">
        <span className="font-medium text-gray-600">Search:</span>
        <input
          type="text"
          value={search}
          placeholder="Search by email or name..."
          className="border-gray-300 px-2 py-1 border rounded text-xs"
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
    </div>
  );
};

function buildWhereClause(searchParams: URLSearchParams) {
  const search = searchParams.get("search")?.trim() ?? "";

  if (!search) return {};

  return {
    _or: [
      { email_address: { _ilike: `%${search}%` } },
      { user: { first_name: { _ilike: `%${search}%` } } },
      { user: { last_name: { _ilike: `%${search}%` } } },
    ],
  };
}

export const Invites: ResourceView<typeof IndexQuery, typeof detailQuery> = {
  index: {
    query: IndexQuery,
    buildWhereClause,
    TableHeader: () => <Filter />,
    columns: [
      { name: "Email", content: Email },
      { name: "Org", content: RelatedOrg },
      { name: "Invited At", content: CreatedAt },
      { name: "Accepted At", content: AcceptedAt },
      { name: "Denied At", content: DeniedAt },
      { name: "Role", content: Role },
      { name: "Status", content: Status },
    ],
  },
  detail: {
    query: detailQuery,
    fields: [
      { name: "Email", content: Email },
      { name: "Org", content: RelatedOrg },
      { name: "Invited At", content: CreatedAt },
      { name: "Accepted At", content: AcceptedAt },
      { name: "Denied At", content: DeniedAt },
      { name: "Role", content: Role },
      { name: "Status", content: Status },
    ],
  },
};
