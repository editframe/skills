package config

import (
	"fmt"
	"os"
	"strconv"
)

type Config struct {
	Port                         int
	PostgresHost                 string
	PostgresUser                 string
	PostgresPassword             string
	PostgresDB                   string
	ValkeyHost                   string
	ValkeyPort                   int
	SchedulerTickMS              int
	SchedulerScaleDownSmoothing  float64
	SchedulerPingIntervalMS      int
	SchedulerDisconnectTimeoutMS int
}

func Load() (*Config, error) {
	port := 3000
	if portStr := os.Getenv("PORT"); portStr != "" {
		p, err := strconv.Atoi(portStr)
		if err != nil {
			return nil, fmt.Errorf("invalid PORT: %w", err)
		}
		port = p
	}

	valkeyPort := 6379
	if valkeyPortStr := os.Getenv("VALKEY_PORT"); valkeyPortStr != "" {
		p, err := strconv.Atoi(valkeyPortStr)
		if err != nil {
			return nil, fmt.Errorf("invalid VALKEY_PORT: %w", err)
		}
		valkeyPort = p
	}

	return &Config{
		Port:                         port,
		PostgresHost:                 getEnv("POSTGRES_HOST", ""),
		PostgresUser:                 getEnv("POSTGRES_USER", ""),
		PostgresPassword:             getEnv("POSTGRES_PASSWORD", ""),
		PostgresDB:                   getEnv("POSTGRES_DB", ""),
		ValkeyHost:                   getEnv("VALKEY_HOST", "valkey"),
		ValkeyPort:                   valkeyPort,
		SchedulerTickMS:              getEnvInt("SCHEDULER_TICK_MS", 2000),
		SchedulerScaleDownSmoothing:  getEnvFloat("SCHEDULER_SCALE_DOWN_SMOOTHING", 0.9),
		SchedulerPingIntervalMS:      getEnvInt("SCHEDULER_PING_INTERVAL_MS", 5000),
		SchedulerDisconnectTimeoutMS: getEnvInt("SCHEDULER_DISCONNECT_TIMEOUT_MS", 30000),
	}, nil
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return defaultValue
}

func getEnvFloat(key string, defaultValue float64) float64 {
	if value := os.Getenv(key); value != "" {
		if floatValue, err := strconv.ParseFloat(value, 64); err == nil {
			return floatValue
		}
	}
	return defaultValue
}
