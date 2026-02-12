import { useEffect, useState } from "react";
import { Client, getFileProcessingProgress } from "@editframe/api";
import { ClientOnly } from "remix-utils/client-only";
import { ByteSizeDisplay } from "~/components/ByteSizeDisplay";
import type { ContentBlock } from ".";

export const Preview: ContentBlock<{
  id: string;
  type: string;
  status: string;
}> = ({ record: { id, type, status } }) => {
  if (status !== "ready") {
    return (
      <span className="text-xs text-slate-400 dark:text-slate-500 italic">
        Not ready
      </span>
    );
  }

  if (type === "image") {
    const contentUrl = `/api/v1/files/${id}/content`;
    return (
      <img
        src={contentUrl}
        alt="Preview"
        className="max-w-md max-h-[32rem] rounded-lg shadow-sm object-contain"
      />
    );
  }

  if (type === "video") {
    return (
      <ClientOnly
        fallback={
          <div className="max-w-md max-h-[32rem] rounded-lg shadow-sm bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm">
            Loading preview...
          </div>
        }
      >
        {() => (
          <ef-configuration api-host={window.location.origin} signing-url="">
            <ef-preview className="block max-w-md max-h-[32rem]">
              <ef-video
                id={id}
                file-id={id}
                className="w-full h-full rounded-lg shadow-sm"
                style={{ maxWidth: "28rem", maxHeight: "32rem" }}
              />
              <ef-controls target={id} className="mt-2" />
            </ef-preview>
          </ef-configuration>
        )}
      </ClientOnly>
    );
  }

  return (
    <span className="text-xs text-slate-400 dark:text-slate-500 italic">
      No preview available
    </span>
  );
};

const ProgressBar = ({
  percent,
  color,
}: {
  percent: number;
  color: string;
}) => (
  <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-sm h-1.5">
    <div
      className={`h-1.5 rounded-sm transition-all duration-300 ${color}`}
      style={{ width: `${Math.min(percent, 100)}%` }}
    />
  </div>
);

const UploadProgress = ({
  byteSize,
  nextByte,
}: {
  byteSize: number;
  nextByte: number;
}) => {
  const percent = byteSize > 0 ? (nextByte / byteSize) * 100 : 0;
  return (
    <div className="flex flex-col gap-1 w-full min-w-[6rem]">
      <ProgressBar percent={percent} color="bg-blue-600" />
      <span className="text-[10px] text-slate-500 dark:text-slate-400">
        <ByteSizeDisplay bytes={nextByte} /> / <ByteSizeDisplay bytes={byteSize} />
      </span>
    </div>
  );
};

const ProcessingProgressLive = ({ fileId }: { fileId: string }) => {
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const monitor = async () => {
      try {
        const client = new Client(undefined, location.origin);
        const iter = await getFileProcessingProgress(client, fileId);

        for await (const event of iter) {
          if (cancelled) break;
          if (event.type === "progress") {
            setProgress(event.data.progress * 100);
          }
        }
      } catch {
        if (!cancelled) setError(true);
      }
    };

    monitor();
    return () => {
      cancelled = true;
    };
  }, [fileId]);

  if (error) {
    return (
      <span className="text-[10px] text-slate-400 dark:text-slate-500 italic">
        Processing...
      </span>
    );
  }

  return (
    <div className="flex flex-col gap-1 w-full min-w-[6rem]">
      <ProgressBar percent={progress} color="bg-green-600" />
      <span className="text-[10px] text-slate-500 dark:text-slate-400">
        Processing {progress.toFixed(0)}%
      </span>
    </div>
  );
};

export const Progress: ContentBlock<{
  id: string;
  status: string;
  byte_size: number;
  next_byte: number;
}> = ({ record: { id, status, byte_size, next_byte } }) => {
  if (status === "uploading") {
    return <UploadProgress byteSize={byte_size} nextByte={next_byte} />;
  }

  if (status === "processing") {
    return (
      <ClientOnly
        fallback={
          <span className="text-[10px] text-slate-400 dark:text-slate-500">
            Processing...
          </span>
        }
      >
        {() => <ProcessingProgressLive fileId={id} />}
      </ClientOnly>
    );
  }

  if (status === "ready") {
    return (
      <span className="text-[10px] text-green-600 dark:text-green-400">
        Complete
      </span>
    );
  }

  if (status === "failed") {
    return (
      <span className="text-[10px] text-red-600 dark:text-red-400">
        Failed
      </span>
    );
  }

  return (
    <span className="text-[10px] text-slate-400 dark:text-slate-500">—</span>
  );
};

export const Filename: ContentBlock<{ filename: string }> = ({
  record: { filename },
}) => <>{filename}</>;

export const Dimensions: ContentBlock<{
  width: number | null;
  height: number | null;
}> = ({ record: { width, height } }) => (
  <>{width && height ? `${width}×${height}` : "—"}</>
);

export const FileSize: ContentBlock<{ byte_size: number }> = ({
  record: { byte_size },
}) => <ByteSizeDisplay bytes={byte_size} />;

export const MimeType: ContentBlock<{ mime_type: string }> = ({
  record: { mime_type },
}) => <>{mime_type}</>;

const statusBadgeColors: Record<string, string> = {
  ready: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  processing:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
  failed: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  created: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300",
  uploading: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
};

export const Status: ContentBlock<{ status: string }> = ({
  record: { status },
}) => {
  const colors =
    statusBadgeColors[status] ??
    "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colors}`}
    >
      {status}
    </span>
  );
};

export const Type: ContentBlock<{ type: string }> = ({ record: { type } }) => (
  <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-800 dark:bg-slate-800 dark:text-slate-300">
    {type}
  </span>
);
