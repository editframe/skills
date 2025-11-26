import { progressiveQuery } from "@/graphql.client";
import { graphql } from "@/graphql";

import type { ResourceView } from ".";
import { Link } from "../Link";
import { useEffect, useState } from "react";
import { Button } from "~/components/Button";
import {
  Trash,
  Upload,
  FileText,
  Link as LinkIcon,
} from "@phosphor-icons/react";
import { useFetcher } from "react-router";
import { useNavigate } from "react-router";
import clsx from "clsx";

import { Client, getTranscriptionProgress } from "@editframe/api";
import { CreatedAt, ExpiresAt, ID, type ContentBlock } from "./blocks";
import {
  AudioInfo,
  DurationColumn,
  Filename,
  FileSize,
  FragmentIndexComplete,
  Preview,
  TracksTable,
  TranscriptionStatusCell,
  TranscriptionStatusDetail,
  VideoInfo,
} from "./blocks/isobmff-files";
import { useDebouncedSearchParams } from "~/hooks/useDebouncedSearchParams";

const IndexQuery = progressiveQuery(
  "org-reader",
  graphql(`
    query IsobmffFiles($orgId: uuid!, $limit: Int!, $offset: Int!, $where_clause: video2_isobmff_files_bool_exp) {
      org: orgs_by_pk(id: $orgId) {
        page_info: isobmff_files_aggregate {
          aggregate {
            count
          }
        }
        rows: isobmff_files(
          where: $where_clause,
          order_by: {created_at: desc},
          limit: $limit,
          offset: $offset
        ) {
          id
          filename
          created_at
          expires_at
          fragment_index_complete
          isobmff_tracks {
            track_id
            type
            duration_ms
            byte_size
            probe_info
            transcription {
              id
              status
              completed_at
              failed_at
            }
          }
        }
      }
    } 
  `),
);

const DetailQuery = progressiveQuery(
  "org-reader",
  graphql(`
    query IsobmffFile($id: uuid!, $orgId: uuid!) {
      record: video2_isobmff_files(where: { id: { _eq: $id }, org_id: { _eq: $orgId } }) {
        id
        filename
        created_at
        expires_at
        fragment_index_complete
        isobmff_tracks {
          track_id
          type
          duration_ms
          byte_size
          probe_info
          transcription {
            id
            status
            completed_at
            failed_at
          }
        }
      }
    }
  `),
);

const Actions: ContentBlock<{
  id: string;
  filename: string;
  isobmff_tracks: {
    type: string;
    transcription: {
      id: string;
      status: string;
      completed_at: string | null;
      failed_at: string | null;
    } | null;
    track_id: number;
  }[];
}> = ({ record: { id, filename, isobmff_tracks } }) => {
  const fetcher = useFetcher<{ id: string }>();
  const navigate = useNavigate();
  const isLoading = fetcher.state !== "idle";

  // Watch for successful transcription response
  useEffect(() => {
    if (fetcher.data?.id) {
      navigate(`/resource/transcriptions/${fetcher.data.id}`);
    }
  }, [fetcher.data, navigate]);

  const audioTrack = isobmff_tracks.find((t) => t.type === "audio");
  const hasTranscription = audioTrack?.transcription;

  return (
    <div className="flex flex-wrap gap-2">
      {audioTrack && !hasTranscription && (
        <Button
          mode="primary"
          icon={FileText}
          disabled={isLoading}
          loading={isLoading}
          onConfirm={() => {
            fetcher.submit(
              { trackId: audioTrack.track_id.toString() },
              {
                method: "POST",
                action: `/api/v1/isobmff_files/${id}/transcribe`,
              },
            );
          }}
        >
          Transcribe Audio
        </Button>
      )}
      <Button
        mode="destructive"
        icon={Trash}
        disabled={isLoading}
        loading={isLoading}
        confirmation={{
          title: `Delete ISOBMFF file ${filename}`,
          description: "This action cannot be undone.",
          confirmText: "Delete",
          cancelText: "Don't delete",
          challengeText: filename,
        }}
        onConfirm={() => {
          fetcher.submit(
            {},
            { method: "POST", action: `/api/v1/isobmff_files/${id}/delete` },
          );
        }}
      >
        Delete File
      </Button>
    </div>
  );
};

function buildWhereClause(searchParams: URLSearchParams) {
  const search = searchParams.get("search")?.trim() ?? "";

  const whereClause: {
    filename?: { _ilike: string };
  } = {};

  if (search) {
    whereClause.filename = { _ilike: `%${search}%` };
  }

  return whereClause;
}

const Filter = () => {
  const [search, setSearch] = useDebouncedSearchParams("search");

  return (
    <div className="flex items-center gap-2">
      <span
        className={clsx(
          "text-xs font-medium whitespace-nowrap transition-colors",
          "text-slate-700 dark:text-slate-300",
        )}
      >
        Search:
      </span>
      <input
        type="text"
        value={search}
        placeholder="Search by filename..."
        className={clsx(
          "px-2.5 py-1.5 border rounded-lg text-xs leading-snug transition-all duration-150 relative",
          "bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm",
          "text-slate-900 dark:text-slate-100",
          "border-slate-300/75 dark:border-slate-700/75",
          "shadow-[0_1px_2px_0_rgb(0_0_0_/_0.08)] dark:shadow-[0_1px_2px_0_rgb(0_0_0_/_0.3)]",
          "placeholder:text-slate-400 dark:placeholder:text-slate-500",
          "before:absolute before:inset-0 before:bg-gradient-to-br before:from-amber-50/18 before:via-transparent before:to-transparent",
          "dark:before:from-blue-950/15 before:via-transparent dark:before:to-transparent",
          "before:pointer-events-none before:rounded-lg",
          "focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20",
          "focus:border-blue-500/85 dark:focus:border-blue-400/85",
          "focus:shadow-[0_1px_2px_0_rgb(0_0_0_/_0.08),0_4px_12px_0_rgb(59_130_246_/_0.22)] dark:focus:shadow-[0_1px_2px_0_rgb(0_0_0_/_0.4),0_4px_12px_0_rgb(59_130_246_/_0.35)]",
          "focus:before:from-blue-50/30 focus:before:via-transparent focus:before:to-transparent",
          "dark:focus:before:from-blue-950/22 dark:focus:before:via-transparent dark:focus:before:to-transparent",
        )}
        onChange={(e) => setSearch(e.target.value)}
      />
    </div>
  );
};

const TableHeader = () => {
  return (
    <div className="flex items-center gap-3 pb-2">
      <Filter />
      <div className="flex items-center gap-2">
        <Link to="/resource/isobmff_files/upload">
          <Button mode="creative" icon={Upload}>
            Upload File
          </Button>
        </Link>
        <Link to="/resource/isobmff_files/ingest">
          <Button mode="creative" icon={LinkIcon}>
            Ingest URL
          </Button>
        </Link>
      </div>
    </div>
  );
};

export const TranscriptionProgress = ({
  transcriptionId,
}: {
  transcriptionId: string;
}) => {
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
    <div className="w-full bg-gray-100 rounded-sm h-1.5">
      <div
        className="h-1.5 rounded-sm transition-all duration-300 bg-green-600"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
};

export const ISOBMFFFiles: ResourceView<typeof IndexQuery, typeof DetailQuery> =
  {
    index: {
      query: IndexQuery,
      buildWhereClause,
      TableHeader,
      columns: [
        { name: "Filename", content: Filename },
        { name: "Created At", content: CreatedAt },
        { name: "Expires At", content: ExpiresAt },
        { name: "Duration", content: DurationColumn },
        { name: "Video Info", content: VideoInfo },
        { name: "Audio Info", content: AudioInfo },
        { name: "Transcription", content: TranscriptionStatusCell },
        { name: "File Size", content: FileSize },
        { name: "Fragment Index Complete", content: FragmentIndexComplete },
        { name: "", content: Actions },
      ],
    },
    detail: {
      query: DetailQuery,
      fields: [
        { name: "Filename", content: Filename },
        { name: "Created At", content: CreatedAt },
        { name: "Expires At", content: ExpiresAt },
        { name: "Duration", content: DurationColumn },
        { name: "Video Info", content: VideoInfo },
        { name: "Audio Info", content: AudioInfo },
        { name: "Transcription", content: TranscriptionStatusDetail },
        { name: "File Size", content: FileSize },
        { name: "Fragment Index Complete", content: FragmentIndexComplete },
        { name: "ID", content: ID },
        {
          name: "Preview",
          content: Preview,
          vertical: true,
          noHighlight: true,
        },
        {
          name: "Tracks",
          content: TracksTable,
          vertical: true,
          noHighlight: true,
        },
        { name: "", content: Actions, noHighlight: true, vertical: true },
      ],
    },
  };
