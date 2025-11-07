import { progressiveQuery } from "@/graphql.client";
import { graphql } from "@/graphql";
import type { ResourceView } from ".";
import { Button } from "../Button";
import { useFetcher } from "react-router";
import { Link } from "../Link";
import { UserPlus } from "@phosphor-icons/react";
import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
} from "@headlessui/react";
import { useSearchParams } from "react-router";
import clsx from "clsx";
import { type ContentBlock, CreatedAt } from "./blocks";
import { Email, Role } from "./blocks/members";
import { useDebouncedSearchParams } from "~/hooks/useDebouncedSearchParams";

const IndexQuery = progressiveQuery(
  "org-admin",
  graphql(`
    query Members($orgId: uuid!, $limit: Int!, $offset: Int!, $where_clause: memberships_bool_exp) {
      org: orgs_by_pk(id: $orgId) {
        page_info: memberships_aggregate {
          aggregate {
            count
          }
        }
        rows: memberships(
          where: $where_clause,
          order_by: {created_at: desc},
          limit: $limit,
          offset: $offset
        ) {
          id
          role
          created_at
          org {
            id
            primary_user_id
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
    }
  `),
);

const detailQuery = progressiveQuery(
  "org-admin",
  graphql(`
    query Member($id: uuid!, $orgId: uuid!) {
      record: memberships(where: { org_id: { _eq: $orgId }, id: { _eq: $id } }) {
        id
        role
        created_at
        org {
          id
          primary_user_id
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

const Actions: ContentBlock<{
  id: string;
  org: { primary_user_id: string; id: string };
  user: { id: string };
}> = ({ record: { id, org, user } }) => {
  const fetcher = useFetcher<{ success: boolean }>();

  const isLoading = fetcher.state !== "idle";
  const isSuccess = fetcher.state === "idle" && !!fetcher.data?.success;
  const isError =
    fetcher.state === "idle" && !!fetcher.data && !fetcher.data.success;

  if (user.id === org.primary_user_id) {
    return <div className="h-[20px]" />;
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        mode="destructive"
        disabled={isLoading}
        loading={isLoading}
        confirmation={{
          title: "Revoke Membership",
          description:
            "Are you sure you want to remove this member from the organization? They will lose all access.",
          confirmText: "Remove member",
          cancelText: "Keep member",
        }}
        onConfirm={() => {
          fetcher.submit(
            {},
            {
              method: "POST",
              action: `/organizations/${org.id}/members/${id}/revoke`,
            },
          );
        }}
      >
        {isSuccess ? "Removed!" : "Remove"}
      </Button>
      {isError && (
        <span className="text-red-600 dark:text-red-400 text-xs self-center">
          Action failed. Please try again.
        </span>
      )}
    </div>
  );
};

function buildWhereClause(searchParams: URLSearchParams) {
  const role = searchParams.get("role") ?? "all";
  const search = searchParams.get("search")?.trim() ?? "";

  const whereClause: {
    role?: { _in: string[] };
    user?: {
      email_passwords?: {
        email_address?: { _ilike: string };
      };
    };
  } = {};

  if (role !== "all") {
    whereClause.role = { _in: [role] };
  }

  if (search) {
    whereClause.user = {
      email_passwords: {
        email_address: { _ilike: `%${search}%` },
      },
    };
  }

  return whereClause;
}

const Filter = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const role = searchParams.get("role") ?? "all";
  const [search, setSearch] = useDebouncedSearchParams("search");
  const availableRoles = [
    { id: "all", label: "All roles" },
    { id: "admin", label: "Admin" },
    { id: "editor", label: "Editor" },
    { id: "reader", label: "Reader" },
  ];

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 text-xs">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
        <span className={clsx(
          "text-xs font-medium whitespace-nowrap transition-colors",
          "text-slate-700 dark:text-slate-300"
        )}>
          Search:
        </span>
        <input
          type="text"
          value={search}
          placeholder="Search by email..."
          className={clsx(
            "w-full sm:w-auto px-2.5 py-1.5 border rounded-lg text-xs leading-snug transition-all duration-150 relative",
            "bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm",
            "text-slate-900 dark:text-slate-100",
            "border-slate-300/75 dark:border-slate-700/75",
            "shadow-[0_1px_2px_0_rgb(0_0_0_/_0.08)] dark:shadow-[0_1px_2px_0_rgb(0_0_0_/_0.3)]",
            "placeholder:text-slate-400 dark:placeholder:text-slate-500",
            "before:absolute before:inset-0 before:bg-gradient-to-br before:from-amber-50/18 before:via-transparent before:to-transparent",
            "dark:before:from-blue-950/15 before:via-transparent dark:before:to-transparent",
            "before:pointer-events-none before:rounded-lg",
            "focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20",
            "focus:border-blue-500/85 dark:focus:border-blue-400/85",
            "focus:shadow-[0_1px_2px_0_rgb(0_0_0_/_0.08),0_4px_12px_0_rgb(59_130_246_/_0.22)] dark:focus:shadow-[0_1px_2px_0_rgb(0_0_0_/_0.4),0_4px_12px_0_rgb(59_130_246_/_0.35)]",
            "focus:before:from-blue-50/30 focus:before:via-transparent focus:before:to-transparent",
            "dark:focus:before:from-blue-950/22 dark:focus:before:via-transparent dark:focus:before:to-transparent"
          )}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
        <span className="font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">Role:</span>
        <Listbox
          value={role}
          onChange={(newRole) => {
            setSearchParams(
              {
                ...Object.fromEntries(searchParams.entries()),
                role: newRole,
                page: "0",
              },
              { preventScrollReset: true },
            );
          }}
        >
          <ListboxButton className={clsx(
            "w-full sm:w-auto px-2 py-1 border rounded text-xs transition-colors",
            "bg-white dark:bg-slate-800",
            "text-slate-900 dark:text-white",
            "border-slate-300 dark:border-slate-600",
            "hover:bg-slate-50 dark:hover:bg-slate-700"
          )}>
            {availableRoles.find((r) => r.id === role)?.label ?? "All roles"}
          </ListboxButton>
          <ListboxOptions
            anchor="bottom start"
            className={clsx(
              "z-10 absolute shadow-lg mt-1 py-1 border rounded w-48 max-h-60 text-xs overflow-auto",
              "bg-white dark:bg-slate-800",
              "border-slate-300 dark:border-slate-700",
              "ring-slate-200 dark:ring-slate-700"
            )}
          >
            {availableRoles.map((roleOption) => (
              <ListboxOption key={roleOption.id} value={roleOption.id}>
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
                    <span className="text-slate-900 dark:text-white">{roleOption.label}</span>
                  </div>
                )}
              </ListboxOption>
            ))}
          </ListboxOptions>
        </Listbox>
      </div>
    </div>
  );
};

export const Members: ResourceView<typeof IndexQuery, typeof detailQuery> = {
  index: {
    query: IndexQuery,
    buildWhereClause,
    TableHeader: ({ orgId }) => {
      return (
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center pb-2">
          <Filter />
          <div className="flex items-center">
            <Link to={`/organizations/${orgId}/invite-member`}>
              <Button mode="creative" icon={UserPlus}>
                Invite member
              </Button>
            </Link>
          </div>
        </div>
      );
    },
    columns: [
      { name: "Email", content: Email },
      { name: "Role", content: Role },
      { name: "Joined", content: CreatedAt },
      { name: "", content: Actions },
    ],
  },
  detail: {
    query: detailQuery,
    fields: [
      { name: "Email", content: Email },
      { name: "Role", content: Role },
      { name: "Joined", content: CreatedAt },
      { name: "", content: Actions, noHighlight: true, vertical: true },
    ],
  },
};
