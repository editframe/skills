package transcoding

import (
	"crypto/md5"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/editframe/telecine/jit-transcode-go/internal/storage"
)

// IsMP3Url detects if a URL points to an MP3 file
func IsMP3Url(url string) bool {
	return strings.HasSuffix(strings.ToLower(url), ".mp3")
}

// GenerateMp3ConversionCacheKey creates a cache key for MP3 to MP4 conversion
func GenerateMp3ConversionCacheKey(originalMp3Url string) string {
	hash := md5.Sum([]byte(originalMp3Url))
	return fmt.Sprintf("mp3-conversions/%x.mp4", hash)
}

// ConvertMp3ToMp4AndCache converts an MP3 file to MP4 and caches the result
func ConvertMp3ToMp4AndCache(mp3Url string, storageProvider storage.StorageProvider) (string, error) {
	cacheKey := GenerateMp3ConversionCacheKey(mp3Url)

	exists, err := storageProvider.PathExists(cacheKey)
	if err != nil {
		return "", fmt.Errorf("failed to check cache existence: %w", err)
	}

	if exists {
		fmt.Printf("MP3 conversion cache hit: %s\n", mp3Url)
		return cacheKey, nil
	}

	fmt.Printf("Converting MP3 to MP4: %s\n", mp3Url)

	mp4Buffer, err := convertMp3ToMp4(mp3Url)
	if err != nil {
		return "", fmt.Errorf("failed to convert MP3: %w", err)
	}

	if err := storageProvider.WriteFile(cacheKey, mp4Buffer, storage.WriteOptions{
		ContentType: "video/mp4",
	}); err != nil {
		return "", fmt.Errorf("failed to cache MP3 conversion: %w", err)
	}

	fmt.Printf("Cached MP3 conversion: %s\n", cacheKey)
	return cacheKey, nil
}

// convertMp3ToMp4 performs the actual MP3 to MP4 conversion using FFmpeg
func convertMp3ToMp4(mp3Url string) ([]byte, error) {
	tmpDir := filepath.Join(os.TempDir(), "mp3-conversion")
	if err := os.MkdirAll(tmpDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create temp dir: %w", err)
	}

	hash := md5.Sum([]byte(mp3Url))
	inputPath := filepath.Join(tmpDir, fmt.Sprintf("%x-input.mp3", hash))
	outputPath := filepath.Join(tmpDir, fmt.Sprintf("%x-output.mp4", hash))

	defer os.Remove(inputPath)
	defer os.Remove(outputPath)

	if err := downloadFile(mp3Url, inputPath); err != nil {
		return nil, fmt.Errorf("failed to download MP3: %w", err)
	}

	cmd := exec.Command("ffmpeg",
		"-i", inputPath,
		"-c:a", "aac",
		"-b:a", "128k",
		"-ac", "2",
		"-ar", "48000",
		"-movflags", "+faststart",
		"-f", "mp4",
		"-y",
		outputPath,
	)

	if output, err := cmd.CombinedOutput(); err != nil {
		return nil, fmt.Errorf("ffmpeg conversion failed: %w, output: %s", err, string(output))
	}

	mp4Buffer, err := os.ReadFile(outputPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read output file: %w", err)
	}

	return mp4Buffer, nil
}

// ResolveEffectiveTranscodingUrl resolves the effective URL for transcoding
// For MP3 URLs: downloads cached MP4 to temp file and returns file path
// For other URLs: returns original URL unchanged
func ResolveEffectiveTranscodingUrl(originalUrl string, storageProvider storage.StorageProvider) (string, error) {
	if !IsMP3Url(originalUrl) {
		return originalUrl, nil
	}

	cacheKey := GenerateMp3ConversionCacheKey(originalUrl)

	exists, err := storageProvider.PathExists(cacheKey)
	if err != nil {
		return "", fmt.Errorf("failed to check cache: %w", err)
	}

	if !exists {
		return "", fmt.Errorf("MP3 conversion not found. Call manifest endpoint first: %s", originalUrl)
	}

	tmpDir := filepath.Join(os.TempDir(), "mp3-transcoding")
	if err := os.MkdirAll(tmpDir, 0755); err != nil {
		return "", fmt.Errorf("failed to create temp dir: %w", err)
	}

	hash := md5.Sum([]byte(originalUrl))
	tempFilePath := filepath.Join(tmpDir, fmt.Sprintf("%x.mp4", hash))

	info, err := os.Stat(tempFilePath)
	if err == nil {
		ageMinutes := time.Since(info.ModTime()).Minutes()
		if ageMinutes < 60 {
			fmt.Printf("Reusing cached MP4 temp file: %s\n", tempFilePath)
			return tempFilePath, nil
		}
	}

	fmt.Printf("Downloading cached MP4 for transcoding: %s -> %s\n", cacheKey, tempFilePath)

	reader, err := storageProvider.CreateReadStream(cacheKey)
	if err != nil {
		return "", fmt.Errorf("failed to read cached MP4: %w", err)
	}
	defer reader.Close()

	outFile, err := os.Create(tempFilePath)
	if err != nil {
		return "", fmt.Errorf("failed to create temp file: %w", err)
	}
	defer outFile.Close()

	if _, err := io.Copy(outFile, reader); err != nil {
		return "", fmt.Errorf("failed to copy cached MP4: %w", err)
	}

	return tempFilePath, nil
}

// ValidateMp3Rendition validates that the rendition is supported for MP3 files
func ValidateMp3Rendition(rendition string) bool {
	return rendition == "audio"
}

// downloadFile downloads a file from a URL
func downloadFile(url, filepath string) error {
	cmd := exec.Command("curl", "-L", "-o", filepath, url)
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("failed to download file: %w", err)
	}
	return nil
}

