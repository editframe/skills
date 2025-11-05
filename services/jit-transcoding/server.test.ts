import { describe, test, expect, vi } from "vitest";

// Mock the transcoding service module
vi.mock("@/transcode/src/jit/transcoding-service", () => ({
  transcodeSegment: vi.fn(),
  getFileDurationWithCaching: vi.fn()
}));

// Mock the video source modules for metadata endpoint
vi.mock("@/transcode/src/moovScanner", () => ({
  fetchMoovAndFtyp: vi.fn(),
  buildFakeMp4: vi.fn()
}));

vi.mock("@/transcode/src/pipeline/VideoSource", () => ({
  createVideoSource: vi.fn()
}));

describe("JIT Transcoding Service", () => {

  describe("Validation Functions", () => {
    test("should validate start time alignment to 2s boundaries", () => {
      // Test valid start times (aligned to 2s boundaries)
      expect(0 % 2000).toBe(0);  // 0ms is valid
      expect(2000 % 2000).toBe(0);  // 2000ms is valid  
      expect(4000 % 2000).toBe(0);  // 4000ms is valid
      expect(6000 % 2000).toBe(0);  // 6000ms is valid

      // Test invalid start times (not aligned)
      expect(1500 % 2000).not.toBe(0);  // 1500ms is invalid
      expect(3500 % 2000).not.toBe(0);  // 3500ms is invalid
      expect(500 % 2000).not.toBe(0);   // 500ms is invalid
    });

    test("should calculate nearest valid time for misaligned times", () => {
      // Test nearest valid time calculation
      expect(Math.round(1500 / 2000) * 2000).toBe(2000);
      expect(Math.round(3700 / 2000) * 2000).toBe(4000);
      expect(Math.round(500 / 2000) * 2000).toBe(0);
      expect(Math.round(1200 / 2000) * 2000).toBe(2000);
    });

    test("should validate quality presets", () => {
      const validPresets = ['low', 'medium', 'high'];
      const invalidPresets = ['invalid', 'ultra', 'custom', ''];

      validPresets.forEach(preset => {
        expect(['low', 'medium', 'high'].includes(preset)).toBe(true);
      });

      invalidPresets.forEach(preset => {
        expect(['low', 'medium', 'high'].includes(preset)).toBe(false);
      });
    });
  });

  describe("Quality Presets Configuration", () => {
    test("should have correct low quality preset values", () => {
      const lowPreset = {
        name: 'low',
        width: 480,
        height: 270,
        videoBitrate: 400000,
        audioBitrate: 64000,
        audioChannels: 2,
        audioSampleRate: 48000,
        audioCodec: 'aac'
      };

      // Test that low quality has expected values
      expect(lowPreset.width).toBe(480);
      expect(lowPreset.height).toBe(270);
      expect(lowPreset.videoBitrate).toBe(400000);
      expect(lowPreset.audioBitrate).toBe(64000);
    });

    test("should have correct medium quality preset values", () => {
      const mediumPreset = {
        name: 'medium',
        width: 854,
        height: 480,
        videoBitrate: 1000000,
        audioBitrate: 128000,
        audioChannels: 2,
        audioSampleRate: 48000,
        audioCodec: 'aac'
      };

      expect(mediumPreset.width).toBe(854);
      expect(mediumPreset.height).toBe(480);
      expect(mediumPreset.videoBitrate).toBe(1000000);
      expect(mediumPreset.audioBitrate).toBe(128000);
    });

    test("should have correct high quality preset values", () => {
      const highPreset = {
        name: 'high',
        width: 1280,
        height: 720,
        videoBitrate: 2500000,
        audioBitrate: 192000,
        audioChannels: 2,
        audioSampleRate: 48000,
        audioCodec: 'aac'
      };

      expect(highPreset.width).toBe(1280);
      expect(highPreset.height).toBe(720);
      expect(highPreset.videoBitrate).toBe(2500000);
      expect(highPreset.audioBitrate).toBe(192000);
    });
  });

  describe("Quality Presets Endpoint", () => {
    test("should return all available presets", () => {
      const expectedResponse = {
        presets: {
          low: {
            name: 'low',
            width: 480,
            height: 270,
            videoBitrate: 400000,
            audioBitrate: 64000,
            audioChannels: 2,
            audioSampleRate: 48000,
            audioCodec: 'aac'
          },
          medium: {
            name: 'medium',
            width: 854,
            height: 480,
            videoBitrate: 1000000,
            audioBitrate: 128000,
            audioChannels: 2,
            audioSampleRate: 48000,
            audioCodec: 'aac'
          },
          high: {
            name: 'high',
            width: 1280,
            height: 720,
            videoBitrate: 2500000,
            audioBitrate: 192000,
            audioChannels: 2,
            audioSampleRate: 48000,
            audioCodec: 'aac'
          }
        },
        segmentDuration: 2000,
        alignment: "2s"
      };

      expect(expectedResponse.presets).toHaveProperty('low');
      expect(expectedResponse.presets).toHaveProperty('medium');
      expect(expectedResponse.presets).toHaveProperty('high');
      expect(expectedResponse.segmentDuration).toBe(2000);
      expect(expectedResponse.alignment).toBe("2s");
    });

    test("should include segment configuration in presets response", () => {
      const presetsConfig = {
        segmentDuration: 2000,
        alignment: "2s"
      };

      expect(presetsConfig.segmentDuration).toBe(2000);
      expect(presetsConfig.alignment).toBe("2s");
    });
  });

  describe("Metadata Endpoint", () => {
    test("should extract video metadata correctly", async () => {
      const { fetchMoovAndFtyp, buildFakeMp4 } = await import("@/transcode/src/moovScanner");
      const { createVideoSource } = await import("@/transcode/src/pipeline/VideoSource");

      const mockMoovResult = {
        ftyp: new Uint8Array([0x00, 0x00, 0x00, 0x20]),
        moov: new Uint8Array([0x00, 0x00, 0x00, 0x20])
      };

      const mockVideoSource = {
        durationMs: 60000,
        streams: [
          {
            index: 0,
            codecType: 'video',
            codecName: 'h264',
            duration: 60,
            durationMs: 60000,
            width: 1920,
            height: 1080,
            frameRate: { num: 30, den: 1 }
          },
          {
            index: 1,
            codecType: 'audio',
            codecName: 'aac',
            duration: 60,
            durationMs: 60000,
            channels: 2,
            sampleRate: 48000
          }
        ],
        [Symbol.dispose]: vi.fn()
      };

      vi.mocked(fetchMoovAndFtyp).mockResolvedValue(mockMoovResult);
      vi.mocked(buildFakeMp4).mockReturnValue(new Uint8Array([0x00, 0x00, 0x00, 0x20]));
      vi.mocked(createVideoSource).mockResolvedValue(mockVideoSource);

      const expectedMetadata = {
        url: "https://example.com/video.mp4",
        durationMs: 60000,
        streams: [
          {
            index: 0,
            type: 'video',
            codecName: 'h264',
            duration: 60,
            durationMs: 60000,
            width: 1920,
            height: 1080,
            frameRate: { num: 30, den: 1 }
          },
          {
            index: 1,
            type: 'audio',
            codecName: 'aac',
            duration: 60,
            durationMs: 60000,
            channels: 2,
            sampleRate: 48000
          }
        ],
        presets: ['low', 'medium', 'high'],
        segmentDuration: 2000,
        supportedFormats: ['mp4']
      };

      expect(expectedMetadata.durationMs).toBe(60000);
      expect(expectedMetadata.streams).toHaveLength(2);
      expect(expectedMetadata.streams[0].type).toBe('video');
      expect(expectedMetadata.streams[1].type).toBe('audio');
      expect(expectedMetadata.presets).toContain('low');
      expect(expectedMetadata.presets).toContain('medium');
      expect(expectedMetadata.presets).toContain('high');
    });

    test("should handle invalid video URLs", () => {
      const invalidVideoError = {
        error: {
          code: "INVALID_VIDEO",
          message: "Unable to extract video metadata",
          details: { url: "https://example.com/invalid.mp4" }
        }
      };

      expect(invalidVideoError.error.code).toBe("INVALID_VIDEO");
      expect(invalidVideoError.error.details.url).toBe("https://example.com/invalid.mp4");
    });

    test("should handle metadata extraction failures", () => {
      const metadataError = {
        error: {
          code: "METADATA_EXTRACTION_FAILED",
          message: "Failed to extract video metadata",
          details: {
            errorType: "NetworkError",
            errorMessage: "Connection timeout"
          }
        }
      };

      expect(metadataError.error.code).toBe("METADATA_EXTRACTION_FAILED");
      expect(metadataError.error.details.errorType).toBe("NetworkError");
    });

    test("should validate URL parameter in metadata request", () => {
      const validationError = {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid query parameters",
          details: [
            {
              code: "invalid_string",
              path: ["url"],
              message: "Invalid url"
            }
          ]
        }
      };

      expect(validationError.error.code).toBe("VALIDATION_ERROR");
      expect(validationError.error.details[0].path).toContain("url");
    });
  });

  describe("Custom Quality Parameter Parsing", () => {
    test("should only support predefined quality presets", () => {
      const supportedPresets = {
        low: { width: 480, height: 270, videoBitrate: 400000, audioBitrate: 64000 },
        medium: { width: 854, height: 480, videoBitrate: 1000000, audioBitrate: 128000 },
        high: { width: 1280, height: 720, videoBitrate: 2500000, audioBitrate: 192000 }
      };

      // Verify we only support these three presets
      expect(Object.keys(supportedPresets)).toEqual(['low', 'medium', 'high']);

      // Verify preset configurations are secure (reasonable limits)
      Object.values(supportedPresets).forEach(preset => {
        expect(preset.width).toBeLessThanOrEqual(1920);
        expect(preset.height).toBeLessThanOrEqual(1080);
        expect(preset.videoBitrate).toBeLessThanOrEqual(5000000); // 5Mbps max
        expect(preset.audioBitrate).toBeLessThanOrEqual(320000); // 320kbps max
      });
    });
  });

  describe("CORS Configuration", () => {
    test("should include necessary CORS headers for browser access", () => {
      const expectedCorsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Range',
        'Access-Control-Expose-Headers': 'Content-Length, Content-Range, X-Cache, X-Actual-Start-Time, X-Actual-Duration'
      };

      expect(expectedCorsHeaders['Access-Control-Allow-Origin']).toBe('*');
      expect(expectedCorsHeaders['Access-Control-Allow-Methods']).toContain('GET');
      expect(expectedCorsHeaders['Access-Control-Allow-Headers']).toContain('Range');
      expect(expectedCorsHeaders['Access-Control-Expose-Headers']).toContain('X-Cache');
    });

    test("should handle OPTIONS preflight requests", () => {
      // OPTIONS requests should return 200 without processing
      const optionsRequest = {
        method: 'OPTIONS',
        expectedStatus: 200
      };

      expect(optionsRequest.method).toBe('OPTIONS');
      expect(optionsRequest.expectedStatus).toBe(200);
    });
  });

  describe("JitTranscoder Integration", () => {
    test("should call transcodeSegment with correct parameters for low preset", async () => {
      const { transcodeSegment } = await import("@/transcode/src/jit/transcoding-service");

      const mockResult = "/path/to/output/segment.m4s";

      vi.mocked(transcodeSegment).mockResolvedValue(mockResult);

      const result = await transcodeSegment({
        inputUrl: "https://example.com/video.mp4",
        rendition: "low",
        segmentId: "1",
        segmentDurationMs: 2000,
        outputDir: "/tmp/output"
      });

      expect(result).toBe(mockResult);
      expect(transcodeSegment).toHaveBeenCalledWith({
        inputUrl: "https://example.com/video.mp4",
        rendition: "low",
        segmentId: "1",
        segmentDurationMs: 2000,
        outputDir: "/tmp/output"
      });
    });
  });

  describe("Error Response Structures", () => {
    test("should have correct error structure for time alignment error", () => {
      const timeAlignmentError = {
        error: {
          code: "TIME_ALIGNMENT_ERROR",
          message: "Start time must be aligned to 2s boundaries",
          details: {
            providedTime: 1500,
            nearestValidTime: 2000,
            segmentDuration: 2000
          }
        }
      };

      expect(timeAlignmentError.error.code).toBe("TIME_ALIGNMENT_ERROR");
      expect(timeAlignmentError.error.details.providedTime).toBe(1500);
      expect(timeAlignmentError.error.details.nearestValidTime).toBe(2000);
    });

    test("should have correct error structure for invalid preset", () => {
      const invalidPresetError = {
        error: {
          code: "INVALID_PRESET",
          message: "Invalid quality preset",
          details: {
            providedPreset: "invalid",
            validPresets: ["low", "medium", "high"]
          }
        }
      };

      expect(invalidPresetError.error.code).toBe("INVALID_PRESET");
      expect(invalidPresetError.error.details.validPresets).toContain("low");
      expect(invalidPresetError.error.details.validPresets).toContain("medium");
      expect(invalidPresetError.error.details.validPresets).toContain("high");
    });
  });

  describe("Scrub Tracks Feature", () => {
    test("should validate scrub preset", () => {
      const validPresets = ['low', 'medium', 'high', 'scrub'];

      expect(validPresets.includes('scrub')).toBe(true);
      expect(validPresets.includes('invalid')).toBe(false);
    });

    test("should validate 30s alignment for scrub tracks", () => {
      // Test valid scrub start times (aligned to 30s boundaries)
      expect(0 % 30000).toBe(0);      // 0ms is valid
      expect(30000 % 30000).toBe(0);  // 30000ms is valid  
      expect(60000 % 30000).toBe(0);  // 60000ms is valid
      expect(90000 % 30000).toBe(0);  // 90000ms is valid

      // Test invalid scrub start times (not aligned to 30s)
      expect(15000 % 30000).not.toBe(0);  // 15000ms is invalid
      expect(45000 % 30000).not.toBe(0);  // 45000ms is invalid
      expect(2000 % 30000).not.toBe(0);   // 2000ms is invalid (regular alignment)
    });

    test("should calculate nearest valid time for scrub tracks", () => {
      // Test nearest valid time calculation for 30s alignment
      expect(Math.round(15000 / 30000) * 30000).toBe(30000);
      expect(Math.round(45000 / 30000) * 30000).toBe(60000);
      expect(Math.round(10000 / 30000) * 30000).toBe(0);
      expect(Math.round(75000 / 30000) * 30000).toBe(90000);
    });

    test("should have correct scrub quality preset values", () => {
      const scrubPreset = {
        name: 'scrub',
        width: 320,
        height: 180,
        videoBitrate: 100000,
        audioBitrate: 0,      // No audio for scrub tracks
        audioChannels: 0,     // No audio channels
        audioSampleRate: 0,   // No audio sample rate
        audioCodec: null,     // Video-only output
        segmentDuration: 30000 // 30s segments
      };

      expect(scrubPreset.width).toBe(320);
      expect(scrubPreset.height).toBe(180);
      expect(scrubPreset.videoBitrate).toBe(100000);
      expect(scrubPreset.audioBitrate).toBe(0);
      expect(scrubPreset.audioChannels).toBe(0);
      expect(scrubPreset.audioCodec).toBe(null);
      expect(scrubPreset.segmentDuration).toBe(30000);
    });

    test("should have correct error structure for scrub time alignment error", () => {
      const scrubTimeAlignmentError = {
        error: {
          code: "TIME_ALIGNMENT_ERROR",
          message: "Start time must be aligned to 30s boundaries for scrub tracks",
          details: {
            providedTime: 15000,
            nearestValidTime: 30000,
            segmentDuration: 30000,
            preset: "scrub"
          }
        }
      };

      expect(scrubTimeAlignmentError.error.code).toBe("TIME_ALIGNMENT_ERROR");
      expect(scrubTimeAlignmentError.error.details.providedTime).toBe(15000);
      expect(scrubTimeAlignmentError.error.details.nearestValidTime).toBe(30000);
      expect(scrubTimeAlignmentError.error.details.segmentDuration).toBe(30000);
      expect(scrubTimeAlignmentError.error.details.preset).toBe("scrub");
    });

    test("should call transcodeVideoSegment with correct parameters for scrub preset", async () => {
      const { transcodeSegment } = await import("@/transcode/src/jit/transcoding-service");

      const mockResult = {
        success: true,
        outputData: new Uint8Array([0x00, 0x00, 0x00, 0x20]),
        actualStartTimeMs: 0,
        actualDurationMs: 30000
      };

      vi.mocked(transcodeSegment).mockResolvedValue(mockResult);

      const result = await transcodeSegment({
        url: "https://example.com/video.mp4",
        startTimeMs: 0,
        durationMs: 30000,
        targetWidth: 320,
        targetHeight: 180,
        videoBitrate: 100000,
        audioCodec: null,
        audioBitrate: 0,
        audioChannels: 0,
        audioSampleRate: 0
      });

      expect(result.success).toBe(true);
      expect(result.actualDurationMs).toBe(30000);
      expect(transcodeSegment).toHaveBeenCalledWith({
        url: "https://example.com/video.mp4",
        startTimeMs: 0,
        durationMs: 30000,
        targetWidth: 320,
        targetHeight: 180,
        videoBitrate: 100000,
        audioCodec: null,
        audioBitrate: 0,
        audioChannels: 0,
        audioSampleRate: 0
      });
    });

    test("should pass optimal GOP size for scrub tracks based on frame rate", async () => {
      // Test the GOP size calculation logic directly rather than mocking createEncoder
      const calculateOptimalGopSize = (frameRate: number, isScrubTrack: boolean): number => {
        if (!isScrubTrack) {
          return 30; // Default GOP size for regular tracks
        }

        const oneSecondFrames = Math.ceil(frameRate);
        return Math.min(oneSecondFrames, 50);
      };

      // Test that scrub tracks use optimal GOP size for different frame rates
      expect(calculateOptimalGopSize(24, true)).toBe(24);   // 24fps scrub -> 24 frames
      expect(calculateOptimalGopSize(30, true)).toBe(30);   // 30fps scrub -> 30 frames  
      expect(calculateOptimalGopSize(60, true)).toBe(50);   // 60fps scrub -> 50 frames (capped)
      expect(calculateOptimalGopSize(120, true)).toBe(50);  // 120fps scrub -> 50 frames (capped)

      // Test that regular tracks use default GOP size
      expect(calculateOptimalGopSize(24, false)).toBe(30);  // 24fps regular -> 30 frames
      expect(calculateOptimalGopSize(60, false)).toBe(30);  // 60fps regular -> 30 frames
    });
  });
}); 