#!/usr/bin/env node

/**
 * Simplified HTTP Server for Testing
 */

import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import type { AddressInfo } from 'node:net';

const app = express();

app.get('/test-files/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(process.cwd(), 'test-assets', 'transcode', filename);

  // console.log(`📡 Server: ${filename} (${fs.existsSync(filePath) ? 'exists' : 'missing'})`);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send('File not found');
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = Number.parseInt(parts[0] || '0', 10);
    const end = parts[1] ? Number.parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = (end - start) + 1;

    // console.log(`📡 Server: Range ${start}-${end}/${fileSize} (${chunksize} bytes)`);

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': 'video/mp4'
    });

    fs.createReadStream(filePath, { start, end }).pipe(res);
  } else {
    console.log(`📡 Server: Full file ${fileSize} bytes`);

    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4',
      'Accept-Ranges': 'bytes'
    });

    fs.createReadStream(filePath).pipe(res);
  }
});

const port = process.env.PORT || 0;
const server = app.listen(port, () => {
  const actualPort = (server.address() as AddressInfo).port;
  // console.log(`🌐 HTTP server running on port ${actualPort}`);

  if (process.send) {
    process.send({ type: 'ready', port: actualPort });
  }
});

process.on('SIGTERM', () => {
  // console.log('🌐 HTTP server shutting down...');
  server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  // console.log('🌐 HTTP server shutting down...');
  server.close(() => process.exit(0));
}); 