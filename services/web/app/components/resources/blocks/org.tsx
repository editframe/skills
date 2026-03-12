import { Table } from "~/components/Table";
import type { ContentBlock } from ".";

export const OrgIsPaid: ContentBlock<{ is_paid: boolean | null }> = ({
  record: { is_paid },
}) => <span>{is_paid ? "Yes" : "No"}</span>;

export const OrgMembers: ContentBlock<{
  memberships: {
    role: string;
    user: {
      first_name: string | null;
      last_name: string | null;
      email_passwords: { email_address: string }[];
    };
  }[];
}> = ({ record: { memberships } }) => (
  <Table
    rows={memberships ?? []}
    emptyResultMessage="No members"
    // @ts-expect-error the typing is not correct here and inferes/matches poorly
    rowKey={(member) =>
      `${member.user.email_passwords?.[0]?.email_address}-${member.role}`
    }
    columns={[
      {
        name: "Name",
        content: (member) => (
          <span>
            {member.user.first_name} {member.user.last_name}
          </span>
        ),
      },
      {
        name: "Email",
        content: (member) => member.user.email_passwords?.[0]?.email_address,
      },
      {
        name: "Role",
        content: (member) => member.role,
      },
    ]}
  />
);

export const OrgMemberships: ContentBlock<{
  memberships: { org: { display_name: string }; role: string }[];
}> = ({ record: { memberships } }) => (
  <span>
    {memberships
      ?.map(({ org, role }) => `${org?.display_name} (${role})`)
      .join(", ")}
  </span>
);

export const OrgName: ContentBlock<{ display_name: string }> = ({
  record: { display_name },
}) => <span>{display_name}</span>;

export const OrgWebsite: ContentBlock<{ website: string | null }> = ({
  record: { website },
}) =>
  website ? (
    <a href={website} target="_blank" rel="noopener noreferrer">
      {website}
    </a>
  ) : null;

export const PrimaryUser: ContentBlock<{
  primary_user: {
    first_name: string | null;
    last_name: string | null;
    email_passwords: { email_address: string }[];
  };
}> = ({ record: { primary_user } }) => (
  <span>
    {primary_user?.first_name} {primary_user?.last_name} (
    {primary_user?.email_passwords?.[0]?.email_address})
  </span>
);

export const OrgVideoCount: ContentBlock<{
  analytics: {
    aggregate: {
      video_count: number | null;
    } | null;
  } | null;
}> = ({ record: { analytics } }) => (
  <span className="font-medium">{analytics?.aggregate?.video_count ?? 0}</span>
);

export const OrgVideoMinutes: ContentBlock<{
  analytics: {
    aggregate: {
      total_duration_ms: {
        duration_ms: number | null;
      } | null;
    } | null;
  } | null;
}> = ({ record: { analytics } }) => {
  const totalMs = analytics?.aggregate?.total_duration_ms?.duration_ms ?? 0;
  const minutes = totalMs / (1000 * 60);

  return <span className="font-light text-gray-600">{minutes.toFixed(1)}</span>;
};
