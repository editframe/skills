import {
  ProgressTracker,
  ProgressTrackerTimeoutError,
  ProgressTrackerFailureError,
} from "./ProgressTracker";

export function progressEventStream(
  type: "process-isobmff" | "transcribe" | "render",
  process: {
    id: string;
    completed_at: string | null;
    failed_at: string | null;
  },
) {
  if (process.failed_at) {
    return new Response("event: error\ndata: failed\n\n", {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
      },
    });
  }

  if (process.completed_at) {
    return new Response("event: complete\ndata: done\n\n", {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
      },
    });
  }

  const tracker = new ProgressTracker(`${type}:${process.id}`);

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const item of tracker.iterator()) {
          if (item.type === "progress") {
            const data = `event: progress\ndata: ${JSON.stringify({ progress: item.progress })}\n\n`;
            controller.enqueue(new TextEncoder().encode(data));
          }
          if (item.type === "size") {
            const data = `event: size\ndata: ${JSON.stringify({ size: item.size })}\n\n`;
            controller.enqueue(new TextEncoder().encode(data));
          }
          if (item.type === "completion") {
            const data = `event: completion\ndata: ${JSON.stringify({ count: item.count })}\n\n`;
            controller.enqueue(new TextEncoder().encode(data));
          }
          if (item.type === "heartbeat") {
            const data = `event: heartbeat\ndata: ${JSON.stringify({ timestamp: item.timestamp })}\n\n`;
            controller.enqueue(new TextEncoder().encode(data));
          }
        }
        controller.enqueue(
          new TextEncoder().encode(
            `event: complete\ndata: ${JSON.stringify({})}\n\n`,
          ),
        );
        controller.close();
      } catch (error) {
        if (error instanceof ProgressTrackerTimeoutError) {
          controller.enqueue(
            new TextEncoder().encode(
              `event: error\ndata: ${JSON.stringify({ message: "timedout" })}\n\n`,
            ),
          );
          controller.close();
        } else if (error instanceof ProgressTrackerFailureError) {
          controller.enqueue(
            new TextEncoder().encode(
              `event: error\ndata: ${JSON.stringify({ message: error.message })}\n\n`,
            ),
          );
          controller.close();
        } else {
          controller.error(error);
        }
      }
    },
  });

  return new Response(stream as unknown as BodyInit, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
