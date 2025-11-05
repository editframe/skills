package config

import (
	"context"
	"fmt"
	"os"
	"testing"
	"time"

	"github.com/editframe/telecine/scheduler/pkg/logging"
	"github.com/editframe/telecine/scheduler/pkg/tracing"
)

func TestMain(m *testing.M) {
	ctx := context.Background()

	if err := tracing.Init(ctx, "scheduler-go-tests"); err != nil {
		fmt.Fprintf(os.Stderr, "Warning: failed to initialize tracing: %v\n", err)
	}

	if err := logging.InitOTEL(ctx, "scheduler-go-tests"); err != nil {
		fmt.Fprintf(os.Stderr, "Warning: failed to initialize OTEL logs: %v\n", err)
	}

	code := m.Run()

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := logging.ShutdownOTEL(shutdownCtx); err != nil {
		fmt.Fprintf(os.Stderr, "Warning: failed to shutdown OTEL logs: %v\n", err)
	}

	if err := tracing.Shutdown(shutdownCtx); err != nil {
		fmt.Fprintf(os.Stderr, "Warning: failed to shutdown tracer: %v\n", err)
	}

	os.Exit(code)
}
