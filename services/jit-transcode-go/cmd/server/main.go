package main

import (
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/editframe/telecine/jit-transcode-go/internal/config"
	"github.com/editframe/telecine/jit-transcode-go/internal/handlers"
	"github.com/editframe/telecine/jit-transcode-go/internal/storage"
)

func main() {
	fmt.Println("LAUNCHED JIT TRANSCODING SERVER (Go)")

	cfg := config.Load()

	if err := os.MkdirAll(cfg.TempDir, 0755); err != nil {
		log.Fatalf("Failed to create temp directory: %v", err)
	}

	if err := os.MkdirAll(cfg.CacheDir, 0755); err != nil {
		log.Fatalf("Failed to create cache directory: %v", err)
	}

	var storageProvider storage.StorageProvider
	if cfg.StorageType == "gcs" && cfg.GCSBucketName != "" {
		gcsStorage, err := storage.NewGCSStorage(cfg.GCSBucketName)
		if err != nil {
			log.Fatalf("Failed to create GCS storage: %v", err)
		}
		storageProvider = gcsStorage
		fmt.Printf("Using GCS storage: %s\n", cfg.GCSBucketName)
	} else {
		storageProvider = storage.NewLocalStorage(cfg.CacheDir)
		fmt.Printf("Using local storage: %s\n", cfg.CacheDir)
	}

	server := handlers.NewServer(storageProvider)

	addr := fmt.Sprintf(":%s", cfg.Port)
	fmt.Printf("Server starting on %s\n", addr)
	fmt.Printf("Environment: %s\n", cfg.Environment)
	fmt.Printf("Health check: http://localhost:%s/health\n", cfg.Port)
	fmt.Printf("Temp directory: %s\n", cfg.TempDir)
	fmt.Printf("Cache directory: %s\n", cfg.CacheDir)

	if cfg.EnableMemoryCache {
		fmt.Printf("Memory cache: enabled (%d MB max)\n", cfg.MaxMemoryCacheMB)
	}

	if err := http.ListenAndServe(addr, server); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}

