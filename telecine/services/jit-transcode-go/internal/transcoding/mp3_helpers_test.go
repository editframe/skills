package transcoding

import (
	"testing"
)

func TestIsMP3Url(t *testing.T) {
	tests := []struct {
		name     string
		url      string
		expected bool
	}{
		{"MP3 file lowercase", "https://example.com/song.mp3", true},
		{"MP3 file uppercase", "https://example.com/SONG.MP3", true},
		{"MP3 file mixed case", "https://example.com/Song.Mp3", true},
		{"MP4 file", "https://example.com/video.mp4", false},
		{"No extension", "https://example.com/file", false},
		{"Path with mp3 in name", "https://example.com/mp3file.wav", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := IsMP3Url(tt.url)
			if result != tt.expected {
				t.Errorf("IsMP3Url(%q) = %v, want %v", tt.url, result, tt.expected)
			}
		})
	}
}

func TestGenerateMp3ConversionCacheKey(t *testing.T) {
	url1 := "https://example.com/song1.mp3"
	url2 := "https://example.com/song2.mp3"

	key1 := GenerateMp3ConversionCacheKey(url1)
	key2 := GenerateMp3ConversionCacheKey(url2)

	if key1 == key2 {
		t.Error("Different URLs should generate different cache keys")
	}

	if key1 == "" {
		t.Error("Cache key should not be empty")
	}

	if key1 != GenerateMp3ConversionCacheKey(url1) {
		t.Error("Same URL should generate same cache key")
	}

	if !startsWith(key1, "mp3-conversions/") {
		t.Errorf("Cache key should start with 'mp3-conversions/', got: %s", key1)
	}

	if !endsWith(key1, ".mp4") {
		t.Errorf("Cache key should end with '.mp4', got: %s", key1)
	}
}

func TestValidateMp3Rendition(t *testing.T) {
	tests := []struct {
		name      string
		rendition string
		expected  bool
	}{
		{"audio rendition", "audio", true},
		{"high rendition", "high", false},
		{"medium rendition", "medium", false},
		{"low rendition", "low", false},
		{"scrub rendition", "scrub", false},
		{"invalid rendition", "invalid", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := ValidateMp3Rendition(tt.rendition)
			if result != tt.expected {
				t.Errorf("ValidateMp3Rendition(%q) = %v, want %v", tt.rendition, result, tt.expected)
			}
		})
	}
}

func startsWith(s, prefix string) bool {
	return len(s) >= len(prefix) && s[0:len(prefix)] == prefix
}

func endsWith(s, suffix string) bool {
	return len(s) >= len(suffix) && s[len(s)-len(suffix):] == suffix
}

