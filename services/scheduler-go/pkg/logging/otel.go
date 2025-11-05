package logging

import (
	"context"
	"os"
	"strings"

	"go.opentelemetry.io/contrib/bridges/otelzerolog"
	"go.opentelemetry.io/otel/exporters/otlp/otlplog/otlploghttp"
	"go.opentelemetry.io/otel/log/global"
	"go.opentelemetry.io/otel/sdk/log"
	"go.opentelemetry.io/otel/sdk/resource"
	semconv "go.opentelemetry.io/otel/semconv/v1.4.0"
)

var loggerProvider *log.LoggerProvider

// InitOTEL initializes OTEL log export
func InitOTEL(ctx context.Context, serviceName string) error {
	endpoint := os.Getenv("OTEL_EXPORTER_OTLP_ENDPOINT")
	if endpoint == "" {
		return nil // No OTEL endpoint configured
	}

	// Use OTEL_SERVICE_NAME if set
	if envServiceName := os.Getenv("OTEL_SERVICE_NAME"); envServiceName != "" {
		serviceName = envServiceName
	}

	// Strip http:// or https:// prefix
	endpoint = stripProtocol(endpoint)

	exporter, err := otlploghttp.New(ctx,
		otlploghttp.WithEndpoint(endpoint),
		otlploghttp.WithInsecure(),
	)
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

	// Use simple processor for immediate sending (batch processor might delay)
	processor := log.NewSimpleProcessor(exporter)
	provider := log.NewLoggerProvider(
		log.WithResource(res),
		log.WithProcessor(processor),
	)

	global.SetLoggerProvider(provider)
	loggerProvider = provider

	return nil
}

// ShutdownOTEL shuts down the OTEL log provider
func ShutdownOTEL(ctx context.Context) error {
	if loggerProvider != nil {
		return loggerProvider.Shutdown(ctx)
	}
	return nil
}

func stripProtocol(endpoint string) string {
	endpoint = strings.TrimPrefix(endpoint, "http://")
	endpoint = strings.TrimPrefix(endpoint, "https://")
	return endpoint
}

// GetOTELHook returns an otelzerolog hook for sending logs to OTEL
func GetOTELHook() *otelzerolog.Hook {
	if loggerProvider == nil {
		return nil
	}

	return otelzerolog.NewHook("zerolog",
		otelzerolog.WithLoggerProvider(global.GetLoggerProvider()))
}
