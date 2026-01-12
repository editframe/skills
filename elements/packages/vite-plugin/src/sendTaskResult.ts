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
    console.log(`[ef:sendfile] Sending file ${filePath} (size: ${statSync(filePath).size} bytes)`);
    log(`Sending file ${filePath}`);
    const stats = statSync(filePath);

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
      console.log(`[ef:sendfile] Sending range ${start}-${end}/${stats.size} of ${filePath}`);
      const readStream = createReadStream(filePath, { start, end });
      readStream.on("end", () => {
        const elapsed = Date.now() - sendStartTime;
        console.log(`[ef:sendfile] Range request completed in ${elapsed}ms`);
      });
      readStream.pipe(res);
    } else {
      res.writeHead(200, {
        ...headers,
        "Content-Type": mime.getType(filePath) || "text/plain",
        "Cache-Control": "max-age=3600",
        "Content-Length": stats.size,
      });
      log(`Sending ${filePath}`);
      console.log(`[ef:sendfile] Sending full file ${filePath} (${stats.size} bytes)`);
      const readStream = createReadStream(filePath);
      readStream.on("end", () => {
        const elapsed = Date.now() - sendStartTime;
        console.log(`[ef:sendfile] File send completed in ${elapsed}ms`);
      });
      readStream.pipe(res);
    }
  } catch (error) {
    const elapsed = Date.now() - sendStartTime;
    log("Error sending file", error);
    console.error(`[ef:sendfile] Error sending file after ${elapsed}ms:`, error);
  }
};
