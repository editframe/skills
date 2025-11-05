package testutil

import (
	"context"
	"fmt"
	"testing"

	"github.com/rs/zerolog"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/trace"

	"github.com/editframe/telecine/scheduler/pkg/logging"
	"github.com/editframe/telecine/scheduler/pkg/tracing"
)

// WithTestSpan wraps a test function in a root span for tracing
// Usage:
//
//	func TestMyFeature(t *testing.T) {
//	    ctx := testutil.WithTestSpan(t)
//	    // ... test code using ctx
//	}
func WithTestSpan(t *testing.T) context.Context {
	ctx, span := tracing.StartSpan(context.Background(), t.Name())

	span.SetAttributes(
		attribute.String("test.name", t.Name()),
		attribute.String("test.package", "scheduler"),
	)

	// Set up logging to output to test with trace context
	testWriter := zerolog.NewTestWriter(t)
	baseLogger := zerolog.New(testWriter).With().Timestamp().Logger()
	testLogger := tracing.LoggerWithTrace(ctx, &baseLogger)

	// Store logger in context for retrieval
	ctx = context.WithValue(ctx, testLoggerKey, &testLogger)

	t.Cleanup(func() {
		if t.Failed() {
			span.SetStatus(codes.Error, "test failed")
			span.SetAttributes(
				attribute.Bool("test.failed", true),
				attribute.String("test.status", "failed"),
			)
			// Record the failure as an event with details
			span.AddEvent("test.failed", trace.WithAttributes(
				attribute.String("test.name", t.Name()),
			))
		} else if t.Skipped() {
			span.SetStatus(codes.Ok, "test skipped")
			span.SetAttributes(
				attribute.Bool("test.skipped", true),
				attribute.String("test.status", "skipped"),
			)
		} else {
			span.SetStatus(codes.Ok, "test passed")
			span.SetAttributes(
				attribute.Bool("test.passed", true),
				attribute.String("test.status", "passed"),
			)
		}
		span.End()
	})

	return ctx
}

type contextKey string

const testLoggerKey contextKey = "testLogger"

// LoggerFromContext retrieves the test logger from context
func LoggerFromContext(ctx context.Context) *zerolog.Logger {
	if logger, ok := ctx.Value(testLoggerKey).(*zerolog.Logger); ok {
		return logger
	}
	// Fallback to the global logger (which has OTEL integration)
	return logging.Logger()
}

// StartSpan creates a child span within a test
// Usage:
//
//	ctx := testutil.WithTestSpan(t)
//	ctx, span := testutil.StartSpan(ctx, "setup-database")
//	defer span.End()
func StartSpan(ctx context.Context, name string) (context.Context, trace.Span) {
	return tracing.StartSpan(ctx, name)
}

// RecordError records an error in the current span
// Usage:
//
//	if err != nil {
//	    testutil.RecordError(ctx, err)
//	    t.Fatal(err)
//	}
func RecordError(ctx context.Context, err error) {
	span := trace.SpanFromContext(ctx)
	if span.IsRecording() {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
	}
}

// RecordErrorf records a formatted error in the current span
func RecordErrorf(ctx context.Context, format string, args ...interface{}) {
	span := trace.SpanFromContext(ctx)
	if span.IsRecording() {
		msg := attribute.String("error.message", fmt.Sprintf(format, args...))
		span.AddEvent("error", trace.WithAttributes(msg))
		span.SetStatus(codes.Error, fmt.Sprintf(format, args...))
	}
}

// Logger returns a logger configured for tests with OTEL integration
// This should be used instead of zerolog.Nop() or zerolog.New() in tests
func Logger() *zerolog.Logger {
	return logging.Logger()
}
