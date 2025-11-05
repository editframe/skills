package tracing

import (
	"context"
	"os"
	"strings"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp"
	"go.opentelemetry.io/otel/sdk/resource"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.4.0"
	"go.opentelemetry.io/otel/trace"
)

var tracer trace.Tracer
var tracerProvider *sdktrace.TracerProvider

func stripProtocol(endpoint string) string {
	endpoint = strings.TrimPrefix(endpoint, "http://")
	endpoint = strings.TrimPrefix(endpoint, "https://")
	return endpoint
}

func Init(ctx context.Context, serviceName string) error {
	// Use OTEL_SERVICE_NAME if set, otherwise use provided serviceName
	if envServiceName := os.Getenv("OTEL_SERVICE_NAME"); envServiceName != "" {
		serviceName = envServiceName
	}

	endpoint := os.Getenv("OTEL_EXPORTER_OTLP_ENDPOINT")

	if endpoint == "" && os.Getenv("GCLOUD_TRACE_EXPORT") != "true" {
		// No endpoint configured, but still initialize a no-op tracer
		tracer = otel.Tracer(serviceName)
		return nil
	}

	var exporter sdktrace.SpanExporter
	var err error

	if endpoint != "" {
		// Strip http:// or https:// prefix as WithEndpoint expects only host:port
		endpoint = stripProtocol(endpoint)
		exporter, err = otlptracehttp.New(ctx,
			otlptracehttp.WithEndpoint(endpoint),
			otlptracehttp.WithInsecure(),
		)
	} else {
		exporter, err = otlptracehttp.New(ctx)
	}

	if err != nil {
		return err
	}

	res, err := resource.New(ctx,
		resource.WithAttributes(
			semconv.ServiceNameKey.String(serviceName),
		),
	)
	if err != nil {
		return err
	}

	tp := sdktrace.NewTracerProvider(
		sdktrace.WithBatcher(exporter),
		sdktrace.WithResource(res),
		sdktrace.WithSampler(sdktrace.AlwaysSample()),
	)

	otel.SetTracerProvider(tp)
	tracer = tp.Tracer(serviceName)
	tracerProvider = tp

	return nil
}

func Shutdown(ctx context.Context) error {
	if tracerProvider != nil {
		return tracerProvider.Shutdown(ctx)
	}
	return nil
}

func Tracer() trace.Tracer {
	if tracer == nil {
		return otel.Tracer("scheduler-go")
	}
	return tracer
}

func StartSpan(ctx context.Context, name string) (context.Context, trace.Span) {
	return Tracer().Start(ctx, name)
}
