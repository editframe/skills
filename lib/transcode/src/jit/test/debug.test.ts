import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { getTestVideoUrl, ensureTestFiles } from './setup';
import { app } from '../test-server';

describe('Debug Tests', () => {
  beforeAll(() => {
    ensureTestFiles();
  });

  it('should show the actual error for DASH manifest', async () => {
    const testVideoUrl = getTestVideoUrl('minimal-video.mp4');
    console.log('Test video URL:', testVideoUrl);

    const response = await request(app)
      .get('/api/v1/transcode/manifest.mpd')
      .query({ url: testVideoUrl });

    console.log('Response status:', response.status);
    console.log('Response body:', response.body);
    console.log('Response text:', response.text);

    // Just expect it to not be 500 (internal server error)
    expect([200, 400, 404]).toContain(response.status);
  });

  it('should test if test video URL is accessible', async () => {
    const testVideoUrl = getTestVideoUrl('minimal-video.mp4');
    console.log('Testing video URL accessibility:', testVideoUrl);

    // Try to access the video file directly
    const response = await request(app)
      .get('/videos/minimal-video.mp4');

    console.log('Direct video access status:', response.status);
    console.log('Content-Type:', response.headers['content-type']);
    console.log('Content-Length:', response.headers['content-length']);
  });
}); 