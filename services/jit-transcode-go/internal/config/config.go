package config

import (
	"os"
	"strconv"
)

type Config struct {
	Port              string
	Environment       string
	TempDir           string
	CacheDir          string
	StorageType       string
	GCSBucketName     string
	OTELServiceName   string
	OTELEndpoint      string
	EnableMemoryCache bool
	MaxMemoryCacheMB  int
}

func Load() *Config {
	cfg := &Config{
		Port:              getEnv("PORT", "3002"),
		Environment:       getEnv("NODE_ENV", "development"),
		TempDir:           getEnv("TEMP_DIR", "/app/temp"),
		StorageType:       getEnv("STORAGE_TYPE", "local"),
		GCSBucketName:     getEnv("GCS_BUCKET_NAME", ""),
		OTELServiceName:   getEnv("OTEL_SERVICE_NAME", "jit-transcode-go"),
		OTELEndpoint:      getEnv("OTEL_EXPORTER_OTLP_ENDPOINT", ""),
		EnableMemoryCache: getEnvBool("ENABLE_MEMORY_CACHE", false),
		MaxMemoryCacheMB:  getEnvInt("MAX_MEMORY_CACHE_MB", 512),
	}

	cfg.CacheDir = cfg.TempDir + "/cache"

	return cfg
}

func (c *Config) IsDevelopment() bool {
	return c.Environment == "development"
}

func (c *Config) IsProduction() bool {
	return c.Environment == "production"
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvBool(key string, defaultValue bool) bool {
	if value := os.Getenv(key); value != "" {
		parsed, err := strconv.ParseBool(value)
		if err == nil {
			return parsed
		}
	}
	return defaultValue
}

func getEnvInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		parsed, err := strconv.Atoi(value)
		if err == nil {
			return parsed
		}
	}
	return defaultValue
}

