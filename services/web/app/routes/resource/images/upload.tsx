import { useState, useCallback } from "react";
import { ClientOnly } from "remix-utils/client-only";
import { useNavigate } from "react-router";
import {
  Client,
  createImageFile,
  uploadImageFile,
  lookupImageFileByMd5,
} from "@editframe/api";
import SparkMD5 from "spark-md5";
import clsx from "clsx";

interface UploadStatus {
  state: "idle" | "uploading" | "complete";
  progress: number;
}

interface ProgressBarProps {
  progress: number;
}

const ProgressBar = ({ progress }: ProgressBarProps) => (
  <div>
    <div className="text-xs font-medium text-gray-600 mb-1">
      Upload Progress
    </div>
    <div className="w-full bg-gray-100 rounded-sm h-1.5">
      <div
        className="h-1.5 rounded-sm transition-all duration-300 bg-blue-600"
        style={{ width: `${progress}%` }}
      />
    </div>
  </div>
);

function FileUploader() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<UploadStatus>({
    state: "idle",
    progress: 0,
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

      fileReader.onerror = (e) => reject(e);

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
      if (!file.type.startsWith("image/")) {
        alert("Please upload an image file");
        return;
      }

      setStatus({ state: "uploading", progress: 0 });

      try {
        const client = new Client(undefined, location.origin);

        // Get image dimensions
        const img = new Image();
        const imageLoaded = new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });
        img.src = URL.createObjectURL(file);
        await imageLoaded;

        const md5 = await calculateMD5(file);

        // Check if file already exists
        const existing = await lookupImageFileByMd5(client, md5);
        if (existing) {
          navigate(`/resource/image_files/${existing.id}`);
          return;
        }

        const imageFile = await createImageFile(client, {
          md5,
          filename: file.name,
          byte_size: file.size,
          width: img.naturalWidth,
          height: img.naturalHeight,
          mime_type: file.type as any,
        });

        const upload = uploadImageFile(client, imageFile, file.stream());

        for await (const event of upload) {
          setStatus((prev) => ({ ...prev, progress: event.progress * 100 }));
        }

        navigate(`/resource/image_files/${imageFile.id}`);
      } catch (error) {
        console.error(error, "Upload failed:");
        setStatus({ state: "idle", progress: 0 });
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
          accept="image/*"
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
          Click to upload or drag and drop an image
        </label>
      </div>

      {status.state === "uploading" && (
        <ProgressBar progress={status.progress} />
      )}
    </div>
  );
}

export default function UploadPage() {
  return (
    <ClientOnly
      fallback={
        <div className="p-4 space-y-4">
          <div
            className={clsx(
              "border-2 border-dashed rounded-md p-8",
              "flex flex-col items-center justify-center",
              "border-gray-300",
            )}
          >
            <div className="text-xs font-light">
              Image uploading is only available in browser clients with
              javascript enabled.
            </div>
          </div>
        </div>
      }
    >
      {() => <FileUploader />}
    </ClientOnly>
  );
}
