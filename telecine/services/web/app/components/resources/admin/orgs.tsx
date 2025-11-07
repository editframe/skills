import { progressiveQuery } from "@/graphql.client";
import { graphql } from "@/graphql";
import type { ResourceView } from ".";
import { useSearchParams } from "react-router";
import { CreatedAt, ID } from "../blocks";
import {
  OrgName,
  OrgWebsite,
  PrimaryUser,
  OrgIsPaid,
  OrgMembers,
  OrgVideoCount,
  OrgVideoMinutes,
} from "../blocks/org";
import { useDebouncedSearchParams } from "~/hooks/useDebouncedSearchParams";
import clsx from "clsx";

const IndexQuery = progressiveQuery(
  "ef-admin",
  graphql(`
    query AdminOrgs($limit: Int!, $offset: Int!, $where_clause: orgs_bool_exp, $start_date: timestamptz!, $end_date: timestamptz!) {
      rows: orgs(
        where: $where_clause,
        order_by: {created_at: desc},
        limit: $limit,
        offset: $offset
      ) {
        id
        display_name
        website
        created_at
        is_paid
        primary_user {
          first_name
          last_name
          email_passwords {
            email_address
          }
        }
        analytics: renders_aggregate(
          where: {
            status: { _eq: complete }
            completed_at: { _gte: $start_date, _lt: $end_date }
          }
        ) {
          aggregate {
            video_count: count
            total_duration_ms: sum {
              duration_ms
            }
          }
        }
      }
    }
  `),
);

const detailQuery = progressiveQuery(
  "ef-admin",
  graphql(`
    query AdminOrg($id: uuid!, $start_date: timestamptz!, $end_date: timestamptz!) {
      record: orgs_by_pk(id: $id) {
        id
        display_name
        website
        created_at
        is_paid
        primary_user {
          first_name
          last_name
          email_passwords {
            email_address
          }
        }
        memberships {
          role
          user {
            first_name
            last_name
            email_passwords {
              email_address
            }
          }
        }
        analytics: renders_aggregate(
          where: {
            status: { _eq: complete }
            completed_at: { _gte: $start_date, _lt: $end_date }
          }
        ) {
          aggregate {
            video_count: count
            total_duration_ms: sum {
              duration_ms
            }
          }
        }
      }
    }
  `),
);

const Filter = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useDebouncedSearchParams("search");

  // Get end date from URL params, default to today
  const endDate = searchParams.get("end_date") ?? new Date().toISOString().split('T')[0];

  const handleDateChange = (newDate: string) => {
    setSearchParams(
      {
        ...Object.fromEntries(searchParams.entries()),
        end_date: newDate,
        page: "0", // Reset to first page when changing date
      },
      { preventScrollReset: true },
    );
  };

  return (
    <div className={clsx(
      "flex flex-col sm:flex-row items-start sm:items-center gap-3 pb-3 text-xs transition-colors"
    )}>
      <div className="flex items-center gap-2">
        <span className={clsx(
          "font-medium transition-colors",
          "text-slate-600 dark:text-slate-400"
        )}>
          Search:
        </span>
        <input
          type="text"
          value={search}
          placeholder="Search by name, website, or primary user..."
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
            "focus:before:from-blue-50/30 dark:focus:before:from-blue-950/22"
          )}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="flex items-center gap-2">
        <span className={clsx(
          "font-medium transition-colors",
          "text-slate-600 dark:text-slate-400"
        )}>
          Analytics End Date:
        </span>
        <input
          type="date"
          value={endDate}
          className={clsx(
            "px-3 py-1.5 border rounded-md text-xs transition-all duration-150 relative",
            "bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm",
            "text-slate-900 dark:text-white",
            "border-slate-300/75 dark:border-slate-700/75",
            "shadow-[0_1px_2px_0_rgb(0_0_0_/_0.06)] dark:shadow-[0_1px_2px_0_rgb(0_0_0_/_0.3)]",
            "before:absolute before:inset-0 before:bg-gradient-to-br before:from-amber-50/18 before:via-transparent before:to-transparent",
            "dark:before:from-blue-950/15 dark:before:via-transparent dark:before:to-transparent",
            "before:pointer-events-none before:rounded-md",
            "focus:outline-none focus:ring-1 focus:ring-blue-500/50 dark:focus:ring-blue-400/50",
            "focus:border-blue-500/85 dark:focus:border-blue-400/85",
            "focus:shadow-[0_1px_2px_0_rgb(0_0_0_/_0.08),0_2px_4px_0_rgb(59_130_246_/_0.15)]",
            "dark:focus:shadow-[0_1px_2px_0_rgb(0_0_0_/_0.35),0_2px_4px_0_rgb(59_130_246_/_0.2)]",
            "focus:before:from-blue-50/30 dark:focus:before:from-blue-950/22"
          )}
          onChange={(e) => handleDateChange(e.target.value)}
        />
        <span className={clsx(
          "text-xs transition-colors",
          "text-slate-500 dark:text-slate-400"
        )}>
          (30 days ending on this date)
        </span>
      </div>
    </div>
  );
};

function buildWhereClause(searchParams: URLSearchParams) {
  const search = searchParams.get("search")?.trim().toLowerCase() ?? "";

  if (!search) return {};

  return {
    _or: [
      { display_name: { _ilike: `%${search}%` } },
      { website: { _ilike: `%${search}%` } },
      { primary_user: { 
        _or: [
          { first_name: { _ilike: `%${search}%` } },
          { last_name: { _ilike: `%${search}%` } },
          { email_passwords: { email_address: { _ilike: `%${search}%` } } }
        ]
      }},
    ],
  };
}

function getAnalyticsDateRange(searchParams: URLSearchParams) {
  const endDateParam = searchParams.get("end_date");
  const endDate = endDateParam ? new Date(endDateParam) : new Date();

  // Calculate start date (30 days before end date)
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 30);

  return {
    start_date: startDate.toISOString(),
    end_date: endDate.toISOString(),
  };
}

export const Orgs: ResourceView<typeof IndexQuery, typeof detailQuery> = {
  index: {
    query: IndexQuery,
    buildWhereClause,
    buildVariables: (searchParams) => {
      const { start_date, end_date } = getAnalyticsDateRange(searchParams);
      return { start_date, end_date };
    },
    TableHeader: () => <Filter />,
    columns: [
      { name: "Name", content: OrgName },
      { name: "Website", content: OrgWebsite },
      { name: "Primary User", content: PrimaryUser },
      { name: "Paid", content: OrgIsPaid },
      { name: "Videos (30d)", content: OrgVideoCount },
      { name: "Minutes (30d)", content: OrgVideoMinutes },
      { name: "Created", content: CreatedAt },
    ],
  },
  detail: {
    query: detailQuery,
    buildVariables: (searchParams) => {
      const { start_date, end_date } = getAnalyticsDateRange(searchParams);
      return { start_date, end_date };
    },
    fields: [
      { name: "ID", content: ID },
      { name: "Name", content: OrgName },
      { name: "Website", content: OrgWebsite },
      { name: "Primary User", content: PrimaryUser },
      { name: "Paid", content: OrgIsPaid },
      { name: "Videos (30d)", content: OrgVideoCount },
      { name: "Minutes (30d)", content: OrgVideoMinutes },
      { name: "Created", content: CreatedAt },
      { name: "Members", content: OrgMembers },
    ],
  },
};
