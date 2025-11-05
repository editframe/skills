import { Task } from "@lit/task";
import type { VideoSample } from "mediabunny";
import { type EFMedia, IgnorableError } from "../../EFMedia";
import type { BufferedSeekingInput } from "../BufferedSeekingInput";

type AudioSeekTask = Task<
  readonly [number, BufferedSeekingInput | undefined],
  VideoSample | undefined
>;
export const makeAudioSeekTask = (host: EFMedia): AudioSeekTask => {
  return new Task(host, {
    args: () => [host.desiredSeekTimeMs, host.audioInputTask.value] as const,
    onError: (error) => {
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
    task: async (): Promise<VideoSample | undefined> => {
      return undefined;
      // TODO: validate that the audio seek task is not actually used to render any audio
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
};
