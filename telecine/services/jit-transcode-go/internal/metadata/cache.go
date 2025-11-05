package metadata

import (
	"crypto/md5"
	"fmt"
	"io"

	"github.com/editframe/telecine/jit-transcode-go/internal/storage"
)

func GenerateMetadataCacheKey(url string) string {
	hash := md5.Sum([]byte(url))
	return fmt.Sprintf("metadata/%x.mp4", hash)
}

func GetOrFetchMetadata(url string, storageProvider storage.StorageProvider) ([]byte, error) {
	cacheKey := GenerateMetadataCacheKey(url)

	exists, err := storageProvider.PathExists(cacheKey)
	if err != nil {
		return nil, fmt.Errorf("failed to check cache: %w", err)
	}

	if exists {
		fmt.Printf("Metadata cache HIT for: %s\n", url)
		reader, err := storageProvider.CreateReadStream(cacheKey)
		if err != nil {
			return nil, fmt.Errorf("failed to read cached metadata: %w", err)
		}
		defer reader.Close()

		cached, err := io.ReadAll(reader)
		if err != nil {
			return nil, fmt.Errorf("failed to read cache stream: %w", err)
		}

		return cached, nil
	}

	fmt.Printf("Metadata cache MISS for: %s - fetching from source\n", url)

	entry, err := FetchMoovAndFtyp(url)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch metadata: %w", err)
	}

	syntheticMp4 := BuildSyntheticMp4(entry)

	if err := storageProvider.WriteFile(cacheKey, syntheticMp4, storage.WriteOptions{
		ContentType: "video/mp4",
	}); err != nil {
		fmt.Printf("Warning: failed to cache metadata: %v\n", err)
	} else {
		fmt.Printf("Cached metadata for: %s at %s\n", url, cacheKey)
	}

	return syntheticMp4, nil
}

