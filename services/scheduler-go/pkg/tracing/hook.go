package tracing

import (
	"context"

	"github.com/rs/zerolog"
	"go.opentelemetry.io/otel/trace"
)

// Hook is a zerolog hook that automatically adds trace context to log entries
type Hook struct {
	ctx context.Context
}

// NewHook creates a new tracing hook with the given context
func NewHook(ctx context.Context) *Hook {
	return &Hook{ctx: ctx}
}

// Run implements zerolog.Hook interface
func (h *Hook) Run(e *zerolog.Event, level zerolog.Level, msg string) {
	if h.ctx == nil {
		return
	}

	span := trace.SpanFromContext(h.ctx)
	if !span.IsRecording() {
		return
	}

	spanCtx := span.SpanContext()
	if spanCtx.HasTraceID() {
		e.Str("trace_id", spanCtx.TraceID().String())
	}
	if spanCtx.HasSpanID() {
		e.Str("span_id", spanCtx.SpanID().String())
	}
}

// ContextHook is a zerolog hook that extracts trace context from a context provider
type ContextHook struct {
	getContext func() context.Context
}

// NewContextHook creates a hook that calls getContext() for each log entry
// This is useful when the context changes frequently (e.g., per-request)
func NewContextHook(getContext func() context.Context) *ContextHook {
	return &ContextHook{getContext: getContext}
}

// Run implements zerolog.Hook interface
func (h *ContextHook) Run(e *zerolog.Event, level zerolog.Level, msg string) {
	if h.getContext == nil {
		return
	}

	ctx := h.getContext()
	if ctx == nil {
		return
	}

	span := trace.SpanFromContext(ctx)
	if !span.IsRecording() {
		return
	}

	spanCtx := span.SpanContext()
	if spanCtx.HasTraceID() {
		e.Str("trace_id", spanCtx.TraceID().String())
	}
	if spanCtx.HasSpanID() {
		e.Str("span_id", spanCtx.SpanID().String())
	}
}
