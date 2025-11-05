package transcoding

import (
	"fmt"

	"github.com/editframe/telecine/jit-transcode-go/internal/ffmpeg"
	"github.com/editframe/telecine/jit-transcode-go/internal/metadata"
	"github.com/editframe/telecine/jit-transcode-go/internal/mse"
	"github.com/editframe/telecine/jit-transcode-go/internal/storage"
	"github.com/editframe/telecine/jit-transcode-go/internal/utils"
)

const (
	CodecIDH264 = 27
	CodecIDAAC  = 86018
	PixelFormatYUV420P = 0
	SampleFormatFLTP   = 8
)

type VideoTranscodeOptions struct {
	InputURL          string
	SegmentID         string
	SegmentDurationMs int
	Rendition         string
	SyntheticMp4      []byte
	IsFragmented      bool
	StorageProvider   storage.StorageProvider
}

func TranscodeVideoSegment(opts VideoTranscodeOptions) ([]byte, error) {
	config, ok := RenditionConfigs[opts.Rendition]
	if !ok {
		return nil, fmt.Errorf("invalid rendition: %s", opts.Rendition)
	}

	syntheticMp4 := opts.SyntheticMp4
	if syntheticMp4 == nil && opts.StorageProvider != nil {
		var err error
		syntheticMp4, err = metadata.GetOrFetchMetadata(opts.InputURL, opts.StorageProvider)
		if err != nil {
			return nil, fmt.Errorf("failed to get metadata: %w", err)
		}
	}

	vs, err := ffmpeg.CreateVideoSourceFromBuffer(syntheticMp4)
	if err != nil {
		return nil, fmt.Errorf("failed to create video source: %w", err)
	}
	defer vs.Close()
	
	streams := vs.GetStreams()
	var videoStream *ffmpeg.StreamInfo
	for i := range streams {
		if streams[i].CodecType == "video" {
			videoStream = &streams[i]
			break
		}
	}
	
	if videoStream == nil {
		return nil, fmt.Errorf("no video stream found")
	}
	
	durationMs := vs.GetDurationMs()
	
	outputWidth, outputHeight := utils.CalculateAspectRatioDimensions(
		videoStream.Width,
		videoStream.Height,
		config.Width,
		config.Height,
	)
	
	if opts.SegmentID == "init" {
		return transcodeInitSegment(vs, videoStream, outputWidth, outputHeight, config, durationMs, opts.InputURL)
	}
	
	return transcodeMediaSegment(vs, videoStream, outputWidth, outputHeight, config, opts, durationMs)
}

func transcodeInitSegment(
	vs *ffmpeg.VideoSource,
	videoStream *ffmpeg.StreamInfo,
	outputWidth, outputHeight int,
	config RenditionConfig,
	durationMs float64,
	inputURL string,
) ([]byte, error) {
	inputPixelFormat := videoStream.PixelFormat
	if inputPixelFormat < 0 {
		inputPixelFormat = PixelFormatYUV420P
	}
	
	firstKeyframeData, err := vs.FindKeyframeAlignedByteRange(videoStream.Index, 0, 100)
	if err != nil || len(firstKeyframeData.Samples) == 0 {
		return nil, fmt.Errorf("no keyframes found for init segment")
	}
	
	firstKeyframe := firstKeyframeData.Samples[0]
	for _, sample := range firstKeyframeData.Samples {
		if sample.IsKeyframe {
			firstKeyframe = sample
			break
		}
	}
	
	initSegmentData, err := metadata.FetchByteRangeForSegment(
		inputURL,
		firstKeyframeData.StartByte,
		firstKeyframeData.EndByte,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch init segment data: %w", err)
	}
	
	decoder, err := ffmpeg.CreateDecoder(ffmpeg.DecoderOptions{
		CodecID:      videoStream.CodecID,
		MediaType:    "video",
		Width:        videoStream.Width,
		Height:       videoStream.Height,
		TimeBaseNum:  videoStream.TimeBaseNum,
		TimeBaseDen:  videoStream.TimeBaseDen,
		Extradata:    videoStream.Extradata,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create decoder: %w", err)
	}
	defer decoder.Close()
	
	filterDesc := fmt.Sprintf("scale=%d:%d,format=yuv420p", outputWidth, outputHeight)
	filter, err := ffmpeg.CreateFilter(ffmpeg.FilterOptions{
		InputWidth:        videoStream.Width,
		InputHeight:       videoStream.Height,
		InputPixelFormat:  inputPixelFormat,
		InputTimeBaseNum:  videoStream.TimeBaseNum,
		InputTimeBaseDen:  videoStream.TimeBaseDen,
		InputFrameRateNum: videoStream.FrameRateNum,
		InputFrameRateDen: videoStream.FrameRateDen,
		OutputWidth:       outputWidth,
		OutputHeight:      outputHeight,
		OutputPixelFormat: PixelFormatYUV420P,
		FilterDescription: filterDesc,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create filter: %w", err)
	}
	defer filter.Close()
	
	gopSize := CalculateOptimalGOPSize(config.FrameRate, config.Name == "scrub")
	
	encoder, err := ffmpeg.CreateEncoder(ffmpeg.EncoderOptions{
		MediaType:    "video",
		CodecID:      CodecIDH264,
		Width:        outputWidth,
		Height:       outputHeight,
		PixelFormat:  PixelFormatYUV420P,
		FrameRateNum: config.FrameRate,
		FrameRateDen: 1,
		TimeBaseNum:  1,
		TimeBaseDen:  90000,
		VideoBitrate: int64(config.VideoBitrate),
		GOPSize:      gopSize,
		MaxBFrames:   0,
		Preset:       "ultrafast",
		Profile:      "main",
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create encoder: %w", err)
	}
	defer encoder.Close()
	
	relativePos := firstKeyframe.Pos - firstKeyframeData.StartByte
	if relativePos >= 0 && relativePos+firstKeyframe.Size <= int64(len(initSegmentData)) {
		packetData := initSegmentData[relativePos : relativePos+firstKeyframe.Size]
		frames, _ := decoder.Decode(packetData, firstKeyframe.DTS, firstKeyframe.DTS)
		for _, frame := range frames {
			filteredFrames, _ := filter.FilterFrame(&frame)
			for _, filtered := range filteredFrames {
				encoder.Encode(&filtered)
				filtered.Close()
			}
			frame.Close()
		}
	}
	decoder.Flush()
	encoder.Flush()
	
	muxer, err := ffmpeg.CreateMuxer(ffmpeg.MuxerOptions{
		Format:           "mp4",
		MovFlags:         "cmaf+empty_moov+delay_moov",
		FragmentDuration: int64(GetSegmentDuration(config.Name, false)) * 1000,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create muxer: %w", err)
	}
	defer muxer.Close()
	
	if err := muxer.AddVideoStream(encoder, 1, 90000, config.FrameRate, 1); err != nil {
		return nil, fmt.Errorf("failed to add video stream: %w", err)
	}
	
	if err := muxer.WriteHeader("cmaf+empty_moov+delay_moov"); err != nil {
		return nil, fmt.Errorf("failed to write header: %w", err)
	}
	
	output, err := muxer.Finalize()
	if err != nil {
		return nil, fmt.Errorf("failed to finalize muxer: %w", err)
	}
	
	initSegment, err := mse.RepackageInitSegment(output, durationMs)
	if err != nil {
		return nil, fmt.Errorf("failed to repackage init segment: %w", err)
	}
	
	return initSegment, nil
}

func transcodeMediaSegment(
	vs *ffmpeg.VideoSource,
	videoStream *ffmpeg.StreamInfo,
	outputWidth, outputHeight int,
	config RenditionConfig,
	opts VideoTranscodeOptions,
	durationMs float64,
) ([]byte, error) {
	segmentIndex := 0
	fmt.Sscanf(opts.SegmentID, "%d", &segmentIndex)
	segmentIndex--

	segmentInfo := utils.GenerateSingleSegmentInfo(
		segmentIndex,
		durationMs,
		float64(opts.SegmentDurationMs),
		2,
		false,
		config.FrameRate,
	)
	
	extractStartMs := float64(segmentInfo.ActualStartTimeUs) / 1000.0
	extractEndMs := float64(segmentInfo.EndTimeUs+100000) / 1000.0

	if segmentInfo.IsLast {
		extractEndMs = durationMs + 100.0
	}

	byteRange, err := vs.FindKeyframeAlignedByteRange(
		videoStream.Index,
		extractStartMs,
		extractEndMs,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to find byte range: %w", err)
	}

	fmt.Printf("Fetching bytes %d-%d for segment %s (time: %.2fms-%.2fms)\n",
		byteRange.StartByte, byteRange.EndByte, opts.SegmentID, extractStartMs, extractEndMs)

	segmentData, err := metadata.FetchByteRangeForSegment(opts.InputURL, byteRange.StartByte, byteRange.EndByte)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch segment data: %w", err)
	}

	fmt.Printf("Fetched %d bytes, transcoding to %s rendition...\n", len(segmentData), opts.Rendition)

	inputPixelFormat := videoStream.PixelFormat
	if inputPixelFormat < 0 {
		inputPixelFormat = PixelFormatYUV420P
	}

	decoder, err := ffmpeg.CreateDecoder(ffmpeg.DecoderOptions{
		CodecID:      videoStream.CodecID,
		MediaType:    "video",
		Width:        videoStream.Width,
		Height:       videoStream.Height,
		TimeBaseNum:  videoStream.TimeBaseNum,
		TimeBaseDen:  videoStream.TimeBaseDen,
		Extradata:    videoStream.Extradata,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create decoder: %w", err)
	}
	defer decoder.Close()

	filterDesc := fmt.Sprintf("scale=%d:%d,format=yuv420p", outputWidth, outputHeight)
	filter, err := ffmpeg.CreateFilter(ffmpeg.FilterOptions{
		InputWidth:        videoStream.Width,
		InputHeight:       videoStream.Height,
		InputPixelFormat:  inputPixelFormat,
		InputTimeBaseNum:  videoStream.TimeBaseNum,
		InputTimeBaseDen:  videoStream.TimeBaseDen,
		InputFrameRateNum: videoStream.FrameRateNum,
		InputFrameRateDen: videoStream.FrameRateDen,
		OutputWidth:       outputWidth,
		OutputHeight:      outputHeight,
		OutputPixelFormat: PixelFormatYUV420P,
		FilterDescription: filterDesc,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create filter: %w", err)
	}
	defer filter.Close()

	gopSize := CalculateOptimalGOPSize(config.FrameRate, config.Name == "scrub")

	encoder, err := ffmpeg.CreateEncoder(ffmpeg.EncoderOptions{
		MediaType:    "video",
		CodecID:      CodecIDH264,
		Width:        outputWidth,
		Height:       outputHeight,
		PixelFormat:  PixelFormatYUV420P,
		FrameRateNum: config.FrameRate,
		FrameRateDen: 1,
		TimeBaseNum:  1,
		TimeBaseDen:  90000,
		VideoBitrate: int64(config.VideoBitrate),
		GOPSize:      gopSize,
		MaxBFrames:   0,
		Preset:       "ultrafast",
		Profile:      "main",
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create encoder: %w", err)
	}
	defer encoder.Close()

	muxer, err := ffmpeg.CreateMuxer(ffmpeg.MuxerOptions{
		Format:           "mp4",
		MovFlags:         "cmaf+empty_moov+delay_moov",
		FragmentDuration: int64(opts.SegmentDurationMs) * 1000,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create muxer: %w", err)
	}
	defer muxer.Close()

	if err := muxer.AddVideoStream(encoder, 1, 90000, config.FrameRate, 1); err != nil {
		return nil, fmt.Errorf("failed to add video stream: %w", err)
	}

	if err := muxer.WriteHeader("cmaf+empty_moov+delay_moov"); err != nil {
		return nil, fmt.Errorf("failed to write header: %w", err)
	}

	processedFrames := 0
	writtenPackets := 0
	startTimeUs := segmentInfo.StartTimeUs
	endTimeUs := segmentInfo.EndTimeUs

	if len(byteRange.Samples) == 0 {
		return nil, fmt.Errorf("no samples found in byte range")
	}


	decodedFrameCount := 0
	encodedFrameCount := 0
	
	for _, sample := range byteRange.Samples {
		relativePos := sample.Pos - byteRange.StartByte
		if relativePos < 0 || relativePos+sample.Size > int64(len(segmentData)) {
			continue
		}

		packetData := segmentData[relativePos : relativePos+sample.Size]

		frames, err := decoder.Decode(packetData, sample.DTS, sample.DTS)
		if err != nil {
			continue
		}
		
		decodedFrameCount += len(frames)

		for frameIdx, frame := range frames {
			framePtsUs := frame.PTS * 1000000 * int64(videoStream.TimeBaseNum) / int64(videoStream.TimeBaseDen)

			shouldProcess := framePtsUs >= startTimeUs
			if segmentInfo.IsLast {
				shouldProcess = shouldProcess && framePtsUs <= endTimeUs
			} else {
				shouldProcess = shouldProcess && framePtsUs < endTimeUs
			}

			if frameIdx < 3 || !shouldProcess {
				fmt.Printf("  Frame PTS=%dus (%.3fms) - startTimeUs=%dus, shouldProcess=%v\n", 
					framePtsUs, float64(framePtsUs)/1000.0, startTimeUs, shouldProcess)
			}

			if !shouldProcess {
				frame.Close()
				continue
			}

			filteredFrames, err := filter.FilterFrame(&frame)
			if err != nil {
				frame.Close()
				continue
			}

			for _, filtered := range filteredFrames {
				packets, err := encoder.Encode(&filtered)
				if err != nil {
					filtered.Close()
					continue
				}
				
				encodedFrameCount += len(packets)

				for _, pkt := range packets {
					if err := muxer.WritePacket(&pkt, 0, 1, 90000); err != nil {
						pkt.Close()
						continue
					}
					writtenPackets++
					pkt.Close()
				}

				filtered.Close()
				processedFrames++
			}

			frame.Close()
		}
	}

	flushFrames, _ := decoder.Flush()
	for _, frame := range flushFrames {
		frame.Close()
	}

	flushPackets, _ := encoder.Flush()
	flushPacketCount := len(flushPackets)
	for _, pkt := range flushPackets {
		if err := muxer.WritePacket(&pkt, 0, 1, 90000); err == nil {
			writtenPackets++
		}
		pkt.Close()
	}

	output, err := muxer.Finalize()
	if err != nil {
		return nil, fmt.Errorf("failed to finalize muxer: %w", err)
	}

	fmt.Printf("Decoded %d frames, processed %d frames, encoded %d packets during loop, wrote %d packets total (%d from flush), output size: %d bytes\n", 
		decodedFrameCount, processedFrames, encodedFrameCount, writtenPackets, flushPacketCount, len(output))

	baseDecodeTimeMs := float64(segmentInfo.StartTimeUs) / 1000.0
	sequenceNumber := segmentIndex + 1
	mediaSegment, err := mse.RepackageMediaSegment(output, sequenceNumber, baseDecodeTimeMs)
	if err != nil {
		return nil, fmt.Errorf("failed to repackage media segment: %w", err)
	}

	return mediaSegment, nil
}

