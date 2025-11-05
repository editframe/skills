package logging

import (
	"context"
	"io"
	"os"
	"strings"
	"time"

	"github.com/rs/zerolog"
	"go.opentelemetry.io/otel/trace"
)

var globalLogger *zerolog.Logger
var currentContext context.Context

// traceHook adds trace_id and span_id to all log entries
type traceHook struct{}

func (h traceHook) Run(e *zerolog.Event, level zerolog.Level, msg string) {
	if currentContext == nil {
		return
	}

	span := trace.SpanFromContext(currentContext)
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

func Init(serviceName string) {
	ctx := context.Background()

	// Initialize OTEL logs if endpoint is configured
	if err := InitOTEL(ctx, serviceName); err != nil {
		// Don't fail if OTEL init fails, just log to stderr
		os.Stderr.WriteString("Warning: failed to initialize OTEL logs: " + err.Error() + "\n")
	}

	logLevel := getLogLevel()

	zerolog.TimeFieldFormat = time.RFC3339Nano

	// IMPLEMENTATION GUIDELINES: Cloud Run Logging
	// Cloud Run's default log view only shows the "message" field from JSON logs.
	// To ensure critical context is visible in production:
	// 1. Always include structured fields (Str(), Int(), etc.) for queryability
	// 2. For critical errors, include key context in the message using Msgf()
	// 3. Use format: "description [key1=value1 key2=value2]" for readability
	// 4. Full JSON with all fields is available via "Show JSON" in Cloud Console

	// Use OTEL writer if available, otherwise just stdout
	var writer io.Writer = os.Stdout
	if loggerProvider != nil {
		writer = NewOTELWriter(os.Stdout)
	}

	logger := zerolog.New(writer).
		Level(logLevel).
		With().
		Timestamp().
		Str("service", serviceName).
		Logger().
		Hook(traceHook{})

	globalLogger = &logger
}

func getLogLevel() zerolog.Level {
	level := strings.ToLower(os.Getenv("PINO_LOG_LEVEL"))

	switch level {
	case "trace":
		return zerolog.TraceLevel
	case "debug":
		return zerolog.DebugLevel
	case "info":
		return zerolog.InfoLevel
	case "warn", "warning":
		return zerolog.WarnLevel
	case "error":
		return zerolog.ErrorLevel
	case "fatal":
		return zerolog.FatalLevel
	default:
		return zerolog.InfoLevel
	}
}

func Logger() *zerolog.Logger {
	if globalLogger == nil {
		Init("scheduler-go")
	}
	return globalLogger
}

func With() zerolog.Context {
	return Logger().With()
}

func Debug() *zerolog.Event {
	return Logger().Debug()
}

func Info() *zerolog.Event {
	return Logger().Info()
}

func Warn() *zerolog.Event {
	return Logger().Warn()
}

func Error() *zerolog.Event {
	return Logger().Error()
}

func Fatal() *zerolog.Event {
	return Logger().Fatal()
}
