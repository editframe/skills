import { Task } from "@lit/task";
import type { VideoSample } from "mediabunny";
import { type EFMedia, IgnorableError } from "../../EFMedia";
import type { BufferedSeekingInput } from "../BufferedSeekingInput";

type AudioSeekTask = Task<
  readonly [number, BufferedSeekingInput | undefined],
  VideoSample | undefined
>;
export const makeAudioSeekTask = (host: EFMedia): AudioSeekTask => {
  // Capture task reference for use in onError
  let task: AudioSeekTask;

  task = new Task(host, {
    args: () => [host.desiredSeekTimeMs, host.audioInputTask.value] as const,
    onError: (error) => {
      // CRITICAL: Attach .catch() handler to taskComplete BEFORE the promise is rejected.
      // This prevents unhandled rejection when hostUpdate() triggers _performTask() without awaiting.
      task.taskComplete.catch(() => {});
      
      // Don't log AbortErrors - these are expected when tasks are cancelled
      const isAbortError = 
        (error instanceof DOMException && error.name === "AbortError") ||
        (error instanceof Error && (
          error.name === "AbortError" ||
          error.message?.includes("signal is aborted") ||
          error.message?.includes("The user aborted a request")
        ));
      
      if (isAbortError) {
        return;
      }
      
      if (error instanceof IgnorableError) {
        console.info("audioSeekTask aborted");
        return;
      }
      if (error instanceof DOMException) {
        console.error(
          `audioSeekTask error: ${error.message} ${error.name} ${error.code}`,
        );
      } else if (error instanceof Error) {
        console.error(`audioSeekTask error ${error.name}: ${error.message}`);
      } else {
        console.error("audioSeekTask unknown error", error);
      }
    },
    onComplete: (_value) => {},
    task: async ([_desiredSeekTimeMs, _audioInput], { signal }): Promise<VideoSample | undefined> => {
      // Check abort before starting work
      signal?.throwIfAborted();
      
      // VALIDATED: This task is NOT used for audio rendering.
      // It is only awaited in EFAudio.frameTask for synchronization purposes.
      // The actual audio rendering pipeline uses fetchAudioSpanningTime() which:
      // - Uses mediaEngineTask.taskComplete
      // - Uses audioInitSegmentFetchTask.taskComplete
      // - Uses audioSegmentFetchTask (via MediaEngine.fetchMediaSegment)
      // - Does NOT use audioSeekTask.value or result
      // 
      // This task exists to ensure proper sequencing of audio-related tasks
      // but its return value is intentionally undefined and never used.
      return undefined;
      
      // Previous implementation (commented out) would have returned a VideoSample,
      // but that was never actually used in the rendering pipeline.
      // CRITICAL FIX: Use the targetSeekTimeMs from args, not host.desiredSeekTimeMs
      // This ensures we use the same seek time that the segment loading tasks used

      // await host.audioSegmentIdTask.taskComplete;
      // signal.throwIfAborted(); // Abort if a new seek started
      // await host.audioSegmentFetchTask.taskComplete;
      // signal.throwIfAborted(); // Abort if a new seek started
      // await host.audioInitSegmentFetchTask.taskComplete;
      // signal.throwIfAborted(); // Abort if a new seek started

      // const audioInput = await host.audioInputTask.taskComplete;
      // signal.throwIfAborted(); // Abort if a new seek started
      // if (!audioInput) {
      //   throw new Error("Audio input is not available");
      // }
      // const audioTrack = await audioInput.getFirstAudioTrack();
      // if (!audioTrack) {
      //   throw new Error("Audio track is not available");
      // }
      // signal.throwIfAborted(); // Abort if a new seek started

      // const sample = (await audioInput.seek(
      //   audioTrack.id,
      //   targetSeekTimeMs, // Use the captured value, not host.desiredSeekTimeMs
      // )) as unknown as VideoSample | undefined;
      // signal.throwIfAborted(); // Abort if a new seek started

      // // If seek returned undefined, it was aborted - don't throw
      // if (sample === undefined && signal.aborted) {
      //   return undefined;
      // }

      // // If we got undefined but weren't aborted, that's an actual error
      // if (sample === undefined) {
      //   throw new Error("Audio seek failed to find sample");
      // }

      // return sample;
    },
  });

  // CRITICAL: Attach .catch() handler IMMEDIATELY to prevent unhandled rejections.
  // This must be done synchronously after task creation, before any updates can trigger run().
  // When hostUpdate() triggers _performTask() -> run(), the rejection needs to already have a handler.
  task.taskComplete.catch(() => {});

  return task;
};
