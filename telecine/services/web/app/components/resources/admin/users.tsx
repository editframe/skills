import { progressiveQuery } from "@/graphql.client";
import { graphql } from "@/graphql";
import type { ResourceView } from "./index";
import { UserName } from "../blocks/user";
import { CreatedAt, ID } from "../blocks";
import { UserEmail } from "../blocks/user";
import { OrgMemberships } from "../blocks/org";
import { useDebouncedSearchParams } from "~/hooks/useDebouncedSearchParams";
import clsx from "clsx";

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
    <div
      className={clsx("flex items-center gap-4 pb-3 text-xs transition-colors")}
    >
      <div className="flex items-center gap-2">
        <span
          className={clsx(
            "font-medium transition-colors",
            "text-slate-600 dark:text-slate-400",
          )}
        >
          Search:
        </span>
        <input
          type="text"
          value={search}
          placeholder="Search by email, name, or organization..."
          className={clsx(
            "px-3 py-1.5 border rounded-md text-xs transition-all duration-150 relative",
            "bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm",
            "text-slate-900 dark:text-white",
            "border-slate-300/75 dark:border-slate-700/75",
            "placeholder:text-slate-400 dark:placeholder:text-slate-500",
            "shadow-[0_1px_2px_0_rgb(0_0_0_/_0.06)] dark:shadow-[0_1px_2px_0_rgb(0_0_0_/_0.3)]",
            "before:absolute before:inset-0 before:bg-gradient-to-br before:from-amber-50/18 before:via-transparent before:to-transparent",
            "dark:before:from-blue-950/15 dark:before:via-transparent dark:before:to-transparent",
            "before:pointer-events-none before:rounded-md",
            "focus:outline-none focus:ring-1 focus:ring-blue-500/50 dark:focus:ring-blue-400/50",
            "focus:border-blue-500/85 dark:focus:border-blue-400/85",
            "focus:shadow-[0_1px_2px_0_rgb(0_0_0_/_0.08),0_2px_4px_0_rgb(59_130_246_/_0.15)]",
            "dark:focus:shadow-[0_1px_2px_0_rgb(0_0_0_/_0.35),0_2px_4px_0_rgb(59_130_246_/_0.2)]",
            "focus:before:from-blue-50/30 dark:focus:before:from-blue-950/22",
          )}
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
      {
        memberships: {
          org: {
            display_name: { _ilike: `%${search}%` },
          },
        },
      },
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
