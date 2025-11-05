package utils

import (
	"crypto/md5"
	"fmt"
	"math"
)

// CalculateAspectRatioDimensions calculates aspect-ratio preserving dimensions
func CalculateAspectRatioDimensions(sourceWidth, sourceHeight int, targetWidth, targetHeight int) (int, int) {
	if targetWidth == 0 || targetHeight == 0 {
		return sourceWidth, sourceHeight
	}

	sourceAspectRatio := float64(sourceWidth) / float64(sourceHeight)
	isPortrait := sourceHeight > sourceWidth

	maxDimension := max(targetWidth, targetHeight)

	var finalWidth, finalHeight int

	if isPortrait {
		finalHeight = maxDimension
		finalWidth = int(math.Round(float64(finalHeight) * sourceAspectRatio))
	} else {
		finalWidth = maxDimension
		finalHeight = int(math.Round(float64(finalWidth) / sourceAspectRatio))
	}

	finalWidth = finalWidth - (finalWidth % 2)
	finalHeight = finalHeight - (finalHeight % 2)

	return finalWidth, finalHeight
}

// GenerateCacheKey creates an MD5-based cache key from a URL
func GenerateCacheKey(url string) string {
	hash := md5.Sum([]byte(url))
	return fmt.Sprintf("%x", hash)
}

// GenerateSegmentCacheKey creates a cache key for a transcoded segment
func GenerateSegmentCacheKey(url, preset string, startTimeMs int) string {
	urlHash := GenerateCacheKey(url)
	return fmt.Sprintf("cache/%s/%s/%d.m4s", urlHash, preset, startTimeMs)
}

// GenerateInitSegmentCacheKey creates a cache key for an init segment
func GenerateInitSegmentCacheKey(url, preset string) string {
	urlHash := GenerateCacheKey(url)
	return fmt.Sprintf("cache/%s/%s/init.m4s", urlHash, preset)
}

// IsAudioRendition checks if a rendition is audio-only
func IsAudioRendition(rendition string) bool {
	return rendition == "audio"
}

// IsVideoRendition checks if a rendition is video
func IsVideoRendition(rendition string) bool {
	videoRenditions := []string{"high", "medium", "low", "scrub"}
	for _, r := range videoRenditions {
		if r == rendition {
			return true
		}
	}
	return false
}

// IsScrubRendition checks if a rendition is a scrub track
func IsScrubRendition(rendition string) bool {
	return rendition == "scrub"
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

