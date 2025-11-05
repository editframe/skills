import { progressiveQuery } from "@/graphql.client";
import { graphql } from "@/graphql";
import type { ResourceView } from ".";
import { Button } from "../Button";
import { useFetcher } from "react-router";
import { Link } from "../Link";
import { UserPlusIcon } from "@heroicons/react/24/outline";
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
    <div className="flex gap-2">
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
        <span className="text-red-600 text-xs self-center">
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
    <div className="flex items-center gap-4 p-2 text-xs">
      <div className="flex items-center gap-2">
        <span className="font-medium text-gray-600">Search:</span>
        <input
          type="text"
          value={search}
          placeholder="Search by email..."
          className="border-gray-300 px-2 py-1 border rounded text-xs"
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="flex items-center gap-2">
        <span className="font-medium text-gray-600">Role:</span>
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
          <ListboxButton className="border-gray-300 bg-white hover:bg-gray-50 px-2 py-1 border rounded text-xs">
            {availableRoles.find((r) => r.id === role)?.label ?? "All roles"}
          </ListboxButton>
          <ListboxOptions
            anchor="bottom start"
            className="z-10 absolute border-gray-300 bg-white shadow-lg mt-1 py-1 border rounded w-48 max-h-60 text-xs overflow-auto"
          >
            {availableRoles.map((roleOption) => (
              <ListboxOption key={roleOption.id} value={roleOption.id}>
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
                    {roleOption.label}
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
        <div className="flex gap-2">
          <Filter />
          <div className="flex justify-start py-2">
            <Link to={`/organizations/${orgId}/invite-member`}>
              <Button mode="creative" icon={UserPlusIcon}>
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
