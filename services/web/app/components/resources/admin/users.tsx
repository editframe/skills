import { progressiveQuery } from "@/graphql.client";
import { graphql } from "@/graphql";
import type { ResourceView } from "./index";
import { useSearchParams } from "react-router";
import { UserName } from "../blocks/user";
import { CreatedAt, ID } from "../blocks";
import { UserEmail } from "../blocks/user";
import { OrgMemberships } from "../blocks/org";
import { useDebouncedSearchParams } from "~/hooks/useDebouncedSearchParams";

const IndexQuery = progressiveQuery(
  "ef-admin",
  graphql(`
    query AdminUsers($limit: Int!, $offset: Int!, $where_clause: users_bool_exp) {
      rows: users(
        where: $where_clause,
        order_by: {created_at: desc},
        limit: $limit,
        offset: $offset
      ) {
        id
        first_name
        last_name
        created_at
        email_passwords {
          email_address
        }
      }
    }
  `),
);

const detailQuery = progressiveQuery(
  "ef-admin",
  graphql(`
    query AdminUser($id: uuid!) {
      record: users_by_pk(id: $id) {
        id
        first_name
        last_name
        created_at
        email_passwords {
          email_address
        }
        memberships {
          role
          org {
            display_name
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
          placeholder="Search by email, name, or organization..."
          className="border-gray-300 px-2 py-1 border rounded text-xs"
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
    </div>
  );
};

function buildWhereClause(searchParams: URLSearchParams) {
  const search = searchParams.get("search")?.trim().toLowerCase() ?? "";

  if (!search) return {};

  return {
    _or: [
      { email_passwords: { email_address: { _ilike: `%${search}%` } } },
      { first_name: { _ilike: `%${search}%` } },
      { last_name: { _ilike: `%${search}%` } },
      { memberships: { 
        org: { 
          display_name: { _ilike: `%${search}%` } 
        } 
      }},
    ],
  };
}

export const Users: ResourceView<typeof IndexQuery, typeof detailQuery> = {
  index: {
    query: IndexQuery,
    buildWhereClause,
    TableHeader: () => <Filter />,
    columns: [
      { name: "Name", content: UserName },
      { name: "Email", content: UserEmail },
      { name: "Joined", content: CreatedAt },
    ],
  },
  detail: {
    query: detailQuery,
    fields: [
      { name: "ID", content: ID },
      { name: "Name", content: UserName },
      { name: "Email", content: UserEmail },
      { name: "Joined", content: CreatedAt },
      { name: "Memberships", content: OrgMemberships },
    ],
  },
};
