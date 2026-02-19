package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"github.com/rs/zerolog"

	"github.com/editframe/telecine/scheduler-go/internal/claim"
	"github.com/editframe/telecine/scheduler-go/internal/health"
	"github.com/editframe/telecine/scheduler-go/internal/pool"
	"github.com/editframe/telecine/scheduler-go/internal/queue"
	"github.com/editframe/telecine/scheduler-go/internal/reconciler"
)

func main() {
	logger := zerolog.New(os.Stdout).With().Timestamp().Logger()
	logger.Info().Msg("scheduler starting")

	valkeyHost := envOr("VALKEY_HOST", "valkey")
	valkeyPort := envOr("VALKEY_PORT", "6379")
	port := envOr("PORT", "3000")
	instanceID := uuid.New().String()

	logger.Info().
		Str("instanceID", instanceID).
		Str("valkey", fmt.Sprintf("%s:%s", valkeyHost, valkeyPort)).
		Msg("config")

	client := redis.NewClient(&redis.Options{
		Addr: fmt.Sprintf("%s:%s", valkeyHost, valkeyPort),
	})

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Verify Valkey connectivity
	if err := client.Ping(ctx).Err(); err != nil {
		logger.Fatal().Err(err).Msg("failed to connect to Valkey")
	}
	logger.Info().Msg("connected to Valkey")

	queues := queue.LoadQueues(&logger)
	if len(queues) == 0 {
		logger.Fatal().Msg("no queues configured — set WORKER_URL_<QUEUE> env vars")
	}

	// Create connection pools
	pools := make(map[string]*pool.Pool, len(queues))
	for _, q := range queues {
		pools[q.Name] = pool.New(q.Name, q.URL, logger)
	}

	// Create claim manager
	queueNames := make([]string, len(queues))
	for i, q := range queues {
		queueNames[i] = q.Name
	}
	claimMgr := claim.NewManager(instanceID, client, queueNames, logger)
	claimMgr.Start(ctx)

	// Create and start reconciler
	rec := reconciler.New(client, claimMgr, queues, pools, logger)
	go rec.Run(ctx)

	// HTTP server for health checks
	handler := health.NewHandler(queues, pools)
	srv := &http.Server{
		Addr:    ":" + port,
		Handler: handler,
	}

	go func() {
		logger.Info().Str("port", port).Msg("HTTP server listening")
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Fatal().Err(err).Msg("HTTP server error")
		}
	}()

	// Wait for shutdown signal
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGTERM, syscall.SIGINT)
	sig := <-sigCh
	logger.Info().Str("signal", sig.String()).Msg("shutting down")

	// Graceful shutdown
	cancel()

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()

	claimMgr.Stop(shutdownCtx)
	rec.CloseAll()
	srv.Shutdown(shutdownCtx)

	logger.Info().Msg("scheduler stopped")
}

func envOr(key, defaultVal string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return defaultVal
}
