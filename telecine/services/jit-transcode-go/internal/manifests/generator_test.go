package manifests

import (
	"fmt"
	"math"
	"strings"
	"testing"
)

func TestGenerateDashManifest(t *testing.T) {
	opts := ManifestOptions{
		BaseURL:          "https://example.com",
		Duration:         15.047,
		SegmentDuration:  2.0,
		VideoRenditions:  []string{"high", "medium", "low"},
		AudioRenditions:  []string{"audio"},
		SourceURL:        "https://source.com/video.mp4",
	}

	manifest := GenerateDashManifest(opts)

	if !strings.Contains(manifest, "<?xml version=\"1.0\" encoding=\"UTF-8\"?>") {
		t.Error("Manifest should start with XML declaration")
	}

	if !strings.Contains(manifest, "<MPD") {
		t.Error("Manifest should contain MPD element")
	}

	if !strings.Contains(manifest, "PT15.047000S") {
		t.Error("Manifest should contain correct duration")
	}

	for _, rendition := range opts.VideoRenditions {
		if !strings.Contains(manifest, fmt.Sprintf("id=\"%s\"", rendition)) {
			t.Errorf("Manifest should contain rendition: %s", rendition)
		}
	}

	if !strings.Contains(manifest, "SegmentTemplate") {
		t.Error("Manifest should contain SegmentTemplate")
	}

	if !strings.Contains(manifest, "SegmentTimeline") {
		t.Error("Manifest should contain SegmentTimeline")
	}
}

func TestGenerateHlsManifest(t *testing.T) {
	opts := ManifestOptions{
		BaseURL:          "https://example.com",
		Duration:         15.047,
		SegmentDuration:  2.0,
		VideoRenditions:  []string{"high", "medium"},
		AudioRenditions:  []string{"audio"},
		SourceURL:        "https://source.com/video.mp4",
	}

	manifest := GenerateHlsManifest(opts)

	if !strings.HasPrefix(manifest, "#EXTM3U") {
		t.Error("HLS manifest should start with #EXTM3U")
	}

	if !strings.Contains(manifest, "#EXT-X-VERSION:6") {
		t.Error("Manifest should contain version")
	}

	if !strings.Contains(manifest, "#EXT-X-STREAM-INF") {
		t.Error("Manifest should contain stream info")
	}

	for _, rendition := range opts.VideoRenditions {
		expectedURL := fmt.Sprintf("/api/v1/transcode/%s.m3u8", rendition)
		if !strings.Contains(manifest, expectedURL) {
			t.Errorf("Manifest should contain URL for rendition: %s", rendition)
		}
	}

	if !strings.Contains(manifest, "CODECS=\"avc1.640029,mp4a.40.2\"") {
		t.Error("Manifest should contain video codec info")
	}
}

func TestGenerateHlsQualityPlaylist(t *testing.T) {
	opts := ManifestOptions{
		BaseURL:         "https://example.com",
		Duration:        10.0,
		SegmentDuration: 2.0,
		SourceURL:       "https://source.com/video.mp4",
	}

	manifest := GenerateHlsQualityPlaylist(opts, "high")

	if !strings.HasPrefix(manifest, "#EXTM3U") {
		t.Error("Playlist should start with #EXTM3U")
	}

	if !strings.Contains(manifest, "#EXT-X-TARGETDURATION") {
		t.Error("Playlist should contain target duration")
	}

	if !strings.Contains(manifest, "#EXTINF") {
		t.Error("Playlist should contain EXTINF tags")
	}

	if !strings.Contains(manifest, "#EXT-X-ENDLIST") {
		t.Error("Playlist should end with ENDLIST")
	}

	if !strings.Contains(manifest, "/api/v1/transcode/high/") {
		t.Error("Playlist should contain segment URLs")
	}
}

func TestCalculateSegmentDurations(t *testing.T) {
	t.Run("Video segments", func(t *testing.T) {
		durations := calculateSegmentDurations(10000, 2000, "video")

		if len(durations) != 5 {
			t.Errorf("Expected 5 segments for 10s video, got %d", len(durations))
		}

		for _, d := range durations {
			if d < 1800 || d > 2100 {
				t.Errorf("Segment duration %f outside expected range 1800-2100ms", d)
			}
		}
	})

	t.Run("Audio segments", func(t *testing.T) {
		durations := calculateSegmentDurations(10000, 2000, "audio")

		if len(durations) != 5 {
			t.Errorf("Expected 5 segments for 10s audio, got %d", len(durations))
		}

		firstSegment := durations[0]
		if firstSegment < 2000 || firstSegment > 2100 {
			t.Errorf("First audio segment %f outside expected range", firstSegment)
		}
	})
}

func TestGetClosestAlignedTime(t *testing.T) {
	tests := []struct {
		name     string
		input    float64
		expected float64
		delta    float64
	}{
		{"Zero", 0, 0, 0.1},
		{"One frame", 21333.333, 21333.333, 0.1},
		{"Two frames", 42666.666, 42666.666, 0.1},
		{"Half frame rounds down", 10666.0, 0.0, 0.1},
		{"Over half frame rounds up", 16000.0, 21333.333, 1.0},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := getClosestAlignedTime(tt.input)
			diff := math.Abs(result - tt.expected)
			if diff > tt.delta {
				t.Errorf("Expected ~%f, got %f (diff: %f)", tt.expected, result, diff)
			}
		})
	}
}

