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
    <div className="flex items-center gap-4 p-2 text-xs">
      <div className="flex items-center gap-2">
        <span className="font-medium text-gray-600">Search:</span>
        <input
          type="text"
          value={search}
          placeholder="Search by name, website, or primary user..."
          className="border-gray-300 px-2 py-1 border rounded text-xs"
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="flex items-center gap-2">
        <span className="font-medium text-gray-600">Analytics End Date:</span>
        <input
          type="date"
          value={endDate}
          className="border-gray-300 px-2 py-1 border rounded text-xs"
          onChange={(e) => handleDateChange(e.target.value)}
        />
        <span className="text-gray-500 text-xs">(30 days ending on this date)</span>
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
