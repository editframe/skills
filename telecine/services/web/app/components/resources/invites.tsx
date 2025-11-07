import { progressiveQuery } from "@/graphql.client";
import { graphql } from "@/graphql";
import type { ResourceView } from ".";
import { Link } from "../Link";
import { Envelope, UserPlus } from "@phosphor-icons/react";
import { Button } from "../Button";
import { useFetcher } from "react-router";
import { Email, InvitedBy, Role, Status } from "./blocks/invites";
import { type ContentBlock, CreatedAt } from "./blocks";
import { useDebouncedSearchParams } from "~/hooks/useDebouncedSearchParams";
import clsx from "clsx";

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
        icon={Envelope}
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
    <div className="flex items-center gap-2">
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
          "px-2.5 py-1.5 border rounded-lg text-xs leading-snug transition-all duration-150 relative",
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
  );
};

export const Invites: ResourceView<typeof IndexQuery, typeof detailQuery> = {
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
