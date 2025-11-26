import { TimeAgoInWords } from "~/ui/timeAgoInWords";

export type ContentBlock<
  RecordType,
  Keys extends keyof RecordType = keyof RecordType,
> = React.ComponentType<{
  id: string;
  record: Pick<RecordType, Keys>;
  resourceType: string;
  resourceId: string;
}>;

export const CreatedAt: ContentBlock<{ created_at: string }> = ({
  record: { created_at },
}) => <TimeAgoInWords date={created_at} />;

export const RelatedUser: ContentBlock<{
  user?: { first_name: string | null; last_name: string | null };
}> = ({ record: { user } }) => (
  <>{user ? `${user.first_name} ${user.last_name}` : "—"}</>
);

export const RelatedOrg: ContentBlock<{ org: { display_name: string } }> = ({
  record: { org },
}) => <>{org ? org.display_name : "—"}</>;

export const ID: ContentBlock<{ id: string }> = ({ record: { id } }) => (
  <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
    {id}
  </span>
);

export const StartedAt: ContentBlock<{ started_at: string | null }> = ({
  record: { started_at },
}) => (started_at ? <TimeAgoInWords date={started_at} /> : "—");

export const CompletedAt: ContentBlock<{ completed_at: string | null }> = ({
  record: { completed_at },
}) => (completed_at ? <TimeAgoInWords date={completed_at} /> : "—");

export const FailedAt: ContentBlock<{ failed_at: string | null }> = ({
  record: { failed_at },
}) => (failed_at ? <TimeAgoInWords date={failed_at} /> : "—");

export const MD5: ContentBlock<{ md5: string }> = ({ record: { md5 } }) => {
  return md5;
};

export const ExpiresAt: ContentBlock<{ expires_at: string | null }> = ({
  record: { expires_at },
}) => (expires_at ? <TimeAgoInWords date={expires_at} /> : "—");
