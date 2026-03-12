"use client";

import React, { useRef, useCallback, useEffect, useState } from "react";

interface JitVideoPlayerProps {
  sourceUrl: string;
  className?: string;
}

interface SegmentTiming {
  segmentId: string;
  startTime: number;
  endTime: number;
  transcodeTime: number; // From server header X-Transcode-Time-Ms
  serverTime: number; // From server header X-Total-Server-Time-Ms
  downloadTime: number; // Client-side calculated: totalTime - serverTime
  totalTime: number; // Client-side total request time
}

interface VideoRendition {
  id: string;
  width: number;
  height: number;
  bitrate: number;
  codec: string;
  container: string;
  mimeType: string;
}

interface JitManifest {
  version: string;
  type: string;
  sourceUrl: string;
  duration: number;
  segmentDuration: number;
  baseUrl: string;
  videoRenditions: VideoRendition[];
  audioRenditions: any[];
  endpoints: {
    initSegment: string;
    mediaSegment: string;
  };
  jitInfo: {
    parallelTranscodingSupported: boolean;
    expectedTranscodeLatency: number;
    segmentCount: number;
  };
}

const SEGMENT_DURATION_MS = 2000; // 2 seconds
const PARALLEL_SEGMENT_COUNT = 1; // Number of segments to request in parallel

export default function JitVideoPlayer({
  sourceUrl,
  className = "",
}: JitVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [manifest, setManifest] = useState<JitManifest | null>(null);
  const [currentRendition, setCurrentRendition] =
    useState<VideoRendition | null>(null);
  const [segmentTimings, setSegmentTimings] = useState<SegmentTiming[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [bufferedRanges, setBufferedRanges] = useState<
    { start: number; end: number }[]
  >([]);

  const pendingSegmentsRef = useRef<Set<string>>(new Set());
  const segmentCacheRef = useRef<Map<string, ArrayBuffer>>(new Map());
  const mediaSourceRef = useRef<MediaSource | null>(null);
  const videoSourceBufferRef = useRef<SourceBuffer | null>(null);
  const audioSourceBufferRef = useRef<SourceBuffer | null>(null);
  const videoInitLoadedRef = useRef<boolean>(false);
  const audioInitLoadedRef = useRef<boolean>(false);

  // Load JIT manifest
  const loadManifest = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/v1/transcode/manifest.json?url=${encodeURIComponent(sourceUrl)}`,
      );
      if (!response.ok) {
        throw new Error(`Manifest fetch failed: ${response.status}`);
      }
      const manifestData: JitManifest = await response.json();
      setManifest(manifestData);

      // Set initial rendition to medium quality or first available
      const mediumRendition =
        manifestData.videoRenditions.find((r) => r.id === "medium") ||
        manifestData.videoRenditions[0];
      if (mediumRendition) {
        setCurrentRendition(mediumRendition);
      }

      console.log("✅ JIT manifest loaded:", manifestData);
      return manifestData;
    } catch (error) {
      console.error("Failed to load JIT manifest:", error);
      throw error;
    }
  }, [sourceUrl]);

  // IMPLEMENTATION GUIDELINES: Custom ABR algorithm that separates transcoding latency from bandwidth
  const calculateOptimalQuality = useCallback(
    (recentTimings: SegmentTiming[]): VideoRendition | null => {
      if (!manifest || !currentRendition || recentTimings.length < 2)
        return currentRendition;

      // Calculate average transcoding time (from server headers - this is NOT user bandwidth)
      const avgTranscodeTime =
        recentTimings.reduce((sum, t) => sum + t.transcodeTime, 0) /
        recentTimings.length;

      // Calculate average server processing time (from server headers)
      const avgServerTime =
        recentTimings.reduce((sum, t) => sum + t.serverTime, 0) /
        recentTimings.length;

      // Calculate actual network transfer time (this accurately reflects user bandwidth)
      const avgDownloadTime =
        recentTimings.reduce((sum, t) => sum + t.downloadTime, 0) /
        recentTimings.length;

      // Estimate user bandwidth based on pure network transfer time
      const segmentSizeBytes =
        (currentRendition.bitrate * SEGMENT_DURATION_MS) / 8000; // Convert to bytes
      const currentBandwidth =
        avgDownloadTime > 0
          ? (segmentSizeBytes * 8000) / avgDownloadTime // bits per second
          : currentRendition.bitrate;

      // Find optimal quality based on estimated bandwidth + transcoding buffer
      const availableBandwidth = currentBandwidth * 0.8; // 20% safety margin
      const filteredRenditions = manifest.videoRenditions.filter(
        (r) => r.bitrate <= availableBandwidth,
      );
      const optimalRendition =
        filteredRenditions.length > 0
          ? filteredRenditions.sort((a, b) => b.bitrate - a.bitrate)[0]
          : manifest.videoRenditions[manifest.videoRenditions.length - 1]; // Fallback to lowest quality

      if (optimalRendition) {
        console.log(
          `ABR Decision: transcode=${avgTranscodeTime.toFixed(0)}ms, server=${avgServerTime.toFixed(0)}ms, network=${avgDownloadTime.toFixed(0)}ms, bandwidth=${(currentBandwidth / 1000).toFixed(0)}kbps -> ${optimalRendition.id}`,
        );
      }

      return optimalRendition || null;
    },
    [manifest, currentRendition],
  );

  // IMPLEMENTATION GUIDELINES: Load separate initialization segments for video and audio
  const loadVideoInitSegment = useCallback(
    async (rendition: VideoRendition) => {
      if (
        videoInitLoadedRef.current ||
        !videoSourceBufferRef.current ||
        !manifest
      )
        return;

      try {
        console.log(
          `Loading video initialization segment for ${rendition.id}...`,
        );
        const initUrl = manifest.endpoints.initSegment.replace(
          "{rendition}",
          rendition.id,
        );
        const response = await fetch(initUrl);

        if (!response.ok) {
          throw new Error(
            `Video init segment fetch failed: ${response.status}`,
          );
        }

        const initData = await response.arrayBuffer();
        console.log(`Video init segment fetched: ${initData.byteLength} bytes`);

        if (
          videoSourceBufferRef.current &&
          !videoSourceBufferRef.current.updating &&
          mediaSourceRef.current &&
          mediaSourceRef.current.readyState === "open"
        ) {
          console.log("Appending video init segment to SourceBuffer...");

          videoSourceBufferRef.current.appendBuffer(initData);

          // Wait for video init segment to complete
          await new Promise((resolve, reject) => {
            const onUpdate = () => {
              videoSourceBufferRef.current?.removeEventListener(
                "updateend",
                onUpdate,
              );
              videoSourceBufferRef.current?.removeEventListener(
                "error",
                onError,
              );
              videoInitLoadedRef.current = true;
              console.log(
                "✅ Video initialization segment loaded successfully",
              );
              resolve(void 0);
            };
            const onError = (e: any) => {
              videoSourceBufferRef.current?.removeEventListener(
                "updateend",
                onUpdate,
              );
              videoSourceBufferRef.current?.removeEventListener(
                "error",
                onError,
              );
              console.error("❌ Video init segment append failed:", e);
              reject(
                new Error(
                  `Video init segment append failed: ${e.type || "Unknown error"}`,
                ),
              );
            };
            videoSourceBufferRef.current?.addEventListener(
              "updateend",
              onUpdate,
            );
            videoSourceBufferRef.current?.addEventListener("error", onError);
          });
        }
      } catch (error) {
        console.error("Failed to load video initialization segment:", error);
        throw error;
      }
    },
    [manifest],
  );

  const loadAudioInitSegment = useCallback(
    async (rendition: VideoRendition) => {
      if (
        audioInitLoadedRef.current ||
        !audioSourceBufferRef.current ||
        !manifest
      )
        return;

      try {
        console.log(
          `Loading audio initialization segment for ${rendition.id}...`,
        );
        // Use 'audio' rendition for audio init segments
        const initUrl = manifest.endpoints.initSegment.replace(
          "{rendition}",
          "audio",
        );
        const response = await fetch(initUrl);

        if (!response.ok) {
          throw new Error(
            `Audio init segment fetch failed: ${response.status}`,
          );
        }

        const initData = await response.arrayBuffer();
        console.log(`Audio init segment fetched: ${initData.byteLength} bytes`);

        if (
          audioSourceBufferRef.current &&
          !audioSourceBufferRef.current.updating &&
          mediaSourceRef.current &&
          mediaSourceRef.current.readyState === "open"
        ) {
          console.log("Appending audio init segment to SourceBuffer...");

          audioSourceBufferRef.current.appendBuffer(initData);

          // Wait for audio init segment to complete
          await new Promise((resolve, reject) => {
            const onUpdate = () => {
              audioSourceBufferRef.current?.removeEventListener(
                "updateend",
                onUpdate,
              );
              audioSourceBufferRef.current?.removeEventListener(
                "error",
                onError,
              );
              audioInitLoadedRef.current = true;
              console.log(
                "✅ Audio initialization segment loaded successfully",
              );
              resolve(void 0);
            };
            const onError = (e: any) => {
              audioSourceBufferRef.current?.removeEventListener(
                "updateend",
                onUpdate,
              );
              audioSourceBufferRef.current?.removeEventListener(
                "error",
                onError,
              );
              console.error("❌ Audio init segment append failed:", e);
              reject(
                new Error(
                  `Audio init segment append failed: ${e.type || "Unknown error"}`,
                ),
              );
            };
            audioSourceBufferRef.current?.addEventListener(
              "updateend",
              onUpdate,
            );
            audioSourceBufferRef.current?.addEventListener("error", onError);
          });
        }
      } catch (error) {
        console.error("Failed to load audio initialization segment:", error);
        throw error;
      }
    },
    [manifest],
  );

  // IMPLEMENTATION GUIDELINES: Parallel segment fetching for JIT transcoding efficiency
  const fetchVideoSegmentInParallel = useCallback(
    async (segmentIndex: number, rendition: VideoRendition) => {
      const videoSegmentKey = `video-${rendition.id}-${segmentIndex}`;
      if (pendingSegmentsRef.current.has(videoSegmentKey) || !manifest) return;

      pendingSegmentsRef.current.add(videoSegmentKey);
      const segmentKey = `${rendition.id}-${segmentIndex}`;

      try {
        const startTime = performance.now();

        // Request video segment from JIT transcoder
        const segmentUrl = manifest.endpoints.mediaSegment
          .replace("{rendition}", rendition.id)
          .replace("{segmentId}", segmentIndex.toString().padStart(5, "0"));
        const response = await fetch(segmentUrl);

        if (!response.ok) {
          throw new Error(`Video segment fetch failed: ${response.status}`);
        }

        // Get server timing from headers
        const serverTranscodeTime = parseInt(
          response.headers.get("X-Transcode-Time-Ms") || "0",
          10,
        );
        const serverTotalTime = parseInt(
          response.headers.get("X-Total-Server-Time-Ms") || "0",
          10,
        );

        const segmentData = await response.arrayBuffer();
        const downloadEndTime = performance.now();

        // Calculate actual network transfer time
        const totalRequestTime = downloadEndTime - startTime;
        const networkTransferTime = Math.max(
          0,
          totalRequestTime - serverTotalTime,
        );

        // Store timing information for ABR decisions with server data
        const timing: SegmentTiming = {
          segmentId: segmentKey,
          startTime,
          endTime: downloadEndTime,
          transcodeTime: serverTranscodeTime, // Actual transcoding time from server
          serverTime: serverTotalTime, // Total server processing time
          downloadTime: networkTransferTime, // Pure network transfer time
          totalTime: totalRequestTime, // Total client-side request time
        };

        setSegmentTimings((prev) => [...prev.slice(-10), timing]); // Keep last 10 timings

        // Cache segment
        segmentCacheRef.current.set(segmentKey, segmentData);

        return segmentData;
      } catch (error) {
        console.error(`Failed to fetch video segment ${segmentIndex}:`, error);
        throw error;
      } finally {
        pendingSegmentsRef.current.delete(videoSegmentKey);
      }
    },
    [manifest],
  );

  const fetchAudioSegmentInParallel = useCallback(
    async (segmentIndex: number) => {
      // Use separate tracking for audio segments to avoid conflicts with video
      const audioSegmentKey = `audio-pending-${segmentIndex}`;
      if (pendingSegmentsRef.current.has(audioSegmentKey) || !manifest) return;

      pendingSegmentsRef.current.add(audioSegmentKey);
      const segmentKey = `audio-${segmentIndex}`;

      try {
        const startTime = performance.now();

        // Request audio segment from JIT transcoder using 'audio' rendition
        const segmentUrl = manifest.endpoints.mediaSegment
          .replace("{rendition}", "audio")
          .replace("{segmentId}", segmentIndex.toString().padStart(5, "0"));

        console.log(
          `🎵 Fetching audio segment ${segmentIndex} from: ${segmentUrl}`,
        );
        const response = await fetch(segmentUrl);

        if (!response.ok) {
          console.error(
            `❌ Audio segment ${segmentIndex} HTTP error: ${response.status} ${response.statusText}`,
          );
          throw new Error(
            `Audio segment fetch failed: ${response.status} ${response.statusText}`,
          );
        }

        const segmentData = await response.arrayBuffer();
        const downloadEndTime = performance.now();

        console.log(
          `✅ Audio segment ${segmentIndex} fetched: ${segmentData.byteLength} bytes in ${(downloadEndTime - startTime).toFixed(0)}ms`,
        );

        // Cache segment
        segmentCacheRef.current.set(segmentKey, segmentData);

        return segmentData;
      } catch (error) {
        console.error(
          `❌ Failed to fetch audio segment ${segmentIndex}:`,
          error,
        );
        return null; // Return null instead of throwing to prevent Promise.all failure
      } finally {
        pendingSegmentsRef.current.delete(audioSegmentKey);
      }
    },
    [manifest],
  );

  // IMPLEMENTATION GUIDELINES: Parallel buffering strategy for separate video and audio
  const bufferAheadStrategy = useCallback(async () => {
    if (
      !mediaSourceRef.current ||
      !videoSourceBufferRef.current ||
      !audioSourceBufferRef.current ||
      !manifest ||
      !currentRendition ||
      videoSourceBufferRef.current.updating ||
      audioSourceBufferRef.current.updating ||
      mediaSourceRef.current.readyState !== "open"
    ) {
      return;
    }

    // Ensure initialization segments are loaded first
    if (!videoInitLoadedRef.current || !audioInitLoadedRef.current) {
      try {
        await Promise.all([
          loadVideoInitSegment(currentRendition),
          loadAudioInitSegment(currentRendition),
        ]);
      } catch (error) {
        console.error(
          "Failed to load init segments, stopping buffering:",
          error,
        );
        return;
      }
    }

    const bufferedEnd =
      bufferedRanges.length > 0
        ? bufferedRanges[bufferedRanges.length - 1].end
        : 0;
    const targetBufferEnd = currentTime + 20; // Buffer 20 seconds ahead

    console.log(
      `🔄 Buffer status: current=${currentTime.toFixed(1)}s, buffered=${bufferedEnd.toFixed(1)}s, target=${targetBufferEnd.toFixed(1)}s`,
    );

    if (bufferedEnd >= targetBufferEnd) {
      console.log("⏸️  Buffer target reached, skipping buffering");
      return;
    }

    // CRITICAL: Only check quality AFTER we've started buffering
    // Cannot mix init segments from different renditions in MediaSource API
    const recentTimings = segmentTimings.slice(-5);
    if (recentTimings.length >= 2) {
      const newQuality = calculateOptimalQuality(recentTimings);

      if (
        newQuality &&
        currentRendition &&
        newQuality.id !== currentRendition.id
      ) {
        console.log(
          `Quality change detected: ${currentRendition.id} -> ${newQuality.id}`,
        );
        console.log(
          "⚠️  Quality changes require MediaSource restart - skipping for now",
        );
        // TODO: Implement quality change by restarting MediaSource
        // setCurrentRendition(newQuality);
      }
    }

    // Calculate what we actually need to buffer
    // After seeking, we want to buffer ahead from current position, not fill gaps
    const needsBuffering = bufferedEnd < targetBufferEnd;

    if (!needsBuffering) {
      console.log("⏸️ Buffer target reached, skipping buffering");
      return;
    }

    // Check if current position is covered by existing buffers
    const currentPositionBuffered = bufferedRanges.some(
      (range) => currentTime >= range.start && currentTime <= range.end,
    );

    // If current position isn't buffered, start from current position
    // Otherwise, continue from where buffer ends
    const bufferStartTime = currentPositionBuffered ? bufferedEnd : currentTime;
    const startSegment =
      Math.floor(bufferStartTime / (SEGMENT_DURATION_MS / 1000)) + 1;

    console.log(
      `📍 Current position ${currentTime.toFixed(1)}s is ${currentPositionBuffered ? "buffered" : "NOT buffered"} - starting from ${bufferStartTime.toFixed(1)}s`,
    );

    // Always request a reasonable number of segments ahead (not huge gaps)
    const segmentsAhead = Math.min(
      PARALLEL_SEGMENT_COUNT,
      Math.ceil(
        (targetBufferEnd - bufferStartTime) / (SEGMENT_DURATION_MS / 1000),
      ),
    );

    // Request segments starting from where we need them
    const segmentIndices = Array.from(
      { length: segmentsAhead },
      (_, i) => startSegment + i,
    );

    console.log(
      `📊 Buffering plan: start=${startSegment}, count=${segmentsAhead}, segments=[${segmentIndices.join(", ")}]`,
    );
    console.log(
      `📊 Pending segments before request: ${Array.from(pendingSegmentsRef.current).join(", ")}`,
    );

    // Set MediaSource duration if not already set
    if (
      mediaSourceRef.current &&
      mediaSourceRef.current.duration !== manifest.duration
    ) {
      try {
        mediaSourceRef.current.duration = manifest.duration;
        console.log(`✅ MediaSource duration set to ${manifest.duration}s`);
      } catch (e) {
        console.warn("Failed to set MediaSource duration:", e);
      }
    }

    // Fetch segments in parallel but process them as they arrive (streaming approach)
    console.log(
      `🚀 Starting parallel fetch for ${segmentIndices.length} segments`,
    );

    // Helper function to append a segment as soon as it's ready
    const appendSegmentWhenReady = async (
      segmentIndex: number,
      segmentPromise: Promise<ArrayBuffer | null | undefined>,
      isAudio: boolean,
    ) => {
      try {
        const segmentData = await segmentPromise;
        if (!segmentData) {
          console.warn(
            `⚠️ ${isAudio ? "Audio" : "Video"} segment ${segmentIndex} returned null`,
          );
          return;
        }

        const sourceBuffer = isAudio
          ? audioSourceBufferRef.current
          : videoSourceBufferRef.current;
        if (
          !sourceBuffer ||
          sourceBuffer.updating ||
          !mediaSourceRef.current ||
          mediaSourceRef.current.readyState !== "open"
        ) {
          console.warn(
            `⚠️ ${isAudio ? "Audio" : "Video"} SourceBuffer not ready for segment ${segmentIndex}`,
          );
          return;
        }

        console.log(
          `⚡ ${isAudio ? "Audio" : "Video"} segment ${segmentIndex} ready - appending immediately (${segmentData.byteLength} bytes)`,
        );
        sourceBuffer.appendBuffer(segmentData);

        // Wait for append to complete
        await new Promise((resolve, reject) => {
          const onUpdate = () => {
            sourceBuffer?.removeEventListener("updateend", onUpdate);
            sourceBuffer?.removeEventListener("error", onError);
            console.log(
              `✅ ${isAudio ? "Audio" : "Video"} segment ${segmentIndex} appended successfully`,
            );

            // Update buffer ranges immediately after each append
            if (videoRef.current) {
              const video = videoRef.current;
              const ranges = [];
              for (let i = 0; i < video.buffered.length; i++) {
                ranges.push({
                  start: video.buffered.start(i),
                  end: video.buffered.end(i),
                });
              }
              setBufferedRanges(ranges);
            }

            // Trigger immediate buffer check - but only if no segments are pending
            setTimeout(() => {
              const pendingCount = pendingSegmentsRef.current.size;
              if (pendingCount === 0) {
                console.log(
                  `🔄 Triggering immediate buffer check after ${isAudio ? "audio" : "video"} segment ${segmentIndex} completed (no pending segments)`,
                );
                bufferStrategyRef.current?.();
              } else {
                console.log(
                  `⏸️ Skipping immediate buffer check after ${isAudio ? "audio" : "video"} segment ${segmentIndex} - ${pendingCount} segments still pending`,
                );
              }
            }, 50); // Small delay to ensure buffer ranges are updated

            resolve(void 0);
          };
          const onError = (e: any) => {
            sourceBuffer?.removeEventListener("updateend", onUpdate);
            sourceBuffer?.removeEventListener("error", onError);
            console.error(
              `❌ ${isAudio ? "Audio" : "Video"} segment ${segmentIndex} append failed:`,
              e,
            );
            reject(e);
          };
          sourceBuffer?.addEventListener("updateend", onUpdate);
          sourceBuffer?.addEventListener("error", onError);
        });
      } catch (error) {
        console.error(
          `❌ Failed to append ${isAudio ? "audio" : "video"} segment ${segmentIndex}:`,
          error,
        );
      }
    };

    // Start all segment fetches and append them as they complete
    const appendPromises = [];

    for (const segmentIndex of segmentIndices) {
      const videoPromise = fetchVideoSegmentInParallel(
        segmentIndex,
        currentRendition,
      );
      const audioPromise = fetchAudioSegmentInParallel(segmentIndex);

      // Process each segment as soon as it's ready
      appendPromises.push(
        appendSegmentWhenReady(segmentIndex, videoPromise, false),
      );
      appendPromises.push(
        appendSegmentWhenReady(segmentIndex, audioPromise, true),
      );
    }

    // Wait for all appends to complete (but they process as fast as possible)
    try {
      await Promise.allSettled(appendPromises);
      console.log(`🎯 All segment processing completed for batch`);
    } catch (error) {
      console.error("❌ Segment processing batch failed:", error);
    }
  }, [
    currentTime,
    bufferedRanges,
    segmentTimings,
    manifest,
    currentRendition,
    calculateOptimalQuality,
    fetchVideoSegmentInParallel,
    fetchAudioSegmentInParallel,
    loadVideoInitSegment,
    loadAudioInitSegment,
  ]);

  // Initialize MediaSource with manifest
  useEffect(() => {
    if (!videoRef.current || !manifest || !currentRendition) return;

    // Reset initialization segment flags for new source
    videoInitLoadedRef.current = false;
    audioInitLoadedRef.current = false;
    mediaSourceReadyRef.current = false; // Reset ready flag

    const mediaSource = new MediaSource();
    mediaSourceRef.current = mediaSource;

    const objectURL = URL.createObjectURL(mediaSource);
    videoRef.current.src = objectURL;

    const handleSourceOpen = () => {
      try {
        // Create separate SourceBuffers for video and audio (like DASH.js)
        const videoCodec = 'video/mp4; codecs="avc1.640029"';
        const audioCodec = 'audio/mp4; codecs="mp4a.40.2"';

        console.log(`🎯 Creating separate SourceBuffers:`);
        console.log(
          `Video: ${videoCodec} (supported: ${MediaSource.isTypeSupported(videoCodec)})`,
        );
        console.log(
          `Audio: ${audioCodec} (supported: ${MediaSource.isTypeSupported(audioCodec)})`,
        );

        if (
          !MediaSource.isTypeSupported(videoCodec) ||
          !MediaSource.isTypeSupported(audioCodec)
        ) {
          console.error("❌ One or more codecs not supported");
          return;
        }

        // Create video SourceBuffer
        const videoSourceBuffer = mediaSource.addSourceBuffer(videoCodec);
        videoSourceBufferRef.current = videoSourceBuffer;

        // Create audio SourceBuffer
        const audioSourceBuffer = mediaSource.addSourceBuffer(audioCodec);
        audioSourceBufferRef.current = audioSourceBuffer;

        // Add error listeners for both
        videoSourceBuffer.addEventListener("error", (e) => {
          console.error("Video SourceBuffer error:", e);
        });

        audioSourceBuffer.addEventListener("error", (e) => {
          console.error("Audio SourceBuffer error:", e);
        });

        console.log("✅ Separate SourceBuffers created for video and audio");
      } catch (error) {
        console.error("❌ Failed to create SourceBuffers:", error);
      }
    };

    mediaSource.addEventListener("sourceopen", handleSourceOpen);

    return () => {
      if (objectURL) URL.revokeObjectURL(objectURL);
      mediaSource.removeEventListener("sourceopen", handleSourceOpen);
      videoInitLoadedRef.current = false;
      audioInitLoadedRef.current = false;
    };
  }, [manifest, currentRendition]);

  // Load manifest on mount
  useEffect(() => {
    loadManifest();
  }, [loadManifest]);

  // Handle seeking behavior
  useEffect(() => {
    if (!videoRef.current) return;

    const video = videoRef.current;

    const handleSeeking = () => {
      console.log(`🎯 Seeking started to ${video.currentTime.toFixed(1)}s`);
      // Immediately update our current time state when seeking starts
      setCurrentTime(video.currentTime);
    };

    const handleSeeked = async () => {
      const seekTime = video.currentTime;
      console.log(
        `🎯 Seek completed to ${seekTime.toFixed(1)}s - clearing buffers and restarting`,
      );

      try {
        // Clear existing buffers to prevent conflicts
        if (
          videoSourceBufferRef.current &&
          !videoSourceBufferRef.current.updating
        ) {
          const buffered = videoSourceBufferRef.current.buffered;
          for (let i = 0; i < buffered.length; i++) {
            const start = buffered.start(i);
            const end = buffered.end(i);
            console.log(
              `🗑️ Removing video buffer range ${start.toFixed(1)}-${end.toFixed(1)}s`,
            );
            videoSourceBufferRef.current.remove(start, end);
          }
        }

        if (
          audioSourceBufferRef.current &&
          !audioSourceBufferRef.current.updating
        ) {
          const buffered = audioSourceBufferRef.current.buffered;
          for (let i = 0; i < buffered.length; i++) {
            const start = buffered.start(i);
            const end = buffered.end(i);
            console.log(
              `🗑️ Removing audio buffer range ${start.toFixed(1)}-${end.toFixed(1)}s`,
            );
            audioSourceBufferRef.current.remove(start, end);
          }
        }

        // Wait a moment for buffer removal, then start buffering from new position
        setTimeout(() => {
          console.log(
            `🎬 Starting buffering from seek position ${seekTime.toFixed(1)}s`,
          );
          bufferStrategyRef.current?.();
        }, 100);
      } catch (error) {
        console.error("❌ Error handling seek:", error);
      }
    };

    video.addEventListener("seeking", handleSeeking);
    video.addEventListener("seeked", handleSeeked);

    return () => {
      video.removeEventListener("seeking", handleSeeking);
      video.removeEventListener("seeked", handleSeeked);
    };
  }, []);

  // Start initial buffering when MediaSource is ready (one-time)
  const mediaSourceReadyRef = useRef<boolean>(false);

  useEffect(() => {
    if (
      !videoSourceBufferRef.current ||
      !audioSourceBufferRef.current ||
      !mediaSourceRef.current ||
      !manifest ||
      !currentRendition
    ) {
      return;
    }

    if (
      mediaSourceRef.current.readyState === "open" &&
      !mediaSourceReadyRef.current
    ) {
      mediaSourceReadyRef.current = true;
      console.log(
        "🎬 MediaSource ready for first time, starting initial buffering",
      );
      setTimeout(() => bufferAheadStrategy(), 100); // Delay to avoid immediate loop
    }
  }, [manifest, currentRendition]);

  // Use ref to store latest buffer strategy to avoid dependency loop
  const bufferStrategyRef = useRef<() => Promise<void>>();
  bufferStrategyRef.current = bufferAheadStrategy;

  // Continuous buffering during playback - STABLE DEPENDENCIES
  useEffect(() => {
    if (!isPlaying) {
      console.log("⏸️  Video not playing, skipping buffer interval");
      return;
    }

    console.log("▶️  Starting buffer interval for playing video");
    const bufferInterval = setInterval(() => {
      if (
        videoSourceBufferRef.current &&
        audioSourceBufferRef.current &&
        mediaSourceRef.current?.readyState === "open"
      ) {
        // Update currentTime and bufferedRanges directly from video element
        const video = videoRef.current;
        if (video) {
          const newCurrentTime = video.currentTime;
          console.log(
            `⏰ Interval update: currentTime=${newCurrentTime.toFixed(1)}s, duration=${video.duration?.toFixed(1)}s`,
          );
          setCurrentTime(newCurrentTime);

          // Update buffered ranges
          const ranges = [];
          for (let i = 0; i < video.buffered.length; i++) {
            ranges.push({
              start: video.buffered.start(i),
              end: video.buffered.end(i),
            });
          }
          setBufferedRanges(ranges);
        }

        console.log("🔄 Buffer interval tick - calling strategy");
        // Use ref to call latest strategy without triggering useEffect loop
        bufferStrategyRef.current?.();
      } else {
        console.log("⚠️  SourceBuffers not ready, skipping buffer cycle");
      }
    }, 1000);

    return () => {
      console.log("⏹️  Stopping buffer interval");
      clearInterval(bufferInterval);
    };
  }, [isPlaying]); // ONLY depend on isPlaying, not bufferAheadStrategy

  if (!manifest) {
    return (
      <div className={`relative ${className}`}>
        <div className="w-full h-48 bg-gray-800 flex items-center justify-center text-white">
          Loading manifest...
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <video
        ref={videoRef}
        className="w-full h-auto bg-black"
        controls
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      {/* Debug info */}
      <div className="mt-2 text-xs text-gray-600 space-y-1">
        <div>
          Quality: {currentRendition?.id} ({currentRendition?.width}x
          {currentRendition?.height})
        </div>
        <div>
          Video init: {videoInitLoadedRef.current ? "✓ Loaded" : "⏳ Loading"}
        </div>
        <div>
          Audio init: {audioInitLoadedRef.current ? "✓ Loaded" : "⏳ Loading"}
        </div>
        <div>
          Buffered:{" "}
          {bufferedRanges
            .map((r) => `${r.start.toFixed(1)}-${r.end.toFixed(1)}`)
            .join(", ")}
        </div>
        <div>Parallel segments: {pendingSegmentsRef.current.size}</div>
        <div>
          Recent timings:{" "}
          {segmentTimings
            .slice(-3)
            .map((t) => `${t.totalTime.toFixed(0)}ms`)
            .join(", ")}
        </div>
      </div>
    </div>
  );
}
