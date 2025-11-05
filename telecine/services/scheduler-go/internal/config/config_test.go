package config

import (
	"os"
	"testing"

	"github.com/editframe/telecine/scheduler/internal/testutil"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestLoad(t *testing.T) {
	_ = testutil.WithTestSpan(t)
	// Save original env vars
	originalEnvVars := map[string]string{
		"PORT":              os.Getenv("PORT"),
		"POSTGRES_HOST":     os.Getenv("POSTGRES_HOST"),
		"POSTGRES_USER":     os.Getenv("POSTGRES_USER"),
		"POSTGRES_PASSWORD": os.Getenv("POSTGRES_PASSWORD"),
		"POSTGRES_DB":       os.Getenv("POSTGRES_DB"),
		"VALKEY_HOST":       os.Getenv("VALKEY_HOST"),
		"VALKEY_PORT":       os.Getenv("VALKEY_PORT"),
	}

	// Clean up after test
	defer func() {
		for key, value := range originalEnvVars {
			if value == "" {
				os.Unsetenv(key)
			} else {
				os.Setenv(key, value)
			}
		}
	}()

	t.Run("default values", func(t *testing.T) {
		// Clear all env vars
		for key := range originalEnvVars {
			os.Unsetenv(key)
		}

		config, err := Load()
		require.NoError(t, err)

		assert.Equal(t, 3000, config.Port)
		assert.Equal(t, "", config.PostgresHost)
		assert.Equal(t, "", config.PostgresUser)
		assert.Equal(t, "", config.PostgresPassword)
		assert.Equal(t, "", config.PostgresDB)
		assert.Equal(t, "valkey", config.ValkeyHost)
		assert.Equal(t, 6379, config.ValkeyPort)
	})

	t.Run("custom values", func(t *testing.T) {
		os.Setenv("PORT", "8080")
		os.Setenv("POSTGRES_HOST", "test-postgres")
		os.Setenv("POSTGRES_USER", "test-user")
		os.Setenv("POSTGRES_PASSWORD", "test-password")
		os.Setenv("POSTGRES_DB", "test-db")
		os.Setenv("VALKEY_HOST", "test-valkey")
		os.Setenv("VALKEY_PORT", "6380")

		config, err := Load()
		require.NoError(t, err)

		assert.Equal(t, 8080, config.Port)
		assert.Equal(t, "test-postgres", config.PostgresHost)
		assert.Equal(t, "test-user", config.PostgresUser)
		assert.Equal(t, "test-password", config.PostgresPassword)
		assert.Equal(t, "test-db", config.PostgresDB)
		assert.Equal(t, "test-valkey", config.ValkeyHost)
		assert.Equal(t, 6380, config.ValkeyPort)
	})

	t.Run("invalid port", func(t *testing.T) {
		os.Setenv("PORT", "invalid")

		_, err := Load()
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "invalid PORT")
	})

	t.Run("invalid valkey port", func(t *testing.T) {
		os.Unsetenv("PORT") // Use default port
		os.Setenv("VALKEY_PORT", "invalid")

		_, err := Load()
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "invalid VALKEY_PORT")
	})
}

func TestGetEnv(t *testing.T) {
	_ = testutil.WithTestSpan(t)
	t.Run("existing env var", func(t *testing.T) {
		os.Setenv("TEST_VAR", "test-value")
		defer os.Unsetenv("TEST_VAR")

		result := getEnv("TEST_VAR", "default")
		assert.Equal(t, "test-value", result)
	})

	t.Run("missing env var", func(t *testing.T) {
		os.Unsetenv("MISSING_VAR")

		result := getEnv("MISSING_VAR", "default")
		assert.Equal(t, "default", result)
	})

	t.Run("empty env var", func(t *testing.T) {
		os.Setenv("EMPTY_VAR", "")
		defer os.Unsetenv("EMPTY_VAR")

		result := getEnv("EMPTY_VAR", "default")
		assert.Equal(t, "default", result)
	})
}
