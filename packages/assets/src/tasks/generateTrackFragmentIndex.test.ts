import { test, describe, assert } from "vitest";
import { generateTrackFragmentIndexFromPath } from "./generateTrackFragmentIndex";

describe("generateTrackFragmentIndex", () => {
  test("should generate fragment index", async () => {
    const fragmentIndex = await generateTrackFragmentIndexFromPath("test-assets/10s-bars.mp4");

    // Should have multiple tracks
    const trackIds = Object.keys(fragmentIndex).map(Number);
    assert.isAbove(trackIds.length, 0, "Should have tracks");

    for (const trackId of trackIds) {
      const track = fragmentIndex[trackId]!;

      // Verify track structure
      assert.oneOf(track.type, ['video', 'audio'], `Track ${trackId} should be video or audio`);
      assert.isNumber(track.track, `Track ${trackId} should have track number`);
      assert.isNumber(track.timescale, `Track ${trackId} should have timescale`);
      assert.isNumber(track.duration, `Track ${trackId} should have duration`);
      assert.isNumber(track.sample_count, `Track ${trackId} should have sample_count`);
      assert.isString(track.codec, `Track ${trackId} should have codec`);

      // Verify init segment
      assert.equal(track.initSegment.offset, 0, `Track ${trackId} init should start at 0`);
      assert.isAbove(track.initSegment.size, 0, `Track ${trackId} init should have size`);

      // Verify segments
      assert.isArray(track.segments, `Track ${trackId} should have segments array`);
      assert.isAbove(track.segments.length, 0, `Track ${trackId} should have segments`);

      // Check each segment
      for (const segment of track.segments) {
        assert.isNumber(segment.cts, `Track ${trackId} segment should have cts`);
        assert.isNumber(segment.dts, `Track ${trackId} segment should have dts`);
        assert.isNumber(segment.duration, `Track ${trackId} segment should have duration`);
        assert.isNumber(segment.offset, `Track ${trackId} segment should have offset`);
        assert.isNumber(segment.size, `Track ${trackId} segment should have size`);
      }

      // Type-specific checks
      if (track.type === 'video') {
        assert.isNumber(track.width, `Video track ${trackId} should have width`);
        assert.isNumber(track.height, `Video track ${trackId} should have height`);
      } else if (track.type === 'audio') {
        assert.isNumber(track.channel_count, `Audio track ${trackId} should have channel_count`);
        assert.isNumber(track.sample_rate, `Audio track ${trackId} should have sample_rate`);
        assert.isNumber(track.sample_size, `Audio track ${trackId} should have sample_size`);
      }
    }
  });

  test("should handle single track files", async () => {
    const fragmentIndex = await generateTrackFragmentIndexFromPath("test-assets/frame-count.mp4");

    const trackIds = Object.keys(fragmentIndex).map(Number);
    assert.equal(trackIds.length, 1, "Should have exactly one track");

    const track = fragmentIndex[trackIds[0]!]!;
    assert.equal(track.type, "video", "Should be video track");
    assert.isAbove(track.segments.length, 0, "Should have segments");
  });

  test("should generate consistent results with original implementation", async () => {
    // Test that the new implementation produces similar structure to the old one
    const fragmentIndex = await generateTrackFragmentIndexFromPath("test-assets/bars-n-tone.mp4");

    const trackIds = Object.keys(fragmentIndex).map(Number);
    assert.equal(trackIds.length, 2, "Should have video and audio tracks");

    // Should have both video and audio
    const videoTrack = Object.values(fragmentIndex).find(t => t.type === 'video');
    const audioTrack = Object.values(fragmentIndex).find(t => t.type === 'audio');

    assert.exists(videoTrack, "Should have video track");
    assert.exists(audioTrack, "Should have audio track");

    // Video track checks
    assert.isAbove(videoTrack.width, 0, "Video should have width");
    assert.isAbove(videoTrack.height, 0, "Video should have height");
    assert.isAbove(videoTrack.segments.length, 0, "Video should have segments");

    // Audio track checks  
    assert.isAbove(audioTrack.channel_count, 0, "Audio should have channels");
    assert.isAbove(audioTrack.sample_rate, 0, "Audio should have sample rate");
    assert.isAbove(audioTrack.segments.length, 0, "Audio should have segments");
  }, 20000);

  test("should preserve timing offset detection", async () => {
    // Test with a file that might have timing offsets
    const fragmentIndex = await generateTrackFragmentIndexFromPath("test-assets/frame-count.mp4");

    const trackIds = Object.keys(fragmentIndex).map(Number);
    const track = fragmentIndex[trackIds[0]!]!;

    assert.equal(track.startTimeOffsetMs, 200);
    assert.equal(track.type, "video");

    // Should still have valid timing data
    assert.isAbove(track.duration, 0, "Should have positive duration");
    for (const segment of track.segments) {
      assert.isAbove(segment.duration, 0, "Each segment should have positive duration");
    }
  }, 15000);
});

