import { progressiveQuery } from "@/graphql.client";
import { graphql } from "@/graphql";

import type { ResourceView } from ".";
import { Link } from "../Link";
import { useEffect, useState } from "react";
import { Button } from "~/components/Button";
import { TrashIcon } from "@heroicons/react/24/outline";
import { useFetcher } from "react-router";
import { ArrowUpTrayIcon } from "@heroicons/react/24/outline";
import { DocumentTextIcon } from "@heroicons/react/24/outline";
import { useNavigate, useSearchParams } from "react-router";

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
import { LinkIcon } from "@heroicons/react/20/solid";
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
          icon={DocumentTextIcon}
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
        icon={TrashIcon}
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
    <div className="flex items-center gap-4 p-2 text-xs">
      <div className="flex items-center gap-2">
        <span className="font-medium text-gray-600">Search:</span>
        <input
          type="text"
          value={search}
          placeholder="Search by filename..."
          className="rounded border border-gray-300 px-2 py-1 text-xs"
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
    </div>
  );
};

const TableHeader = () => {
  return (
    <div className="flex gap-2">
      <Filter />
      <div className="flex justify-start py-2 gap-2">
        <Link to="/resource/isobmff_files/upload">
          <Button mode="creative" icon={ArrowUpTrayIcon}>
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
