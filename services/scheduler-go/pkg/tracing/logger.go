package tracing

import (
	"context"

	"github.com/rs/zerolog"
	"go.opentelemetry.io/otel/trace"
)

// LoggerWithTrace returns a logger with trace context fields added
// Usage:
//
//	logger := tracing.LoggerWithTrace(ctx, baseLogger)
//	logger.Info().Msg("This log will be associated with the trace")
func LoggerWithTrace(ctx context.Context, logger *zerolog.Logger) zerolog.Logger {
	span := trace.SpanFromContext(ctx)
	if !span.IsRecording() {
		return *logger
	}

	spanCtx := span.SpanContext()
	return logger.With().
		Str("trace_id", spanCtx.TraceID().String()).
		Str("span_id", spanCtx.SpanID().String()).
		Logger()
}

// Ctx returns a logger with trace context from ctx added
// This is a convenience function that works with zerolog.Logger values
func Ctx(ctx context.Context, logger zerolog.Logger) zerolog.Logger {
	span := trace.SpanFromContext(ctx)
	if !span.IsRecording() {
		return logger
	}

	spanCtx := span.SpanContext()
	if !spanCtx.HasTraceID() {
		return logger
	}

	return logger.With().
		Str("trace_id", spanCtx.TraceID().String()).
		Str("span_id", spanCtx.SpanID().String()).
		Logger()
}
