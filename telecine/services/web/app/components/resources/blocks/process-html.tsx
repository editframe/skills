import type { ContentBlock } from ".";
import { ProcessDuration } from "~/ui/timeAgoInWords";

export const Attempts: ContentBlock<{
  attempts_aggregate: { aggregate: { count: number } };
}> = ({ record: { attempts_aggregate } }) => (
  <>{attempts_aggregate.aggregate?.count ?? "—"}</>
);
export const TotalDuration: ContentBlock<{
  created_at: string;
  completed_at: string;
  failed_at: string;
}> = ({ record: { created_at, completed_at, failed_at } }) => (
  <ProcessDuration
    startedAt={created_at}
    completedAt={completed_at}
    failedAt={failed_at}
  />
);

export const SourceType: ContentBlock<{
  source_type: string;
}> = ({ record: { source_type } }) => <>{source_type}</>;

export const SourceUrl: ContentBlock<{
  url: string;
}> = ({ record: { url } }) => <>{url}</>;
