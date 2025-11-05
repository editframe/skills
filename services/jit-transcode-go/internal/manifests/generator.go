package manifests

import (
	"fmt"
	"math"
	"net/url"
	"strings"

	"github.com/editframe/telecine/jit-transcode-go/internal/transcoding"
)

type ManifestOptions struct {
	BaseURL          string
	Duration         float64
	SegmentDuration  float64
	VideoRenditions  []string
	AudioRenditions  []string
	SourceURL        string
}

func GenerateDashManifest(opts ManifestOptions) string {
	encodedURL := url.QueryEscape(opts.SourceURL)
	durationMs := opts.Duration * 1000
	segmentDurationMs := opts.SegmentDuration * 1000

	videoActualDurationsMs := calculateSegmentDurations(durationMs, segmentDurationMs, "video")
	audioActualDurationsMs := calculateSegmentDurations(durationMs, segmentDurationMs, "audio")

	videoRepresentations := generateVideoRepresentations(opts.BaseURL, opts.VideoRenditions, videoActualDurationsMs, encodedURL)
	audioRepresentations := generateAudioRepresentations(opts.BaseURL, opts.AudioRenditions, audioActualDurationsMs, encodedURL)

	videoAdaptationSet := ""
	if len(videoRepresentations) > 0 {
		videoAdaptationSet = fmt.Sprintf(`
    <AdaptationSet mimeType="video/mp4" segmentAlignment="true" startWithSAP="1" codecs="avc1.640029">
%s
    </AdaptationSet>`, videoRepresentations)
	}

	audioAdaptationSet := ""
	if len(audioRepresentations) > 0 {
		audioAdaptationSet = fmt.Sprintf(`
    <AdaptationSet mimeType="audio/mp4" segmentAlignment="true" startWithSAP="1" codecs="mp4a.40.2">
%s
    </AdaptationSet>`, audioRepresentations)
	}

	return fmt.Sprintf(`<?xml version="1.0" encoding="UTF-8"?>
<MPD xmlns="urn:mpeg:dash:schema:mpd:2011" 
     profiles="urn:mpeg:dash:profile:isoff-live:2011" 
     type="static" 
     mediaPresentationDuration="PT%fS" 
     minBufferTime="PT2S">
  <Period id="0" start="PT0S">
%s
%s
  </Period>
</MPD>`, opts.Duration, videoAdaptationSet, audioAdaptationSet)
}

func generateVideoRepresentations(baseURL string, renditions []string, durationsMs []float64, encodedURL string) string {
	var representations []string

	for _, rendition := range renditions {
		config, ok := transcoding.RenditionConfigs[rendition]
		if !ok {
			continue
		}

		bandwidth := config.VideoBitrate

		segmentTimeline := generateSegmentTimeline(durationsMs)

		repr := fmt.Sprintf(`      <Representation 
        id="%s" 
        bandwidth="%d" 
        width="%d" 
        height="%d" 
        frameRate="30"
        codecs="avc1.640029">
        <SegmentTemplate 
          media="%s/api/v1/transcode/%s/$Number%%05d$.m4s?url=%s"
          initialization="%s/api/v1/transcode/%s/init.m4s?url=%s"
          timescale="1000"
          startNumber="1">
          <SegmentTimeline>
            %s
          </SegmentTimeline>
        </SegmentTemplate>
      </Representation>`,
			rendition, bandwidth, config.Width, config.Height,
			baseURL, rendition, encodedURL,
			baseURL, rendition, encodedURL,
			segmentTimeline)

		representations = append(representations, repr)
	}

	return strings.Join(representations, "\n")
}

func generateAudioRepresentations(baseURL string, renditions []string, durationsMs []float64, encodedURL string) string {
	var representations []string

	for _, rendition := range renditions {
		config, ok := transcoding.RenditionConfigs[rendition]
		if !ok {
			continue
		}

		bandwidth := config.AudioBitrate

		segmentTimeline := generateSegmentTimeline(durationsMs)

		repr := fmt.Sprintf(`      <Representation 
        id="%s" 
        bandwidth="%d" 
        audioSamplingRate="48000"
        codecs="mp4a.40.2">
        <SegmentTemplate 
          media="%s/api/v1/transcode/%s/$Number%%05d$.m4s?url=%s"
          initialization="%s/api/v1/transcode/%s/init.m4s?url=%s"
          timescale="1000"
          startNumber="1">
          <SegmentTimeline>
            %s
          </SegmentTimeline>
        </SegmentTemplate>
      </Representation>`,
			rendition, bandwidth,
			baseURL, rendition, encodedURL,
			baseURL, rendition, encodedURL,
			segmentTimeline)

		representations = append(representations, repr)
	}

	return strings.Join(representations, "\n")
}

func generateSegmentTimeline(durationsMs []float64) string {
	var segments []string
	var cumulativeTimeMs float64

	for _, durationMs := range durationsMs {
		segment := fmt.Sprintf(`<S t="%d" d="%d"/>`,
			int(math.Round(cumulativeTimeMs)),
			int(math.Round(durationMs)))
		segments = append(segments, segment)
		cumulativeTimeMs += durationMs
	}

	return strings.Join(segments, "\n            ")
}

func GenerateHlsManifest(opts ManifestOptions) string {
	encodedURL := url.QueryEscape(opts.SourceURL)

	var playlists []string

	for _, rendition := range opts.VideoRenditions {
		config, ok := transcoding.RenditionConfigs[rendition]
		if !ok {
			continue
		}

		bandwidth := config.VideoBitrate
		playlist := fmt.Sprintf(`#EXT-X-STREAM-INF:BANDWIDTH=%d,RESOLUTION=%dx%d,CODECS="avc1.640029,mp4a.40.2"
%s/api/v1/transcode/%s.m3u8?url=%s`,
			bandwidth, config.Width, config.Height,
			opts.BaseURL, rendition, encodedURL)

		playlists = append(playlists, playlist)
	}

	for _, rendition := range opts.AudioRenditions {
		config, ok := transcoding.RenditionConfigs[rendition]
		if !ok {
			continue
		}

		bandwidth := config.AudioBitrate
		playlist := fmt.Sprintf(`#EXT-X-STREAM-INF:BANDWIDTH=%d,CODECS="mp4a.40.2"
%s/api/v1/transcode/%s.m3u8?url=%s`,
			bandwidth,
			opts.BaseURL, rendition, encodedURL)

		playlists = append(playlists, playlist)
	}

	return fmt.Sprintf("#EXTM3U\n#EXT-X-VERSION:6\n%s", strings.Join(playlists, "\n"))
}

func GenerateHlsQualityPlaylist(opts ManifestOptions, rendition string) string {
	encodedURL := url.QueryEscape(opts.SourceURL)
	durationMs := opts.Duration * 1000
	segmentDurationMs := opts.SegmentDuration * 1000

	config, ok := transcoding.RenditionConfigs[rendition]
	if !ok {
		return ""
	}

	mediaType := "video"
	if config.VideoBitrate == 0 {
		mediaType = "audio"
	}

	actualDurationsMs := calculateSegmentDurations(durationMs, segmentDurationMs, mediaType)

	var segments []string
	for i, durationMs := range actualDurationsMs {
		segmentNum := i + 1
		durationSec := durationMs / 1000.0
		segment := fmt.Sprintf(`#EXTINF:%.6f,
%s/api/v1/transcode/%s/%d.m4s?url=%s`,
			durationSec,
			opts.BaseURL, rendition, segmentNum, encodedURL)
		segments = append(segments, segment)
	}

	maxDuration := 0.0
	for _, d := range actualDurationsMs {
		if d > maxDuration {
			maxDuration = d
		}
	}
	targetDuration := int(math.Ceil(maxDuration / 1000.0))

	return fmt.Sprintf(`#EXTM3U
#EXT-X-VERSION:6
#EXT-X-TARGETDURATION:%d
#EXT-X-MEDIA-SEQUENCE:1
#EXT-X-PLAYLIST-TYPE:VOD
%s
#EXT-X-ENDLIST`,
		targetDuration,
		strings.Join(segments, "\n"))
}

func calculateSegmentDurations(totalDurationMs, targetSegmentDurationMs float64, mediaType string) []float64 {
	if mediaType == "video" {
		return calculateVideoSegmentDurations(totalDurationMs, targetSegmentDurationMs)
	}
	return calculateAudioSegmentDurations(totalDurationMs, targetSegmentDurationMs)
}

func calculateVideoSegmentDurations(totalDurationMs, segmentDurationMs float64) []float64 {
	frameMs := 1000.0 / 25.0
	totalSegments := int(math.Ceil(totalDurationMs / segmentDurationMs))

	durations := make([]float64, 0, totalSegments)
	for i := 0; i < totalSegments; i++ {
		targetFrames := math.Round(segmentDurationMs / frameMs)
		actualDurationMs := targetFrames * frameMs
		durations = append(durations, actualDurationMs)
	}

	return durations
}

func calculateAudioSegmentDurations(totalDurationMs, targetSegmentDurationMs float64) []float64 {
	const sampleRate = 48000.0
	const frameSize = 1024.0
	const audioFrameDurationUs = (frameSize / sampleRate) * 1000000.0

	var durations []float64
	segmentIndex := 0

	for float64(segmentIndex)*targetSegmentDurationMs < totalDurationMs {
		nominalStart := float64(segmentIndex) * targetSegmentDurationMs
		nominalEnd := float64(segmentIndex+1) * targetSegmentDurationMs

		alignedStart := getClosestAlignedTime(nominalStart * 1000.0)
		alignedEnd := getClosestAlignedTime(nominalEnd * 1000.0)

		duration := alignedEnd - alignedStart
		duration = math.Round(duration)

		if segmentIndex == 0 {
			duration += audioFrameDurationUs
		}

		isLastSegment := float64(segmentIndex+1)*targetSegmentDurationMs >= totalDurationMs
		if isLastSegment && targetSegmentDurationMs >= 2000 {
			duration += audioFrameDurationUs
		}

		durationSeconds := duration / 1_000_000.0
		durationMs := durationSeconds * 1000.0

		durations = append(durations, durationMs)
		segmentIndex++
	}

	return durations
}

func getClosestAlignedTime(targetTimeUs float64) float64 {
	const sampleRate = 48000.0
	const frameSize = 1024.0
	frameDurationUs := (frameSize / sampleRate) * 1000000.0

	decimalFrames := targetTimeUs / frameDurationUs
	nearestFrameIndex := math.Round(decimalFrames)
	return nearestFrameIndex * frameDurationUs
}

