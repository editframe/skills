/**
 * Creates a test stream that can emit server-sent events
 */
export function createTestStream() {
  let controller: ReadableStreamDefaultController<Uint8Array> | null = null;
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(ctrl) {
      controller = ctrl;
    },
  });

  const event = (type: string, data: any) => {
    if (controller) {
      const eventText = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
      controller.enqueue(encoder.encode(eventText));
    }
  };

  const message = (data: string) => {
    if (controller) {
      const messageText = `data: ${data}\n\n`;
      controller.enqueue(encoder.encode(messageText));
    }
  };

  const end = () => {
    if (controller) {
      controller.close();
      controller = null;
    }
  };

  return {
    stream,
    event,
    message,
    end,
  };
}
