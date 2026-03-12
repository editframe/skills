import { useState, useCallback } from "react";
import { ClientOnly } from "remix-utils/client-only";
import { Link, useNavigate } from "react-router";
import {
  Client,
  createFile,
  uploadFile,
  lookupFileByMd5,
  type FileType,
} from "@editframe/api";
import SparkMD5 from "spark-md5";
import clsx from "clsx";
import { ArrowLeft } from "@phosphor-icons/react";

interface UploadStatus {
  state: "idle" | "hashing" | "uploading" | "complete";
  progress: number;
}

const ProgressBar = ({ progress }: { progress: number }) => (
  <div>
    <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
      Upload Progress
    </div>
    <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-sm h-1.5">
      <div
        className="h-1.5 rounded-sm transition-all duration-300 bg-blue-600"
        style={{ width: `${progress}%` }}
      />
    </div>
  </div>
);

function inferFileType(mimeType: string): FileType | null {
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("image/")) return "image";
  if (
    mimeType === "text/vtt" ||
    mimeType === "application/x-subrip" ||
    mimeType === "text/plain"
  ) {
    return "caption";
  }
  return null;
}

const ACCEPTED_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-matroska",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/svg+xml",
  "text/vtt",
  "application/x-subrip",
  ".vtt",
  ".srt",
].join(",");

function calculateMD5(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunkSize = 2097152; // 2MB chunks
    const spark = new SparkMD5.ArrayBuffer();
    const fileReader = new FileReader();

    let currentChunk = 0;
    const chunks = Math.ceil(file.size / chunkSize);

    fileReader.onload = (e) => {
      spark.append(e.target?.result as ArrayBuffer);
      currentChunk++;

      if (currentChunk < chunks) {
        loadNext();
      } else {
        resolve(spark.end());
      }
    };

    fileReader.onerror = (e) => reject(e);

    function loadNext() {
      const start = currentChunk * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      fileReader.readAsArrayBuffer(file.slice(start, end));
    }

    loadNext();
  });
}

function FileUploader() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<UploadStatus>({
    state: "idle",
    progress: 0,
  });
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);

      const fileType = inferFileType(file.type);
      if (!fileType) {
        if (file.name.endsWith(".vtt") || file.name.endsWith(".srt")) {
          return handleFileWithType(file, "caption");
        }
        setError(
          `Unsupported file type: ${file.type || "unknown"}. Supported: video, image, or caption files.`,
        );
        return;
      }

      return handleFileWithType(file, fileType);
    },
    [navigate],
  );

  const handleFileWithType = async (file: File, fileType: FileType) => {
    setStatus({ state: "hashing", progress: 0 });

    try {
      const client = new Client(undefined, location.origin);
      const md5 = await calculateMD5(file);

      const existing = await lookupFileByMd5(client, md5);
      if (existing) {
        navigate(`/resource/files/${existing.id}`);
        return;
      }

      setStatus({ state: "uploading", progress: 0 });

      const payload: Parameters<typeof createFile>[1] = {
        filename: file.name,
        type: fileType,
        byte_size: file.size,
        md5,
        mime_type: file.type || undefined,
      };

      const created = await createFile(client, payload);

      const upload = uploadFile(
        client,
        { id: created.id, byte_size: file.size, type: fileType },
        file.stream(),
      );

      for await (const event of upload) {
        setStatus((prev) => ({ ...prev, progress: event.progress * 100 }));
      }

      setStatus({ state: "complete", progress: 100 });
      navigate(`/resource/files/${created.id}`);
    } catch (err) {
      console.error("Upload failed:", err);
      setError(err instanceof Error ? err.message : "Upload failed");
      setStatus({ state: "idle", progress: 0 });
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const busy = status.state !== "idle";

  return (
    <div className="space-y-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={clsx(
          "border-2 border-dashed rounded-md p-8 transition-colors",
          "flex flex-col items-center justify-center gap-2",
          isDragging
            ? "border-blue-400 bg-blue-50 dark:bg-blue-900/20"
            : "border-slate-300 dark:border-slate-600",
          busy && "pointer-events-none opacity-50",
        )}
      >
        <input
          type="file"
          accept={ACCEPTED_TYPES}
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          className="hidden"
          id="file-input"
        />
        <label
          htmlFor="file-input"
          className={clsx(
            "text-xs font-light cursor-pointer",
            "hover:text-blue-600 transition-colors",
            "text-slate-700 dark:text-slate-300",
          )}
        >
          Click to upload or drag and drop
        </label>
        <span className="text-[10px] text-slate-400 dark:text-slate-500">
          Video (MP4, MOV, WebM, MKV) &middot; Image (JPEG, PNG, WebP, SVG)
          &middot; Caption (VTT, SRT)
        </span>
      </div>

      {status.state === "hashing" && (
        <div className="text-xs text-slate-500 dark:text-slate-400">
          Computing file hash...
        </div>
      )}

      {status.state === "uploading" && (
        <ProgressBar progress={status.progress} />
      )}

      {error && (
        <div className="rounded-md border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/50 p-3 text-xs text-red-700 dark:text-red-300">
          {error}
        </div>
      )}
    </div>
  );
}

export default function UploadPage() {
  return (
    <div className="p-4 space-y-4">
      <Link
        to="/resource/files"
        className={clsx(
          "inline-flex items-center gap-1 text-xs font-medium transition-colors",
          "text-slate-600 dark:text-slate-400",
          "hover:text-slate-900 dark:hover:text-slate-200",
        )}
      >
        <ArrowLeft className="h-3 w-3" />
        Back to Files
      </Link>

      <ClientOnly
        fallback={
          <div
            className={clsx(
              "border-2 border-dashed rounded-md p-8",
              "flex flex-col items-center justify-center",
              "border-slate-300 dark:border-slate-600",
            )}
          >
            <div className="text-xs font-light text-slate-700 dark:text-slate-300">
              File uploading requires a browser with JavaScript enabled.
            </div>
          </div>
        }
      >
        {() => <FileUploader />}
      </ClientOnly>
    </div>
  );
}
