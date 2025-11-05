import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { getTestVideoUrl, ensureTestFiles } from './setup';
import { app } from '../test-server';

describe('Basic API Tests', () => {
  beforeAll(() => {
    ensureTestFiles();
  });

  describe('Quick Tests', () => {
    it('should return server health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toEqual({
        status: 'ok',
        timestamp: expect.any(String)
      });
    });

    it('should return 400 for missing URL parameter', async () => {
      const response = await request(app)
        .get('/api/v1/transcode/high.m4s')
        .query({ segmentId: '1' })
        .expect(400);

      expect(response.body.error).toContain('URL parameter is required');
    });

    it('should return 400 for invalid quality', async () => {
      const testVideoUrl = getTestVideoUrl('minimal-video.mp4');
      const response = await request(app)
        .get('/api/v1/transcode/invalid.m4s')
        .query({ url: testVideoUrl, segmentId: '1' })
        .expect(400);

      expect(response.body.error).toContain('Invalid quality');
    });

    it('should return 400 for invalid segment ID', async () => {
      const testVideoUrl = getTestVideoUrl('minimal-video.mp4');
      const response = await request(app)
        .get('/api/v1/transcode/high.m4s')
        .query({ url: testVideoUrl, segmentId: 'invalid' })
        .expect(400);

      expect(response.body.error).toContain('segmentId must be');
    });

    it('should generate DASH manifest without processing segments', async () => {
      const testVideoUrl = getTestVideoUrl('minimal-video.mp4');

      const response = await request(app)
        .get('/api/v1/transcode/manifest.mpd')
        .query({ url: testVideoUrl })
        .expect(200);

      expect(response.headers['content-type']).toMatch(/^application\/dash\+xml/);
      expect(response.text).toContain('<?xml version="1.0"');
      expect(response.text).toContain('<MPD');
    });

    it('should generate HLS manifest without processing segments', async () => {
      const testVideoUrl = getTestVideoUrl('minimal-video.mp4');

      const response = await request(app)
        .get('/api/v1/transcode/manifest.m3u8')
        .query({ url: testVideoUrl })
        .expect(200);

      expect(response.headers['content-type']).toMatch(/^application\/vnd\.apple\.mpegurl/);
      expect(response.text).toContain('#EXTM3U');
    });
  });
}); 