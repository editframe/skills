package logging

import (
	"context"
	"encoding/hex"
	"encoding/json"
	"io"
	"time"

	"go.opentelemetry.io/otel/log"
	"go.opentelemetry.io/otel/log/global"
	"go.opentelemetry.io/otel/trace"
)

// OTELWriter writes zerolog JSON output to OTEL logs
type OTELWriter struct {
	stdout io.Writer
	logger log.Logger
}

// NewOTELWriter creates a writer that sends logs to both stdout and OTEL
func NewOTELWriter(stdout io.Writer) *OTELWriter {
	return &OTELWriter{
		stdout: stdout,
		logger: global.GetLoggerProvider().Logger("zerolog"),
	}
}

func (w *OTELWriter) Write(p []byte) (n int, err error) {
	// Always write to stdout first
	n, err = w.stdout.Write(p)
	if err != nil {
		return n, err
	}

	// Parse the JSON log entry
	var logEntry map[string]interface{}
	if err := json.Unmarshal(p, &logEntry); err != nil {
		// If we can't parse, just skip OTEL (stdout still worked)
		return n, nil
	}

	// Extract fields
	message, _ := logEntry["message"].(string)
	levelStr, _ := logEntry["level"].(string)
	timeStr, _ := logEntry["time"].(string)
	traceIDStr, _ := logEntry["trace_id"].(string)
	spanIDStr, _ := logEntry["span_id"].(string)

	// Parse timestamp
	var timestamp time.Time
	if timeStr != "" {
		timestamp, _ = time.Parse(time.RFC3339Nano, timeStr)
	}
	if timestamp.IsZero() {
		timestamp = time.Now()
	}

	// Convert level
	severity := log.SeverityInfo
	switch levelStr {
	case "trace":
		severity = log.SeverityTrace
	case "debug":
		severity = log.SeverityDebug
	case "info":
		severity = log.SeverityInfo
	case "warn", "warning":
		severity = log.SeverityWarn
	case "error":
		severity = log.SeverityError
	case "fatal":
		severity = log.SeverityFatal
	case "panic":
		severity = log.SeverityFatal4
	}

	// Build log record
	var record log.Record
	record.SetTimestamp(timestamp)
	record.SetBody(log.StringValue(message))
	record.SetSeverity(severity)
	record.SetSeverityText(levelStr)

	// Add all fields as attributes
	for key, value := range logEntry {
		if key == "message" || key == "level" || key == "time" {
			continue
		}

		switch v := value.(type) {
		case string:
			record.AddAttributes(log.String(key, v))
		case float64:
			record.AddAttributes(log.Float64(key, v))
		case bool:
			record.AddAttributes(log.Bool(key, v))
		case int:
			record.AddAttributes(log.Int(key, v))
		case int64:
			record.AddAttributes(log.Int64(key, v))
		default:
			// Convert complex types to string
			if str, ok := value.(string); ok {
				record.AddAttributes(log.String(key, str))
			}
		}
	}

	// Create context with trace information if available
	ctx := context.Background()
	if traceIDStr != "" && spanIDStr != "" {
		traceIDBytes, _ := hex.DecodeString(traceIDStr)
		spanIDBytes, _ := hex.DecodeString(spanIDStr)

		if len(traceIDBytes) == 16 && len(spanIDBytes) == 8 {
			var traceID trace.TraceID
			var spanID trace.SpanID
			copy(traceID[:], traceIDBytes)
			copy(spanID[:], spanIDBytes)

			// Create a span context and add it to the context
			spanContext := trace.NewSpanContext(trace.SpanContextConfig{
				TraceID: traceID,
				SpanID:  spanID,
			})
			ctx = trace.ContextWithSpanContext(ctx, spanContext)
		}
	}

	// Emit to OTEL with trace context
	w.logger.Emit(ctx, record)

	return n, nil
}
