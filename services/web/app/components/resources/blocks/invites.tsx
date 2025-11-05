import { TimeAgoInWords } from "~/ui/timeAgoInWords";
import type { ContentBlock } from ".";

export const Email: ContentBlock<{ email_address: string }> = ({
  record: { email_address },
}) => <>{email_address}</>;

export const InvitedBy: ContentBlock<{
  user: { email_passwords: { email_address: string }[] };
}> = ({ record: { user } }) => (
  <>{user.email_passwords[0]?.email_address ?? "—"}</>
);

export const Role: ContentBlock<{ role: string }> = ({ record: { role } }) => (
  <span className="capitalize">{role.toLowerCase()}</span>
);

export const Status: ContentBlock<{
  accepted_at: string | null;
  denied_at: string | null;
}> = ({ record: { accepted_at, denied_at } }) => {
  if (accepted_at) return <span className="text-green-600">Accepted</span>;
  if (denied_at) return <span className="text-red-600">Denied</span>;
  return <span className="text-yellow-600">Pending</span>;
};

export const AcceptedAt: ContentBlock<{ accepted_at: string | null }> = ({
  record: { accepted_at },
}) => <>{accepted_at ? <TimeAgoInWords date={accepted_at} /> : "—"}</>;

export const DeniedAt: ContentBlock<{ denied_at: string | null }> = ({
  record: { denied_at },
}) => <>{denied_at ? <TimeAgoInWords date={denied_at} /> : "—"}</>;
