import net from "node:net";
import SuperJSON from "superjson";
import { context, propagation } from "@opentelemetry/api";

let nextId = 1;
const pending = new Map();

/**
 * Length-prefixed message framing
 */
function encodeMessage(obj: any) {
  const str = SuperJSON.stringify(obj);
  const buf = Buffer.from(str, "utf8");
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(buf.length, 0);
  return Buffer.concat([lenBuf, buf]);
}

function decodeMessages(
  buffer: Buffer<ArrayBuffer>,
  onMessage: (msg: any) => void,
) {
  let offset = 0;
  while (buffer.length - offset >= 4) {
    const len = buffer.readUInt32BE(offset);
    if (buffer.length - offset - 4 < len) break; // Wait for full message
    const slice = buffer.subarray(offset + 4, offset + 4 + len);
    const msg = SuperJSON.parse(slice.toString());
    onMessage(msg);
    offset += 4 + len;
  }
  return buffer.subarray(offset); // Return leftover
}

import { promiseWithResolvers } from "@/util/promiseWithResolvers";
import { executeSpan } from "@/tracing";
import { logger } from "@/logging";

interface HandlerContext {
  sendKeepalive: () => void;
}

const handlers = new Map<
  string,
  (params: unknown, ctx: HandlerContext) => Promise<unknown>
>();

let rcpServer: net.Server;
export const keepalive = promiseWithResolvers<void>();

export async function registerRcpHandler<Args extends any[], Result>(
  method: string,
  handler: (params: Args, ctx: HandlerContext) => Promise<Result>,
) {
  handlers.set(
    method,
    handler as (params: unknown, ctx: HandlerContext) => Promise<unknown>,
  );
  if (!process.env.EF_SOCKET_PATH) {
    throw new Error("EF_SOCKET_PATH is not set");
  }
  if (!rcpServer) {
    rcpServer = createRpcServer(
      process.env.EF_SOCKET_PATH,
      async (method, params, ctx) => {
        if (method === "terminate") {
          logger.debug("RPC server terminating");
          keepalive.resolve();
          return;
        }
        const handler = handlers.get(method);
        if (!handler) {
          throw new Error(`Unknown method: ${method}`);
        }
        return executeSpan(method, () => handler(params, ctx));
      },
    );
  }
}

function createRpcServer(
  socketPath: string,
  onRequest: (
    method: string,
    params: any[],
    ctx: HandlerContext,
  ) => Promise<any>,
) {
  const server = net.createServer((sock) => {
    let buffer = Buffer.alloc(0);

    sock.on("data", (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      buffer = decodeMessages(buffer, async (msg) => {
        if (!msg.id || !msg.method) return;

        const handlerCtx: HandlerContext = {
          sendKeepalive: () => {
            sock.write(encodeMessage({ type: "keepalive", requestId: msg.id }));
          },
        };

        const activeContext = msg.traceContext
          ? propagation.extract(context.active(), msg.traceContext)
          : context.active();

        let result: any;
        try {
          result = await context.with(activeContext, async () => {
            return await onRequest(msg.method, msg.params, handlerCtx);
          });
        } catch (err: any) {
          sock.write(encodeMessage({ id: msg.id, error: err.message }));
          return;
        }
        try {
          sock.write(encodeMessage({ id: msg.id, result }));
        } catch (err: any) {
          console.error("Failed to send result to client", err);
          process.exit(1);
        }
      });
    });
  });

  server.listen(socketPath, () => {
    process.stderr.write("EF_RPC_READY\n");
  });
  return server;
}

interface RpcClientOptions {
  timeoutMs?: number;
  onKeepalive?: (requestId: number) => void;
}

export function createRpcClient(socketPath: string, options: RpcClientOptions) {
  const socket = net.connect(socketPath);
  let buffer = Buffer.alloc(0);
  const { timeoutMs, onKeepalive } = options;

  socket.on("data", (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);
    buffer = decodeMessages(buffer, (msg) => {
      // Handle keepalive messages
      if (msg.type === "keepalive" && msg.requestId) {
        const cb = pending.get(msg.requestId);
        if (cb) {
          // Reset the timeout for this request
          clearTimeout(cb.timer);
          cb.timer = setTimeout(() => {
            pending.delete(msg.requestId);
            cb.reject(new Error(`RPC timeout after ${timeoutMs}ms`));
          }, timeoutMs);
        }
        onKeepalive?.(msg.requestId);
        return;
      }

      // Handle normal response messages
      const cb = pending.get(msg.id);
      if (!cb) return;
      clearTimeout(cb.timer);
      pending.delete(msg.id);
      msg.error ? cb.reject(new Error(msg.error)) : cb.resolve(msg.result);
    });
  });

  return {
    call(method: string, ...params: any[]): Promise<any> {
      const id = nextId++;
      const traceContext: Record<string, unknown> = {};
      propagation.inject(context.active(), traceContext);

      const payload = { id, method, params, traceContext };
      const message = encodeMessage(payload);
      socket.write(message);

      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          pending.delete(id);
          reject(new Error(`RPC timeout after ${timeoutMs}ms`));
        }, timeoutMs);

        pending.set(id, { resolve, reject, timer });
      });
    },
    close() {
      socket.end();
    },
  };
}
