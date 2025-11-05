package utils

import "math"

const (
	MicrosecondsPerSecond      = 1000000
	MillisecondsPerSecond      = 1000
	MicrosecondsPerMillisecond = 1000
)

const (
	SampleRate          = 48000.0
	AAC_FrameSize       = 1024.0
	AudioFrameDurationUs = (AAC_FrameSize / SampleRate) * MicrosecondsPerSecond
)

type SegmentInfo struct {
	Index            int
	StartTimeUs      int64
	EndTimeUs        int64
	IsLast           bool
	ActualStartTimeUs int64
	ActualDurationUs int64
}

func GenerateSingleSegmentInfo(
	segmentIndex int,
	durationMs float64,
	segmentDurationMs float64,
	framePaddingMultiplier int,
	isAudio bool,
	frameRate int,
) SegmentInfo {
	startTimeUs := int64(float64(segmentIndex) * segmentDurationMs * MicrosecondsPerMillisecond)
	durationUs := int64(durationMs * MicrosecondsPerMillisecond)
	
	endTimeUs := int64(math.Min(
		float64((segmentIndex+1))*segmentDurationMs*MicrosecondsPerMillisecond,
		float64(durationUs),
	))

	totalDurationSec := durationMs / MillisecondsPerSecond
	segmentDurationSec := segmentDurationMs / MillisecondsPerSecond
	isLast := segmentIndex == int(math.Ceil(totalDurationSec/segmentDurationSec))-1

	var alignedStartTime, alignedEndTime int64
	var frameDurationForPadding float64

	if isAudio {
		alignedStartTime = int64(GetClosestAlignedTimeUs(float64(startTimeUs)))
		alignedEndTime = int64(GetClosestAlignedTimeUs(float64(endTimeUs)))
		frameDurationForPadding = AudioFrameDurationUs
	} else {
		alignedStartTime = startTimeUs
		alignedEndTime = endTimeUs
		frameDurationForPadding = 1000000.0 / float64(frameRate)
	}

	realDurationUs := alignedEndTime - alignedStartTime

	startTimeWithPadding := int64(math.Max(
		float64(alignedStartTime)-frameDurationForPadding*float64(framePaddingMultiplier),
		0,
	))

	extraTimeAtBeginning := frameDurationForPadding * float64(framePaddingMultiplier)

	if segmentIndex != 0 {
		startTimeWithPadding = int64(math.Max(
			float64(startTimeWithPadding)-extraTimeAtBeginning,
			0,
		))
	}

	adjustedStartTimeUs := alignedStartTime + int64(frameDurationForPadding*float64(framePaddingMultiplier))
	
	return SegmentInfo{
		Index:            segmentIndex,
		StartTimeUs:      adjustedStartTimeUs,
		EndTimeUs:        alignedEndTime,
		IsLast:           isLast,
		ActualStartTimeUs: startTimeWithPadding,
		ActualDurationUs: realDurationUs,
	}
}

func GetClosestAlignedTimeUs(targetTimeUs float64) float64 {
	decimalFrames := targetTimeUs / AudioFrameDurationUs
	nearestFrameIndex := math.Round(decimalFrames)
	return nearestFrameIndex * AudioFrameDurationUs
}

func GetVideoFrameDurationUs(frameRateNum, frameRateDen int) float64 {
	return (float64(frameRateDen) / float64(frameRateNum)) * MicrosecondsPerSecond
}

func GetClosestVideoAlignedTimeUs(targetTimeUs float64, frameRateNum, frameRateDen int) float64 {
	frameDur := GetVideoFrameDurationUs(frameRateNum, frameRateDen)
	decimalFrames := targetTimeUs / frameDur
	nearestFrameIndex := math.Round(decimalFrames)
	return nearestFrameIndex * frameDur
}

