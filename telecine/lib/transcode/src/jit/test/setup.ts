import { beforeAll, afterAll } from 'vitest';
import express from 'express';
import * as path from 'path';
import * as fs from 'fs';
import { Server } from 'http';

// Test file server configuration
let TEST_SERVER_PORT: number;
let testServer: Server;

beforeAll(async () => {
  // Create a simple file server for serving test MP4 files
  const app = express();

  // Serve test fixtures
  app.use('/videos', express.static(path.join(process.cwd(), 'test/fixtures')));

  // Health check for test server
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', server: 'test' });
  });

  // Start test server on a random available port
  return new Promise<void>((resolve) => {
    testServer = app.listen(0, () => {
      const address = testServer.address();
      if (address && typeof address === 'object') {
        TEST_SERVER_PORT = address.port;
        console.log(`🧪 Test file server running on http://localhost:${TEST_SERVER_PORT}`);
        resolve();
      }
    });
  });
});

afterAll(async () => {
  // Close test server
  if (testServer) {
    return new Promise<void>((resolve) => {
      testServer.close(() => {
        console.log('🧪 Test file server closed');
        resolve();
      });
    });
  }
});

// Helper to get test video URLs
export function getTestVideoUrl(filename: string): string {
  return `http://localhost:${TEST_SERVER_PORT}/videos/${filename}`;
}

// Helper to check if test files exist
export function ensureTestFiles(): void {
  const testFilesDir = path.join(process.cwd(), 'test/fixtures');
  const requiredFiles = ['minimal-video.mp4', 'short-video.mp4', 'medium-video.mp4', 'color-bars.mp4'];

  for (const file of requiredFiles) {
    const filePath = path.join(testFilesDir, file);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Test file not found: ${filePath}. Run 'npm run test:setup' first.`);
    }
  }
} 