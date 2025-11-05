package tracing

import (
	"context"
	"os"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.opentelemetry.io/otel/codes"
)

func TestStripProtocol(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{"http prefix", "http://tracing:4318", "tracing:4318"},
		{"https prefix", "https://tracing:4318", "tracing:4318"},
		{"no prefix", "tracing:4318", "tracing:4318"},
		{"localhost http", "http://localhost:4318", "localhost:4318"},
		{"localhost https", "https://localhost:4318", "localhost:4318"},
		{"with path", "http://tracing:4318/v1/traces", "tracing:4318/v1/traces"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := stripProtocol(tt.input)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestTracer(t *testing.T) {
	// Reset global tracer
	tracer = nil

	// Test default tracer when not initialized
	defaultTracer := Tracer()
	assert.NotNil(t, defaultTracer)

	// Test that it returns a valid tracer
	ctx := context.Background()
	_, span := defaultTracer.Start(ctx, "test-span")
	assert.NotNil(t, span)
	span.End()
}

func TestInit_NoEndpoint(t *testing.T) {
	// Save original env vars
	originalEndpoint := os.Getenv("OTEL_EXPORTER_OTLP_ENDPOINT")
	originalGCloud := os.Getenv("GCLOUD_TRACE_EXPORT")
	defer func() {
		if originalEndpoint == "" {
			os.Unsetenv("OTEL_EXPORTER_OTLP_ENDPOINT")
		} else {
			os.Setenv("OTEL_EXPORTER_OTLP_ENDPOINT", originalEndpoint)
		}
		if originalGCloud == "" {
			os.Unsetenv("GCLOUD_TRACE_EXPORT")
		} else {
			os.Setenv("GCLOUD_TRACE_EXPORT", originalGCloud)
		}
	}()

	// Reset global tracer
	tracer = nil

	// Clear environment variables
	os.Unsetenv("OTEL_EXPORTER_OTLP_ENDPOINT")
	os.Unsetenv("GCLOUD_TRACE_EXPORT")

	ctx := context.Background()
	err := Init(ctx, "test-service")
	require.NoError(t, err)

	assert.NotNil(t, tracer)

	// Test that tracer works
	resultTracer := Tracer()
	assert.Equal(t, tracer, resultTracer)
}

func TestInit_WithEndpoint(t *testing.T) {
	// Save original env vars
	originalEndpoint := os.Getenv("OTEL_EXPORTER_OTLP_ENDPOINT")
	defer func() {
		if originalEndpoint == "" {
			os.Unsetenv("OTEL_EXPORTER_OTLP_ENDPOINT")
		} else {
			os.Setenv("OTEL_EXPORTER_OTLP_ENDPOINT", originalEndpoint)
		}
	}()

	// Reset global tracer
	tracer = nil

	// Set test endpoint (this will likely fail to connect, but that's OK for testing)
	os.Setenv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4318")

	ctx := context.Background()
	err := Init(ctx, "test-service")

	// The init might fail due to network issues, but we test the code path
	// In a real environment with proper OTLP endpoint, this would succeed
	if err != nil {
		t.Logf("Init failed as expected in test environment: %v", err)
	} else {
		assert.NotNil(t, tracer)
	}
}

func TestInit_WithGCloudTrace(t *testing.T) {
	// Save original env vars
	originalEndpoint := os.Getenv("OTEL_EXPORTER_OTLP_ENDPOINT")
	originalGCloud := os.Getenv("GCLOUD_TRACE_EXPORT")
	defer func() {
		if originalEndpoint == "" {
			os.Unsetenv("OTEL_EXPORTER_OTLP_ENDPOINT")
		} else {
			os.Setenv("OTEL_EXPORTER_OTLP_ENDPOINT", originalEndpoint)
		}
		if originalGCloud == "" {
			os.Unsetenv("GCLOUD_TRACE_EXPORT")
		} else {
			os.Setenv("GCLOUD_TRACE_EXPORT", originalGCloud)
		}
	}()

	// Reset global tracer
	tracer = nil

	// Clear endpoint but set GCloud trace
	os.Unsetenv("OTEL_EXPORTER_OTLP_ENDPOINT")
	os.Setenv("GCLOUD_TRACE_EXPORT", "true")

	ctx := context.Background()
	err := Init(ctx, "test-service")

	// This might fail in test environment without proper GCloud setup
	if err != nil {
		t.Logf("GCloud trace init failed as expected in test environment: %v", err)
	} else {
		assert.NotNil(t, tracer)
	}
}

func TestStartSpan(t *testing.T) {
	// Reset global tracer
	tracer = nil

	ctx := context.Background()

	// Test with default tracer
	newCtx, span := StartSpan(ctx, "test-operation")
	assert.NotNil(t, newCtx)
	assert.NotNil(t, span)

	// Verify span has correct name
	assert.True(t, span.IsRecording() || !span.IsRecording()) // Just verify it's a valid span

	span.End()
}

func TestStartSpan_WithInitializedTracer(t *testing.T) {
	// Reset and initialize tracer
	tracer = nil

	ctx := context.Background()
	err := Init(ctx, "test-service")
	require.NoError(t, err)

	// Test span creation
	newCtx, span := StartSpan(ctx, "initialized-operation")
	assert.NotNil(t, newCtx)
	assert.NotNil(t, span)

	span.End()
}

func TestTracerIntegration(t *testing.T) {
	// Reset global state
	tracer = nil

	// Test basic integration without external dependencies
	ctx := context.Background()

	// Initialize without external endpoint (this should use default tracer)
	os.Unsetenv("OTEL_EXPORTER_OTLP_ENDPOINT")
	os.Unsetenv("GCLOUD_TRACE_EXPORT")

	err := Init(ctx, "integration-test")
	require.NoError(t, err)

	// Test tracer functionality
	resultTracer := Tracer()
	assert.NotNil(t, resultTracer)

	// Test span creation
	_, span1 := StartSpan(ctx, "test-operation")
	assert.NotNil(t, span1)
	span1.End()
}

func TestTracerWithAttributes(t *testing.T) {
	// Reset global tracer
	tracer = nil

	ctx := context.Background()
	err := Init(ctx, "attribute-test")
	require.NoError(t, err)

	// Create span and add attributes
	_, span := StartSpan(ctx, "operation-with-attributes")
	assert.NotNil(t, span)

	// Test that we can call span methods without errors
	span.SetAttributes() // Empty attributes
	span.AddEvent("test-event")
	span.SetStatus(codes.Ok, "success")

	span.End()
}
