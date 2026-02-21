import { createReadStream, statSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { TaskResult } from "@editframe/assets";
import debug from "debug";
import mime from "mime";

export const sendTaskResult = (
  req: IncomingMessage,
  res: ServerResponse<IncomingMessage>,
  taskResult: TaskResult,
) => {
  const { cachePath, md5Sum } = taskResult;
  const filePath = cachePath;
  const headers = {
    etag: md5Sum,
  };
  const log = debug("ef:sendfile");
  const sendStartTime = Date.now();
  try {
    const stats = statSync(filePath);
    log(`Sending file ${filePath} (size: ${stats.size} bytes)`);

    if (req.headers.range) {
      const [x, y] = req.headers.range.replace("bytes=", "").split("-");
      let end = Number.parseInt(y ?? "0", 10) || stats.size - 1;
      const start = Number.parseInt(x ?? "0", 10) || 0;

      if (end >= stats.size) {
        end = stats.size - 1;
      }

      if (start >= stats.size) {
        log("Range start is greater than file size");
        res.setHeader("Content-Range", `bytes */${stats.size}`);
        res.statusCode = 416;
        return res.end();
      }

      res.writeHead(206, {
        ...headers,
        "Content-Type": mime.getType(filePath) || "text/plain",
        "Cache-Control": "max-age=3600",
        "Content-Range": `bytes ${start}-${end}/${stats.size}`,
        "Content-Length": end - start + 1,
        "Accept-Ranges": "bytes",
      });
      log(`Sending ${filePath} range ${start}-${end}/${stats.size}`);
      const readStream = createReadStream(filePath, { start, end });
      readStream.on("end", () => {
        const elapsed = Date.now() - sendStartTime;
        log(`Range request completed in ${elapsed}ms`);
      });
      readStream.pipe(res);
    } else {
      res.writeHead(200, {
        ...headers,
        "Content-Type": mime.getType(filePath) || "text/plain",
        "Cache-Control": "max-age=3600",
        "Content-Length": stats.size,
      });
      log(`Sending full file ${filePath} (${stats.size} bytes)`);
      const readStream = createReadStream(filePath);
      readStream.on("end", () => {
        const elapsed = Date.now() - sendStartTime;
        log(`File send completed in ${elapsed}ms`);
      });
      readStream.pipe(res);
    }
  } catch (error) {
    const elapsed = Date.now() - sendStartTime;
    log(`Error sending file after ${elapsed}ms:`, error);
    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: (error as Error).message }));
    }
  }
};
