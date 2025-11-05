import { progressiveQuery } from "@/graphql.client";
import { graphql } from "@/graphql";
import type { ResourceView } from ".";
import { Link } from "../Link";
import { EnvelopeIcon, UserPlusIcon } from "@heroicons/react/24/outline";
import { Button } from "../Button";
import { useFetcher, useSearchParams } from "react-router";
import { Email, InvitedBy, Role, Status } from "./blocks/invites";
import { type ContentBlock, CreatedAt } from "./blocks";
import { useDebouncedSearchParams } from "~/hooks/useDebouncedSearchParams";

const IndexQuery = progressiveQuery(
  "org-admin",
  graphql(`
    query Invites($orgId: uuid!, $limit: Int!, $offset: Int!, $where_clause: invites_bool_exp!) {
      org: orgs_by_pk(id: $orgId) {
        page_info: invites_aggregate(where: $where_clause) {
          aggregate {
            count
          }
        }
        rows: invites(
          where: $where_clause,
          order_by: {created_at: desc},
          limit: $limit,
          offset: $offset
        ) {
          id
          org_id
          email_address
          role
          created_at
          accepted_at
          denied_at
          user {
            id
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
    query Invite($id: uuid!, $orgId: uuid!) {
      record: invites(where: { org_id: { _eq: $orgId }, id: { _eq: $id } }) {
        id
        org_id
        email_address
        role
        created_at
        accepted_at
        denied_at
        user {
          id
          email_passwords {
            email_address
          }
        }
      }
    }
  `),
);

const Actions: ContentBlock<{ id: string; org_id: string }> = ({
  record: { id, org_id },
}) => {
  const fetcher = useFetcher<{ success: boolean }>();

  const isLoading = fetcher.state !== "idle";
  const isError =
    fetcher.state === "idle" && !!fetcher.data && !fetcher.data.success;

  return (
    <div className="flex gap-2">
      <Button
        mode="action"
        icon={EnvelopeIcon}
        disabled={isLoading}
        loading={isLoading && fetcher.formAction?.includes("/resend")}
        confirmation={{
          title: "Resend Invitation",
          description:
            "Are you sure you want to resend this invitation? The user will receive another email.",
          confirmText: "Resend",
          cancelText: "Don't send",
        }}
        onConfirm={() => {
          fetcher.submit(
            {},
            {
              method: "POST",
              action: `/organizations/${org_id}/invites/${id}/resend`,
            },
          );
        }}
      >
        Resend
      </Button>
      <Button
        mode="destructive"
        disabled={isLoading}
        loading={isLoading && fetcher.formAction?.includes("/cancel")}
        confirmation={{
          title: "Cancel Invitation",
          description:
            "Are you sure you want to cancel this invitation? The user will not be able to join the organization.",
          confirmText: "Cancel invitation",
          cancelText: "Don't cancel",
        }}
        onConfirm={() => {
          fetcher.submit(
            {},
            {
              method: "POST",
              action: `/organizations/${org_id}/invites/${id}/cancel`,
            },
          );
        }}
      >
        Cancel
      </Button>
      {isError && (
        <span className="text-xs text-red-600 self-center">
          Action failed. Please try again.
        </span>
      )}
    </div>
  );
};

function buildWhereClause(searchParams: URLSearchParams) {
  const search = searchParams.get("search")?.trim() ?? "";

  if (search) {
    return {
      accepted_at: { _is_null: true },
      denied_at: { _is_null: true },
      email_address: { _ilike: `%${search}%` },
    };
  }

  return {
    accepted_at: { _is_null: true },
    denied_at: { _is_null: true },
  };
}

const Filter = () => {
  const [search, setSearch] = useDebouncedSearchParams("search");

  return (
    <div className="flex items-center gap-4 p-2 text-xs">
      <div className="flex items-center gap-2">
        <span className="font-medium text-gray-600">Search:</span>
        <input
          type="text"
          value={search}
          placeholder="Search by email..."
          className="rounded border border-gray-300 px-2 py-1 text-xs"
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
    </div>
  );
};

export const Invites: ResourceView<typeof IndexQuery, typeof detailQuery> = {
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
      { name: "Invited By", content: InvitedBy },
      { name: "Role", content: Role },
      { name: "Status", content: Status },
      { name: "Sent", content: CreatedAt },
      { name: "", content: Actions },
    ],
  },
  detail: {
    query: detailQuery,
    fields: [
      { name: "Email", content: Email },
      { name: "Invited By", content: InvitedBy },
      { name: "Role", content: Role },
      { name: "Status", content: Status },
      { name: "Sent", content: CreatedAt },
      { name: "", content: Actions, noHighlight: true, vertical: true },
    ],
  },
};
