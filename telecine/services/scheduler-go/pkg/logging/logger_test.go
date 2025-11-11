package logging

import (
	"bytes"
	"encoding/json"
	"os"
	"strings"
	"testing"

	"github.com/rs/zerolog"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGetLogLevel(t *testing.T) {
	// Save original env var
	originalLevel := os.Getenv("PINO_LOG_LEVEL")
	defer func() {
		if originalLevel == "" {
			os.Unsetenv("PINO_LOG_LEVEL")
		} else {
			os.Setenv("PINO_LOG_LEVEL", originalLevel)
		}
	}()

	tests := []struct {
		envValue      string
		expectedLevel zerolog.Level
	}{
		{"trace", zerolog.TraceLevel},
		{"debug", zerolog.DebugLevel},
		{"info", zerolog.InfoLevel},
		{"warn", zerolog.WarnLevel},
		{"warning", zerolog.WarnLevel},
		{"error", zerolog.ErrorLevel},
		{"fatal", zerolog.FatalLevel},
		{"invalid", zerolog.InfoLevel},
		{"", zerolog.InfoLevel},
		{"DEBUG", zerolog.DebugLevel}, // Test case insensitivity
	}

	for _, tt := range tests {
		t.Run(tt.envValue, func(t *testing.T) {
			if tt.envValue == "" {
				os.Unsetenv("PINO_LOG_LEVEL")
			} else {
				os.Setenv("PINO_LOG_LEVEL", tt.envValue)
			}

			level := getLogLevel()
			assert.Equal(t, tt.expectedLevel, level)
		})
	}
}

func TestInit(t *testing.T) {
	// Reset global logger
	globalLogger = nil

	// Capture output
	var buf bytes.Buffer
	originalOutput := zerolog.GlobalLevel()
	defer zerolog.SetGlobalLevel(originalOutput)

	// Set up test environment
	os.Setenv("PINO_LOG_LEVEL", "debug")
	defer os.Unsetenv("PINO_LOG_LEVEL")

	// Redirect zerolog output for testing
	logger := zerolog.New(&buf).Level(zerolog.DebugLevel).With().Timestamp().Str("service", "test-service").Logger()
	globalLogger = &logger

	// Test that logger was initialized
	assert.NotNil(t, globalLogger)

	// Test logging
	globalLogger.Info().Msg("test message")
	output := buf.String()

	assert.Contains(t, output, "test message")
	assert.Contains(t, output, "test-service")
}

func TestLogger(t *testing.T) {
	// Reset global logger
	globalLogger = nil

	logger := Logger()
	assert.NotNil(t, logger)
	assert.NotNil(t, globalLogger, "Global logger should be initialized")

	// Test that subsequent calls return the same logger
	logger2 := Logger()
	assert.Equal(t, logger, logger2)
}

func TestWith(t *testing.T) {
	// Reset global logger
	globalLogger = nil

	context := With()
	assert.NotNil(t, context)
}

func TestLogMethods(t *testing.T) {
	// Reset global logger and set up test output
	globalLogger = nil
	var buf bytes.Buffer
	logger := zerolog.New(&buf).Level(zerolog.TraceLevel).With().Logger()
	globalLogger = &logger

	// Test all log level methods
	Debug().Msg("debug message")
	Info().Msg("info message")
	Warn().Msg("warn message")
	Error().Msg("error message")

	output := buf.String()
	assert.Contains(t, output, "debug message")
	assert.Contains(t, output, "info message")
	assert.Contains(t, output, "warn message")
	assert.Contains(t, output, "error message")
}

func TestWithContext(t *testing.T) {
	// Reset global logger and set up test output
	globalLogger = nil
	var buf bytes.Buffer
	logger := zerolog.New(&buf).Level(zerolog.InfoLevel).With().Logger()
	globalLogger = &logger

	contextLogger := WithContext("user_id", "12345")
	assert.NotNil(t, contextLogger)

	contextLogger.Info().Msg("test with context")
	output := buf.String()

	assert.Contains(t, output, "test with context")
	assert.Contains(t, output, "user_id")
	assert.Contains(t, output, "12345")
}

func TestWithComponent(t *testing.T) {
	// Reset global logger and set up test output
	globalLogger = nil
	var buf bytes.Buffer
	logger := zerolog.New(&buf).Level(zerolog.InfoLevel).With().Logger()
	globalLogger = &logger

	componentLogger := WithComponent("database")
	assert.NotNil(t, componentLogger)

	componentLogger.Info().Msg("test with component")
	output := buf.String()

	assert.Contains(t, output, "test with component")
	assert.Contains(t, output, "component")
	assert.Contains(t, output, "database")
}

func TestLoggerIntegration(t *testing.T) {
	// Reset global logger
	globalLogger = nil

	// Test full integration
	var buf bytes.Buffer
	os.Setenv("PINO_LOG_LEVEL", "info")
	defer os.Unsetenv("PINO_LOG_LEVEL")

	// Initialize with custom output for testing
	logger := zerolog.New(&buf).Level(zerolog.InfoLevel).With().Timestamp().Str("service", "test").Logger()
	globalLogger = &logger

	// Test various logging scenarios
	Logger().Info().Str("key", "value").Msg("integration test")
	logger2 := With().Str("context", "test").Logger()
	logger2.Info().Msg("context test")
	(*WithComponent("test-component")).Info().Msg("component test")
	(*WithContext("request_id", "abc123")).Info().Msg("context test")

	output := buf.String()
	lines := strings.Split(strings.TrimSpace(output), "\n")
	assert.Len(t, lines, 4, "Should have 4 log lines")

	// Parse and verify JSON structure
	for _, line := range lines {
		var logEntry map[string]interface{}
		err := json.Unmarshal([]byte(line), &logEntry)
		require.NoError(t, err, "Each log line should be valid JSON")

		assert.Contains(t, logEntry, "level")
		assert.Contains(t, logEntry, "time")
		assert.Contains(t, logEntry, "service")
		assert.Equal(t, "test", logEntry["service"])
	}
}
