import { useEffect, useState } from "react";
import { ClientOnly } from "remix-utils/client-only";

import { Client, getIsobmffProcessProgress } from "@editframe/api";
import { Link } from "~/components/Link";
import { ProcessDuration } from "~/ui/timeAgoInWords";
import type { ContentBlock } from ".";
import { relatedResourceUrl } from "..";

export const UnprocessedFile: ContentBlock<{
  unprocessed_file_id: string | null;
  id: string;
}> = ({ record: { unprocessed_file_id, id }, resourceType, resourceId }) =>
  unprocessed_file_id ? (
    <Link
      to={relatedResourceUrl(
        resourceType ?? "process_isobmff",
        resourceId ?? id,
        "unprocessed_files",
        unprocessed_file_id,
      )}
    >
      View
    </Link>
  ) : (
    "—"
  );

export const IsobmffFileLink: ContentBlock<{
  isobmff_file_id: string | null;
  id: string;
}> = ({ record: { isobmff_file_id, id }, resourceType, resourceId }) =>
  isobmff_file_id ? (
    <Link
      to={relatedResourceUrl(
        resourceType ?? "process_isobmff",
        resourceId ?? id,
        "isobmff_files",
        isobmff_file_id,
      )}
    >
      View
    </Link>
  ) : (
    "—"
  );
export const Attempts: ContentBlock<{
  attempts_aggregate: { aggregate: { count: number } | null };
}> = ({ record: { attempts_aggregate } }) => (
  <>{attempts_aggregate?.aggregate?.count ?? "—"}</>
);
export const TotalDuration: ContentBlock<{
  created_at: string;
  completed_at: string | null;
  failed_at: string | null;
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
  url: string | null;
}> = ({ record: { url } }) => <>{url}</>;

export const ProcessProgress = ({ processId }: { processId: string }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const monitorProgress = async () => {
      const client = new Client(undefined, location.origin);
      const progress = await getIsobmffProcessProgress(client, processId);

      for await (const event of progress) {
        if (event.type === "progress") {
          setProgress(event.data.progress * 100);
        }
      }
    };

    monitorProgress();
  }, [processId]);

  return (
    <div className="flex items-center gap-2">
      <span className="text-blue-600">Processing</span>
      <div className="w-24 bg-gray-100 rounded-sm h-1.5 overflow-hidden">
        <div
          className="h-1.5 rounded-sm transition-all duration-300 bg-blue-600"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

export const DetailStatus: ContentBlock<{
  id: string;
  completed_at: string | null;
  failed_at: string | null;
}> = ({ record: { id, completed_at, failed_at } }) => {
  if (failed_at) return <span className="text-red-600">Failed</span>;
  if (completed_at) return <span className="text-green-600">Completed</span>;

  return (
    <ClientOnly fallback="Loading progress...">
      {() => <ProcessProgress processId={id} />}
    </ClientOnly>
  );
};
