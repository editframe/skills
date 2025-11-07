import type { ContentBlock } from ".";

import type { AudioStreamSchema, VideoStreamSchema } from "@editframe/assets";
import { ClientOnly } from "remix-utils/client-only";
import { TranscriptionProgress } from "../isobmff-files";
import { ByteSizeDisplay } from "~/components/ByteSizeDisplay";
import { Table } from "~/components/Table";
import { useCallback, useEffect } from "react";
import { useRef, useState } from "react";
import {
  PauseCircle,
  Pause,
  PlayCircle,
  Play,
  SpeakerSlash,
  VideoCamera,
  VideoCameraSlash,
  SpeakerHigh,
} from "@phosphor-icons/react";
import {
  Video,
  Preview as PreviewContainer,
  Timegroup,
  TogglePlay,
  Scrubber,
  TimeDisplay,
  useTimingInfo,
  Captions,
  CaptionsActiveWord,
  CaptionsBeforeActiveWord,
  CaptionsAfterActiveWord,
  FitScale,
} from "@editframe/react";
import clsx from "clsx";
import type { EFTimegroup, EFPreview } from "@editframe/elements";
import { PrettyDuration } from "~/components/PrettyDuration";

export const Filename: ContentBlock<{
  filename: string;
  isobmff_tracks: { type: string }[];
}> = ({ record: { filename, isobmff_tracks } }) => {
  const hasAudio = isobmff_tracks.some((t) => t.type === "audio");
  const hasVideo = isobmff_tracks.some((t) => t.type === "video");
  return (
    <>
      <div className="flex items-center gap-1">
        {hasVideo ? (
          <VideoCamera className="size-3 stroke-blue-600 fill-blue-400" />
        ) : (
          <VideoCameraSlash className="size-3 stroke-red-600 fill-red-400" />
        )}
        {hasAudio ? (
          <SpeakerHigh className="size-3 stroke-blue-600 fill-blue-400" />
        ) : (
          <SpeakerSlash className="size-3 stroke-red-600  fill-red-400" />
        )}
        <span>{filename}</span>
      </div>
    </>
  );
};
export const DurationColumn: ContentBlock<{
  isobmff_tracks: { duration_ms: number }[];
}> = ({ record: { isobmff_tracks } }) => (
  <PrettyDuration
    durationMs={Math.max(...isobmff_tracks.map((t) => t.duration_ms))}
  />
);
export const VideoInfo: ContentBlock<{
  isobmff_tracks: { type: string; probe_info: any }[];
}> = ({ record: { isobmff_tracks } }) => {
  const videoTracks = isobmff_tracks.filter((t) => t.type === "video");
  if (videoTracks.length === 0) {
    return null;
  }
  const probeInfo = videoTracks[0]!.probe_info as VideoStreamSchema;
  const [numerator, denominator] = probeInfo.r_frame_rate
    .split("/")
    .map(Number);
  if (!numerator || !denominator) {
    return "?";
  }
  const fps = (numerator / denominator).toFixed(2);
  return `${probeInfo.width}x${probeInfo.height}@${fps}fps ${probeInfo.codec_name}`;
};
export const AudioInfo: ContentBlock<{
  isobmff_tracks: { type: string; probe_info: any }[];
}> = ({ record: { isobmff_tracks } }) => {
  const audioTracks = isobmff_tracks.filter((t) => t.type === "audio");
  if (audioTracks.length === 0) {
    return null;
  }
  const probeInfo = audioTracks[0]!.probe_info as AudioStreamSchema;
  return `${probeInfo.sample_rate}Hz ${probeInfo.channels}ch ${probeInfo.codec_name}`;
};
export const TranscriptionStatusCell: ContentBlock<{
  isobmff_tracks: {
    type: string;
    transcription: {
      id: string;
      status: string;
      completed_at: string | null;
      failed_at: string | null;
    } | null;
  }[];
}> = ({ record: { isobmff_tracks } }) => {
  const audioTrack = isobmff_tracks.find((t) => t.type === "audio");
  if (!audioTrack) return null;

  const transcription = audioTrack.transcription;
  if (!transcription) return "Not transcribed";
  if (transcription.status === "failed") return "Failed";
  if (transcription.status === "complete") return "Complete";
  if (transcription.status === "pending") return "Pending";
  return "In Progress";
};
export const TranscriptionStatusDetail: ContentBlock<{
  isobmff_tracks: {
    type: string;
    transcription: {
      id: string;
      status: string;
      completed_at: string | null;
      failed_at: string | null;
    } | null;
  }[];
}> = ({ record: { isobmff_tracks } }) => {
  const audioTrack = isobmff_tracks.find((t) => t.type === "audio");
  if (!audioTrack) return null;

  const transcription = audioTrack.transcription;
  if (!transcription) return "Not transcribed";
  if (transcription.status === "failed") return "Failed";
  if (transcription.status === "complete") return "Complete";
  if (transcription.status === "pending") return "Pending";

  return (
    <ClientOnly fallback="Loading progress...">
      {() => <TranscriptionProgress transcriptionId={transcription.id} />}
    </ClientOnly>
  );
};
export const FileSize: ContentBlock<{
  isobmff_tracks: { byte_size: number }[];
}> = ({ record: { isobmff_tracks } }) => (
  <ByteSizeDisplay
    bytes={isobmff_tracks.reduce((acc, t) => acc + t.byte_size, 0)}
  />
);
export const FragmentIndexComplete: ContentBlock<{
  fragment_index_complete: boolean;
}> = ({ record: { fragment_index_complete } }) =>
  fragment_index_complete ? "Yes" : "No";
export const TracksTable: ContentBlock<{
  isobmff_tracks: {
    type: string;
    duration_ms: number;
    byte_size: number;
  }[];
}> = ({ record: { isobmff_tracks } }) => (
  <Table
    rows={isobmff_tracks}
    emptyResultMessage="Tracks"
    // @ts-expect-error rowKey type is incorrect
    rowKey="track_id"
    columns={[
      {
        name: "Type",
        content: (track) => {
          if (track.type === "audio") {
            return (
              <span className="flex items-center gap-1">
                <SpeakerHigh className="size-3 stroke-blue-600 fill-blue-400" />{" "}
                audio
              </span>
            );
          }

          return (
            <span className="flex items-center gap-1">
              <VideoCamera className="size-3 stroke-blue-600 fill-blue-400" />{" "}
              video
            </span>
          );
        },
      },
      {
        name: "Duration",
        content: (track) => <PrettyDuration durationMs={track.duration_ms} />,
      },
      {
        name: "Size",
        content: (track) => <ByteSizeDisplay bytes={track.byte_size} />,
      },
    ]}
  />
);

export const Preview: ContentBlock<{
  id: string;
  isobmff_tracks: {
    type: string;
    transcription: any;
    probe_info: any;
  }[];
}> = ({ record: { id, isobmff_tracks } }) => {
  const [isControlsVisible, setIsControlsVisible] = useState(true);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const timegroupRef = useRef<EFTimegroup>(null);
  const { percentComplete } = useTimingInfo(timegroupRef);
  const previewRef = useRef<EFPreview>(null);

  const showControls = useCallback(() => {
    setIsControlsVisible(true);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setIsControlsVisible(false);
    }, 2500);
  }, []);

  const hideControls = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsControlsVisible(false);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const shouldShowPlayButton = percentComplete === 0 || percentComplete === 1;

  const handleContainerClick = useCallback(
    (e: React.MouseEvent) => {
      showControls();
      if (e.target === e.currentTarget) {
        if (previewRef.current) {
          if (previewRef.current.playing) {
            previewRef.current.pause();
          } else {
            previewRef.current.play();
          }
        }
      }
    },
    [showControls],
  );

  const hasTranscription = isobmff_tracks.find(
    (t) => t.type === "audio",
  )?.transcription;

  const videoTrack = isobmff_tracks.find((t) => t.type === "video");
  const width = (videoTrack?.probe_info.width as number | undefined) ?? 1920;
  const height = (videoTrack?.probe_info.height as number | undefined) ?? 1080;

  return (
    <div className="w-full h-[300px]">
      <PreviewContainer
        ref={previewRef}
        className="w-full h-full bg-slate-900 relative"
        onMouseMove={showControls}
        onMouseLeave={hideControls}
        onClick={handleContainerClick}
      >
        <FitScale>
          <Timegroup
            ref={timegroupRef}
            mode="contain"
            style={{ width, height }}
          >
            {hasTranscription && (
              <Captions
                displayMode="word"
                target={`preview-${id}`}
                className="absolute bottom-10 inset-x-0 flex justify-start items-start bg-black/75 rounded-md object-center mx-auto max-w-[90%]"
              >
                <CaptionsBeforeActiveWord className="text-white my-1.5 text-md font-medium" />
                <CaptionsActiveWord className="text-red-500 my-1.5 text-md font-medium" />
                <CaptionsAfterActiveWord className="text-white my-1.5 text-md font-medium" />
              </Captions>
            )}
            <Video
              id={`preview-${id}`}
              assetId={id}
              className="w-full h-full block"
            />
          </Timegroup>
        </FitScale>

        <div>
          {shouldShowPlayButton && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <TogglePlay>
                <button slot="pause" className="text-white/90 hover:text-white">
                  <PauseCircle className="size-16" />
                </button>
                <button slot="play" className="text-white/90 hover:text-white">
                  <PlayCircle className="size-16" />
                </button>
              </TogglePlay>
            </div>
          )}

          <div
            className={clsx(
              "absolute inset-x-0 bottom-0 pb-2 pt-12",
              "bg-gradient-to-t from-black/80 to-transparent",
              "transition-opacity duration-300",
              isControlsVisible ? "opacity-100" : "opacity-0",
            )}
          >
            <div className="flex flex-col gap-2 px-4">
              <Scrubber className="w-full" />

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <TogglePlay>
                    <button
                      slot="pause"
                      className="text-white hover:text-white/80"
                    >
                      <Pause className="size-5" />
                    </button>
                    <button
                      slot="play"
                      className="text-white hover:text-white/80"
                    >
                      <Play className="size-5" />
                    </button>
                  </TogglePlay>
                  <TimeDisplay className="text-white text-sm min-w-[5rem]" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </PreviewContainer>
    </div>
  );
};
