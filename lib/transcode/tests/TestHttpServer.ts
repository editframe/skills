/**
 * Reusable HTTP Server for Tests
 * Serves files from test-assets with proper range support
 */

import type { Server } from 'node:http';
import path from 'node:path';
import fs from 'node:fs';

import express from 'express';
import { beforeAll, afterAll } from 'vitest';

// Usage:
// import { useTestHttpServer } from './TestHttpServer';
// Inside a test block:
// describe("Some test group", () => {
//   const testServer = useTestHttpServer();
//   it("should do something", () => {
//     const url = testServer.getFileUrl("some-file.mp4");
//     const response = await fetch(url);
//     expect(response.status).toBe(200);
//   });
// });

// A description of available test files can be found in test-assets/transcode/README.md

export const useTestHttpServer = () => {
  const server = new TestHttpServer();

  beforeAll(async () => {
    await server.start();
  });

  afterAll(async () => {
    await server?.stop();
  });

  return server;
}

export class TestHttpServer {
  private server: Server | null = null;
  private port = 0;

  async start(): Promise<number> {
    if (this.server) {
      throw new Error('Server is already running');
    }

    const app = express();

    app.get('/test-files/:filename', (req: any, res: any) => {
      const filename = req.params.filename;

      // Try multiple locations for test files
      const possiblePaths = [
        path.join(process.cwd(), 'test-assets', 'transcode', filename),
        path.join(process.cwd(), 'public', filename)
      ];

      let filePath: string | null = null;
      for (const testPath of possiblePaths) {
        if (fs.existsSync(testPath)) {
          filePath = testPath;
          break;
        }
      }


      if (!filePath) {
        return res.status(404).send('File not found');
      }

      const stat = fs.statSync(filePath);
      const fileSize = stat.size;
      const range = req.headers.range;

      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = Number.parseInt(parts[0], 10);
        const end = parts[1] ? Number.parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = (end - start) + 1;

        res.status(206).header({
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': 'video/mp4',
        });

        const stream = fs.createReadStream(filePath, { start, end });
        stream.pipe(res);
      } else {
        res.header({
          'Content-Length': fileSize,
          'Content-Type': 'video/mp4',
          'Accept-Ranges': 'bytes',
        });
        fs.createReadStream(filePath).pipe(res);
      }
    });

    return new Promise((resolve, reject) => {
      this.server = app.listen(0, (err?: Error) => {
        if (err) {
          reject(err);
        } else {
          this.port = (this.server!.address() as any).port;
          resolve(this.port);
        }
      });
    });
  }

  async stop(): Promise<void> {
    if (!this.server) {
      return;
    }

    return new Promise((resolve) => {
      this.server!.close(() => {
        this.server = null;
        this.port = 0;
        resolve();
      });
    });
  }

  getPort(): number {
    return this.port;
  }

  getBaseUrl(): string {
    if (!this.server) {
      throw new Error('Server is not running');
    }
    return `http://localhost:${this.port}`;
  }

  getFileUrl(filename: string): string {
    return `${this.getBaseUrl()}/test-files/${filename}`;
  }

  isRunning(): boolean {
    return this.server !== null;
  }
}

// Export a shared instance for convenience
export const testHttpServer = new TestHttpServer(); 