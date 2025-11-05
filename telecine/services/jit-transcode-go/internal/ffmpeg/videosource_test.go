package ffmpeg

import (
	"os"
	"testing"
)

func TestCreateVideoSourceFromBuffer(t *testing.T) {
	t.Skip("Requires actual MP4 file for testing - implement when CGO is fully integrated")

	testFile := "../../test-assets/sample.mp4"
	data, err := os.ReadFile(testFile)
	if err != nil {
		t.Skipf("Test file not found: %v", err)
	}

	vs, err := CreateVideoSourceFromBuffer(data)
	if err != nil {
		t.Fatalf("Failed to create video source: %v", err)
	}
	defer vs.Close()

	duration := vs.GetDurationMs()
	if duration <= 0 {
		t.Errorf("Expected positive duration, got %f", duration)
	}

	streams := vs.GetStreams()
	if len(streams) == 0 {
		t.Error("Expected at least one stream")
	}

	hasVideo := false
	for _, stream := range streams {
		if stream.CodecType == "video" {
			hasVideo = true
			if stream.Width <= 0 || stream.Height <= 0 {
				t.Errorf("Invalid video dimensions: %dx%d", stream.Width, stream.Height)
			}
		}
	}

	if !hasVideo {
		t.Error("Expected at least one video stream")
	}
}

func TestDetectAvailableTracks(t *testing.T) {
	t.Skip("Requires actual MP4 file for testing - implement when CGO is fully integrated")

	testFile := "../../test-assets/sample.mp4"
	data, err := os.ReadFile(testFile)
	if err != nil {
		t.Skipf("Test file not found: %v", err)
	}

	vs, err := CreateVideoSourceFromBuffer(data)
	if err != nil {
		t.Fatalf("Failed to create video source: %v", err)
	}
	defer vs.Close()

	hasAudio, hasVideo, err := vs.DetectAvailableTracks()
	if err != nil {
		t.Fatalf("Failed to detect tracks: %v", err)
	}

	if !hasVideo {
		t.Error("Expected video track in sample file")
	}

	t.Logf("Tracks detected - Audio: %v, Video: %v", hasAudio, hasVideo)
}

