package transcoding

type RenditionConfig struct {
	Name         string
	Width        int
	Height       int
	VideoBitrate int
	AudioBitrate int
	VideoCodec   string
	AudioCodec   string
	FrameRate    int
	GOPSize      int
}

var RenditionConfigs = map[string]RenditionConfig{
	"high": {
		Name:         "high",
		Width:        1920,
		Height:       1080,
		VideoBitrate: 35000000,
		AudioBitrate: 128000,
		VideoCodec:   "libx264",
		AudioCodec:   "aac",
		FrameRate:    30,
		GOPSize:      999,
	},
	"medium": {
		Name:         "medium",
		Width:        1280,
		Height:       720,
		VideoBitrate: 2000000,
		AudioBitrate: 96000,
		VideoCodec:   "libx264",
		AudioCodec:   "aac",
		FrameRate:    30,
		GOPSize:      999,
	},
	"low": {
		Name:         "low",
		Width:        854,
		Height:       480,
		VideoBitrate: 800000,
		AudioBitrate: 64000,
		VideoCodec:   "libx264",
		AudioCodec:   "aac",
		FrameRate:    30,
		GOPSize:      999,
	},
	"scrub": {
		Name:         "scrub",
		Width:        320,
		Height:       180,
		VideoBitrate: 100000,
		AudioBitrate: 0,
		VideoCodec:   "libx264",
		AudioCodec:   "",
		FrameRate:    15,
		GOPSize:      30,
	},
	"audio": {
		Name:         "audio",
		Width:        0,
		Height:       0,
		VideoBitrate: 0,
		AudioBitrate: 128000,
		VideoCodec:   "",
		AudioCodec:   "aac",
		FrameRate:    0,
		GOPSize:      0,
	},
}

const (
	SegmentDuration      = 2000
	ScrubSegmentDuration = 30000
	MP3SegmentDuration   = 15000
)

func GetSegmentDuration(rendition string, isMP3 bool) int {
	if isMP3 {
		return MP3SegmentDuration
	}
	if rendition == "scrub" {
		return ScrubSegmentDuration
	}
	return SegmentDuration
}

func CalculateOptimalGOPSize(frameRate int, isScrubTrack bool) int {
	if isScrubTrack {
		oneSecondInFrames := frameRate
		if oneSecondInFrames > 50 {
			return 50
		}
		return oneSecondInFrames
	}
	
	segmentDurationSeconds := 2
	framesPerSegment := frameRate * segmentDurationSeconds
	return framesPerSegment
}

