package transcoding

import (
	"fmt"

	"github.com/editframe/telecine/jit-transcode-go/internal/ffmpeg"
	"github.com/editframe/telecine/jit-transcode-go/internal/storage"
)

type Service struct {
	storage storage.StorageProvider
}

func NewService(storage storage.StorageProvider) *Service {
	return &Service{storage: storage}
}

func (s *Service) DetectAvailableTracks(syntheticMp4 []byte) (hasAudio bool, hasVideo bool, err error) {
	vs, err := ffmpeg.CreateVideoSourceFromBuffer(syntheticMp4)
	if err != nil {
		return false, false, fmt.Errorf("failed to create video source: %w", err)
	}
	defer vs.Close()

	return vs.DetectAvailableTracks()
}

func (s *Service) GetFileDuration(syntheticMp4 []byte) (float64, error) {
	vs, err := ffmpeg.CreateVideoSourceFromBuffer(syntheticMp4)
	if err != nil {
		return 0, fmt.Errorf("failed to create video source: %w", err)
	}
	defer vs.Close()

	return vs.GetDurationMs() / 1000.0, nil
}

func (s *Service) GetStreamInfo(syntheticMp4 []byte) ([]ffmpeg.StreamInfo, error) {
	vs, err := ffmpeg.CreateVideoSourceFromBuffer(syntheticMp4)
	if err != nil {
		return nil, fmt.Errorf("failed to create video source: %w", err)
	}
	defer vs.Close()

	return vs.GetStreams(), nil
}

type TranscodeSegmentRequest struct {
	InputURL        string
	Rendition       string
	SegmentID       string
	SegmentDurationMs int
	IsFragmented    bool
	SyntheticMp4    []byte
}

type TranscodeSegmentResult struct {
	Data            []byte
	TranscodeTimeMs int64
	CacheHit        bool
}

func (s *Service) TranscodeSegment(req TranscodeSegmentRequest) (*TranscodeSegmentResult, error) {
	opts := VideoTranscodeOptions{
		InputURL:          req.InputURL,
		SegmentID:         req.SegmentID,
		SegmentDurationMs: req.SegmentDurationMs,
		Rendition:         req.Rendition,
		SyntheticMp4:      req.SyntheticMp4,
		IsFragmented:      req.IsFragmented,
		StorageProvider:   s.storage,
	}
	
	data, err := TranscodeVideoSegment(opts)
	if err != nil {
		return nil, fmt.Errorf("transcoding failed: %w", err)
	}
	
	return &TranscodeSegmentResult{
		Data:            data,
		TranscodeTimeMs: 0,
		CacheHit:        false,
	}, nil
}

