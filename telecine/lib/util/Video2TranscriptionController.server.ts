import { db } from "@/sql-client.server/database";
import { signJwtForSession } from "./signJwtForSession.server";
import type { PersistentStorage } from "./storageProvider.server";
import {
  HTTPWorkSliceController,
  type HTTPWorkSlice,
} from "@/concurrency-control/HTTPWorkSliceController";
import { type OrgId, WorkSystem } from "@/concurrency-control/WorkSystem";
import { sql } from "kysely";
import { ProgressTracker } from "@/progress-tracking/ProgressTracker";

const MAX_TRANSCRIBE_CONCURRENCY = Number(
  process.env.MAX_TRANSCRIBE_CONCURRENCY ?? "1",
);

const FRAGMENT_TRANSCRIBE_TIMEOUT_MS = Number(
  process.env.FRAGMENT_TRANSCRIBE_TIMEOUT_MS ?? "60000",
);

const GLOBAL_WORK_SLOT_COUNT = Number(
  process.env.GLOBAL_WORK_SLOT_COUNT ?? "100",
);

type SequenceNumber = number;

export interface Video2TranscriptionControllerOptions {
  id: string;
  org_id: string;
  creator_id: string;
  duration_ms: number;
  work_slice_ms: number;
  abortController: AbortController;
  isLastRetry: boolean;
  storageProvider: PersistentStorage;
  retryCount?: number;
  retryMinTimeout?: number;
  maxTranscribeConcurrency?: number;
  globalWorkSlotCount?: number;
  fragmentTranscribeTimeoutMs?: number;
  failureLimit?: number;
  claimLoopIntervalMs?: number;
}

export class Video2TranscriptionController {
  private failureCount = 0;
  private progressTracker: ProgressTracker;

  constructor(private options: Video2TranscriptionControllerOptions) {
    this.progressTracker = new ProgressTracker(`transcribe:${options.id}`);
    console.log("Video2TranscriptionController", options);
  }

  async transcribe() {
    try {
      this.progressTracker.startHeartbeat();

      console.log("markAsTranscribing", this.options.id);
      await this.markAsTranscribing(this.options.id);
      const fragmentCount = Math.ceil(
        this.options.duration_ms / this.options.work_slice_ms,
      );

      const { incompleteSequenceNumbers, allSequenceNumbers } =
        await this.selectSequenceNumbers(this.options.id, fragmentCount);

      await this.progressTracker.clear();
      await this.progressTracker.writeSize(allSequenceNumbers.length);
      await this.progressTracker.incrementCompletion(
        allSequenceNumbers.length - incompleteSequenceNumbers.length,
      );

      const authorization = `Bearer ${signJwtForSession({
        type: "api",
        oid: this.options.org_id,
        uid: this.options.creator_id,
        cid: this.options.id,
        email: "hdb.transcribe@internal",
        expired_at: null,
        confirmed: false,
        is_paid: false,
      })}`;

      const httpSlices: HTTPWorkSlice[] = [];

      for (const sequenceNumber of incompleteSequenceNumbers) {
        httpSlices.push({
          url: this.createFragmentUrl(this.options.id, sequenceNumber),
          method: "GET",
          headers: {
            Authorization: authorization,
          },
          onStart: (attemptNumber) =>
            this.recordFragmentAttempt(
              this.options.id,
              sequenceNumber,
              attemptNumber,
            ),
          onComplete: async () => {
            await this.markFragmentAsComplete(this.options.id, sequenceNumber);
            await this.progressTracker.incrementCompletion(1);
          },
          onFail: async (errorText) => {
            this.failureCount++;
            await this.markFragmentAsFailed(
              this.options.id,
              sequenceNumber,
              errorText,
            );
          },
        });
      }

      const system = new WorkSystem({
        storagePrefix: "video2_transcription",
        concurrencyMax:
          this.options.maxTranscribeConcurrency ?? MAX_TRANSCRIBE_CONCURRENCY,
        workSlotCount:
          this.options.globalWorkSlotCount ?? GLOBAL_WORK_SLOT_COUNT,
        leaseDurationMs:
          this.options.fragmentTranscribeTimeoutMs ??
          FRAGMENT_TRANSCRIBE_TIMEOUT_MS,
        claimLoopIntervalMs: this.options.claimLoopIntervalMs ?? 1000,
      });

      const httpWorkController = new HTTPWorkSliceController({
        system,
        orgId: this.options.org_id as OrgId,
        id: this.options.id,
        slices: httpSlices,
        failureLimit: this.options.failureLimit ?? 3,
      });

      console.log("Scaling slots");
      await system.scaleSlots();

      console.log("Connecting to work controller");
      await httpWorkController.connect();

      console.log("Completing slices");
      await httpWorkController.completeSlices();

      console.log("Marking as complete");
      await this.markAsComplete(this.options.id);
    } catch (error) {
      this.options.abortController.abort();
      if (this.options.isLastRetry) {
        await this.markAsFailed(this.options.id);
        await this.progressTracker.writeFailure(String(error));
      }
      throw error;
    } finally {
      this.progressTracker.stopHeartbeat();
    }
  }

  createFragmentUrl(transcriptionId: string, sequenceNumber: SequenceNumber) {
    return `${process.env.TRANSCRIBE_HOST}/_/transcriptions/${transcriptionId}/fragment/${sequenceNumber}`;
  }

  async markAsFailed(id: string) {
    await db
      .updateTable("video2.transcriptions")
      .set({
        status: "failed",
        failed_at: sql`now()`,
      })
      .where("id", "=", id)
      .execute();
  }

  async markAsComplete(id: string) {
    await db
      .updateTable("video2.transcriptions")
      .set({
        status: "complete",
        completed_at: sql`now()`,
      })
      .where("id", "=", id)
      .execute();
  }

  async markFragmentAsFailed(
    id: string,
    sequenceNumber: SequenceNumber,
    errorText: string | undefined,
  ) {
    await db
      .updateTable("video2.transcription_fragments")
      .set({
        failed_at: sql`now()`,
        last_error: errorText,
      })
      .where("transcription_id", "=", id)
      .where("sequence_number", "=", sequenceNumber)
      .execute();
  }

  async markFragmentAsComplete(id: string, sequenceNumber: SequenceNumber) {
    await db
      .updateTable("video2.transcription_fragments")
      .set({
        completed_at: sql`now()`,
      })
      .where("transcription_id", "=", id)
      .where("sequence_number", "=", sequenceNumber)
      .execute();
  }

  async recordFragmentAttempt(
    id: string,
    sequenceNumber: SequenceNumber,
    attemptNumber: number,
  ) {
    await db
      .insertInto("video2.transcription_fragments")
      .values({
        transcription_id: id,
        sequence_number: sequenceNumber,
        attempt_number: attemptNumber,
        started_at: sql`now()`,
      })
      .onConflict((b) =>
        b.columns(["transcription_id", "sequence_number"]).doUpdateSet({
          attempt_number: attemptNumber,
          failed_at: null,
        }),
      )
      .execute();
  }

  async markAsTranscribing(id: string) {
    await db
      .updateTable("video2.transcriptions")
      .set({
        status: "transcribing",
      })
      .where("id", "=", id)
      .execute();
  }

  async selectSequenceNumbers(id: string, fragmentCount: number) {
    console.log("selectSequenceNumbers", id, fragmentCount);
    const completedFragments = await db
      .selectFrom("video2.transcription_fragments")
      .where("transcription_id", "=", id)
      .where("completed_at", "is not", null)
      .select("sequence_number")
      .execute();

    const allSequenceNumbers: SequenceNumber[] = [];
    const incompleteSequenceNumbers: SequenceNumber[] = [];

    const maybePushSequenceNumber = (sequenceNumber: SequenceNumber) => {
      allSequenceNumbers.push(sequenceNumber);
      if (
        !completedFragments.some((f) => f.sequence_number === sequenceNumber)
      ) {
        incompleteSequenceNumbers.push(sequenceNumber);
      }
    };

    for (let i = 0; i < fragmentCount; i++) {
      maybePushSequenceNumber(i);
    }

    return {
      incompleteSequenceNumbers,
      allSequenceNumbers,
    };
  }

  async makeFragmentRequest(
    fragmentUrl: string,
    authorization: string,
    requestAbortController: AbortController,
  ) {
    const response = await fetch(fragmentUrl, {
      signal: requestAbortController.signal,
      headers: {
        Authorization: authorization,
      },
    });
    if (!response.ok) {
      const result = await response.text();
      console.error(
        "Failed to fetch fragment",
        fragmentUrl,
        response.status,
        response.statusText,
        result,
      );
      throw new Error(
        `Failed to fetch fragment ${fragmentUrl} status=${response.status} ${response.statusText}`,
      );
    }
  }

  transcribeFragment = async (
    id: string,
    sequenceNumber: SequenceNumber,
    attemptNumber: number,
    authorization: string,
    abortController: AbortController,
  ) => {
    await this.recordFragmentAttempt(id, sequenceNumber, attemptNumber);
    const fragmentUrl = this.createFragmentUrl(id, sequenceNumber);

    console.log(
      "Encoding fragment",
      sequenceNumber,
      "attempt",
      attemptNumber,
      fragmentUrl,
    );

    try {
      const start = performance.now();
      await this.makeFragmentRequest(
        fragmentUrl,
        authorization,
        abortController,
      );
      console.log(
        "Transcribed fragment",
        sequenceNumber,
        "in",
        performance.now() - start,
        "ms",
      );
      await this.markFragmentAsComplete(id, sequenceNumber);
    } catch (error) {
      await this.markFragmentAsFailed(id, sequenceNumber, error?.toString());
      this.options.abortController.abort();
      if (this.options.isLastRetry) {
        await this.markAsFailed(id);
      }
      throw error;
    }
  };
}
