import { Link } from "~/components/Link";
import type { ContentBlock } from ".";
import { ClientOnly } from "remix-utils/client-only";
import { Client, getTranscriptionProgress } from "@editframe/api";
import { useState, useEffect } from "react";

export const Filename: ContentBlock<{
  file_id: string;
}> = ({ record: { file_id } }) => (
  <Link to={`/resource/isobmff_files/${file_id}`}>{file_id}</Link>
);
export const Status: ContentBlock<{
  id: string;
  completed_at: string | null;
  failed_at: string | null;
}> = ({ record: { id, completed_at, failed_at } }) => {
  if (failed_at) return <span className="text-red-600">Failed</span>;
  if (completed_at) return <span className="text-green-600">Completed</span>;

  return (
    <ClientOnly fallback="Loading progress...">
      {() => <TranscriptionProgress transcriptionId={id} />}
    </ClientOnly>
  );
};
export const Fragments: ContentBlock<{
  fragments_aggregate: { aggregate: { count: number } | null };
}> = ({ record: { fragments_aggregate } }) => {
  return <span>{fragments_aggregate?.aggregate?.count ?? 0}</span>;
};
export const TranscriptionProgress = ({
  transcriptionId,
}: { transcriptionId: string }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const monitorProgress = async () => {
      const client = new Client(undefined, location.origin);
      const progress = await getTranscriptionProgress(client, transcriptionId);

      for await (const event of progress) {
        if (event.type === "progress") {
          setProgress(event.data.progress * 100);
        }
      }
    };

    monitorProgress();
  }, [transcriptionId]);

  return (
    <div className="flex items-center gap-2">
      <span className="text-yellow-600">Processing</span>
      <div className="w-24 bg-gray-100 rounded-sm h-1.5 overflow-hidden">
        <div
          className="h-1.5 rounded-sm transition-all duration-300 bg-yellow-600"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};
