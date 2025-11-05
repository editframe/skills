import { useEffect, useState } from "react";
import { ClientOnly } from "remix-utils/client-only";

import { downloadRenderBundlePath, downloadRenderPath } from "@/util/apiPaths";
import {
  Client,
  type CompletionIterator,
  getRenderProgress,
  OutputConfiguration,
} from "@editframe/api";
import { TimeAgoInWords } from "~/ui/timeAgoInWords";
import type { ContentBlock } from ".";
import { PrettyDuration } from "../../PrettyDuration";

export const Status: ContentBlock<{
  completed_at: string | null;
  failed_at: string | null;
}> = ({ record: { completed_at, failed_at } }) => {
  if (failed_at) return <span className="text-red-600">Failed</span>;
  if (completed_at) return <span className="text-green-600">Completed</span>;
  return <span className="text-blue-600">Processing</span>;
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
      {() => <RenderProgress renderId={id} />}
    </ClientOnly>
  );
};

export const Resolution: ContentBlock<{
  width: number | null;
  height: number | null;
}> = ({ record: { width, height } }) => {
  if (!width || !height) return <span>—</span>;
  return (
    <span>
      {width}×{height}
    </span>
  );
};

export const Duration: ContentBlock<{ duration_ms: number | null }> = ({
  record: { duration_ms },
}) =>
  duration_ms ? <PrettyDuration durationMs={duration_ms} /> : <span>—</span>;

export const Download: ContentBlock<{
  id: string;
  completed_at: string | null;
  output_config?: any;
}> = ({ record: { id, completed_at, output_config } }) => {
  if (!completed_at) return null;
  const outputConfig = OutputConfiguration.parse(output_config);
  if (outputConfig.isVideo || outputConfig.isStill) {
    return (
      <a
        href={downloadRenderPath(id, outputConfig)}
        className="text-blue-600 hover:text-blue-800"
        download
      >
        Download {outputConfig.fileExtension.toUpperCase()}
      </a>
    );
  }
  return null;
};

export const DownloadBundle: ContentBlock<{ id: string }> = ({
  record: { id },
}) => {
  return (
    <a
      href={downloadRenderBundlePath(id)}
      className="text-blue-600 hover:text-blue-800"
      download
    >
      Download Bundle (.tar.gz)
    </a>
  );
};

export const Preview: ContentBlock<{
  id: string;
  org_id: string;
  completed_at: string | null;
  output_config?: any;
}> = ({ record: { id, completed_at, output_config } }) => {
  if (!completed_at) return null;
  const outputConfig = OutputConfiguration.parse(output_config);
  if (outputConfig.isStill) {
    return <img src={downloadRenderPath(id, outputConfig)} alt="Still" />;
  }
  return (
    <video
      src={downloadRenderPath(id, outputConfig)}
      controls
      className="max-w-full h-auto rounded-lg shadow-lg"
    />
  );
};

export const RenderProgress = ({ renderId }: { renderId: string }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let stopped = false;
    let progressIterator: CompletionIterator;
    const monitorProgress = async () => {
      if (stopped) return;

      const client = new Client(undefined, location.origin);
      progressIterator = await getRenderProgress(client, renderId);
      if (stopped) {
        progressIterator.abort();
        return;
      }

      for await (const event of progressIterator) {
        if (event.type === "progress") {
          setProgress(event.data.progress * 100);
        }
      }
    };

    monitorProgress();
    return () => {
      stopped = true;
      progressIterator?.abort();
    };
  }, [renderId]);

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

export const CompletedAt: ContentBlock<{ completed_at: string | null }> = ({
  record: { completed_at },
}) => {
  if (!completed_at)
    return <span className="text-gray-500">Not completed</span>;
  return <TimeAgoInWords date={completed_at} />;
};

export const ProcessingDuration: ContentBlock<{
  created_at: string;
  completed_at: string | null;
}> = ({ record: { created_at, completed_at } }) => {
  if (!completed_at)
    return <span className="text-gray-500">Still processing</span>;

  const durationInMs = Math.round(
    new Date(completed_at).getTime() - new Date(created_at).getTime(),
  );
  return <PrettyDuration durationMs={durationInMs} />;
};

export const Output: ContentBlock<{ output_config?: any }> = ({
  record: { output_config },
}) => {
  const outputConfig = OutputConfiguration.parse(output_config);
  return <span>{outputConfig.container}</span>;
};
