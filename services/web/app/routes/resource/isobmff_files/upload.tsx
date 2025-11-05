import { useState, useCallback } from "react";
import { ClientOnly } from "remix-utils/client-only";
import { useNavigate } from "react-router";
import {
  Client,
  createUnprocessedFile,
  processIsobmffFile,
  uploadUnprocessedReadableStream,
} from "@editframe/api";
import SparkMD5 from "spark-md5";
import clsx from "clsx";

interface UploadStatus {
  state: "idle" | "uploading" | "processing";
  uploadProgress: number;
  processProgress: number;
}

interface ProgressBarProps {
  label: string;
  progress: number;
  color: "blue" | "green";
}

const ProgressBar = ({ label, progress, color }: ProgressBarProps) => (
  <div>
    <div className="text-xs font-medium text-gray-600 mb-1">{label}</div>
    <div className="w-full bg-gray-100 rounded-sm h-1.5">
      <div
        className={clsx(
          "h-1.5 rounded-sm transition-all duration-300",
          color === "blue" ? "bg-blue-600" : "bg-green-600",
        )}
        style={{ width: `${progress}%` }}
      />
    </div>
  </div>
);

// Wrap the upload functionality in a client-only component
function FileUploader() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<UploadStatus>({
    state: "idle",
    uploadProgress: 0,
    processProgress: 0,
  });
  const [isDragging, setIsDragging] = useState(false);

  const calculateMD5 = (file: File): Promise<string> => {
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

      fileReader.onerror = (e) => {
        reject(e);
      };

      function loadNext() {
        const start = currentChunk * chunkSize;
        const end = Math.min(start + chunkSize, file.size);
        fileReader.readAsArrayBuffer(file.slice(start, end));
      }

      loadNext();
    });
  };

  const handleFile = useCallback(
    async (file: File) => {
      setStatus({ state: "uploading", uploadProgress: 0, processProgress: 0 });
      try {
        const client = new Client(undefined, location.origin);
        const md5 = await calculateMD5(file);

        const unprocessedFile = await createUnprocessedFile(client, {
          md5,
          filename: file.name,
          byte_size: file.size,
        });

        // Upload phase
        const upload = uploadUnprocessedReadableStream(
          client,
          unprocessedFile,
          file.stream(),
        );

        for await (const event of upload) {
          setStatus((prev) => ({
            ...prev,
            uploadProgress: event.progress * 100,
          }));
        }

        // Start processing and redirect immediately
        setStatus((prev) => ({ ...prev, state: "processing" }));
        await processIsobmffFile(client, unprocessedFile.id);
        navigate(`/resource/unprocessed_files/${unprocessedFile.id}`);
      } catch (error) {
        console.error(error, "Operation failed:");
        setStatus({ state: "idle", uploadProgress: 0, processProgress: 0 });
      }
    },
    [navigate],
  );

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

  return (
    <div className="p-4 space-y-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={clsx(
          "border-2 border-dashed rounded-md p-8 transition-colors",
          "flex flex-col items-center justify-center",
          isDragging ? "border-blue-400 bg-blue-50" : "border-gray-300",
          status.state !== "idle" && "pointer-events-none opacity-50",
        )}
      >
        <input
          type="file"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          className="hidden"
          id="file-input"
        />
        <label
          htmlFor="file-input"
          className={clsx(
            "text-xs font-light cursor-pointer",
            "hover:text-blue-600 transition-colors",
          )}
        >
          Click to upload or drag and drop
        </label>
      </div>

      {status.state !== "idle" && (
        <div className="space-y-2">
          <ProgressBar
            label="Upload Progress"
            progress={status.uploadProgress}
            color="blue"
          />
          <ProgressBar
            label="Processing Progress"
            progress={status.processProgress}
            color="green"
          />
        </div>
      )}
    </div>
  );
}

// Main route component with ClientOnly wrapper
export default function UploadPage() {
  return (
    <ClientOnly
      fallback={
        <div>
          File uploading is only avaible in browser clients with javascript
          enabled.
        </div>
      }
    >
      {() => <FileUploader />}
    </ClientOnly>
  );
}
