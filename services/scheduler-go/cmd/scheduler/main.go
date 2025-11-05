package main

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"os/signal"
	"syscall"

	_ "github.com/lib/pq"

	"github.com/editframe/telecine/scheduler/internal/config"
	"github.com/editframe/telecine/scheduler/internal/connection"
	"github.com/editframe/telecine/scheduler/internal/lifecycle"
	"github.com/editframe/telecine/scheduler/internal/queue"
	"github.com/editframe/telecine/scheduler/internal/redis"
	"github.com/editframe/telecine/scheduler/internal/scheduler"
	"github.com/editframe/telecine/scheduler/pkg/logging"
	"github.com/editframe/telecine/scheduler/pkg/tracing"
)

func main() {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	logging.Init("scheduler-go")
	logger := logging.Logger()

	if err := tracing.Init(ctx, "scheduler-go"); err != nil {
		logger.Fatal().Err(err).Msg("failed to initialize tracing")
	}

	cfg, err := config.Load()
	if err != nil {
		logger.Fatal().Err(err).Msg("failed to load config")
	}

	queues, err := queue.LoadQueues()
	if err != nil {
		logger.Fatal().Err(err).Msg("failed to load queues")
	}

	logger.Info().Int("queue_count", len(queues)).Msg("loaded queues")
	for _, q := range queues {
		logger.Info().
			Str("queue_name", q.Name).
			Str("websocket_host", q.WebSocketHost).
			Int("max_worker_count", q.MaxWorkerCount).
			Int("worker_concurrency", q.WorkerConcurrency).
			Msg("queue configuration")
	}

	// Start HTTP server immediately for health checks
	server := scheduler.NewServer(cfg.Port, logger)
	go func() {
		if err := server.Start(ctx); err != nil {
			logger.Error().Err(err).Msg("server error")
		}
	}()

	logger.Info().
		Int("port", cfg.Port).
		Msg("health check server started, connecting to dependencies...")

	logger.Info().
		Str("valkeyHost", cfg.ValkeyHost).
		Int("valkeyPort", cfg.ValkeyPort).
		Msg("attempting to connect to redis")

	redisClient, err := redis.NewClient(cfg.ValkeyHost, cfg.ValkeyPort)
	if err != nil {
		logger.Fatal().
			Err(err).
			Str("valkeyHost", cfg.ValkeyHost).
			Int("valkeyPort", cfg.ValkeyPort).
			Msg("failed to connect to redis")
	}

	logger.Info().Msg("successfully connected to redis")

	// Initialize PostgreSQL database connection
	dbConnString := fmt.Sprintf("host=%s user=%s password=%s dbname=%s sslmode=disable",
		cfg.PostgresHost, cfg.PostgresUser, cfg.PostgresPassword, cfg.PostgresDB)

	db, err := sql.Open("postgres", dbConnString)
	if err != nil {
		logger.Fatal().Err(err).Msg("failed to connect to database")
	}
	defer db.Close()

	// Test database connection
	if err := db.Ping(); err != nil {
		logger.Fatal().Err(err).Msg("failed to ping database")
	}

	logger.Info().Msg("successfully connected to database")

	coordinator, err := scheduler.NewCoordinator(redisClient, logger)
	if err != nil {
		logger.Fatal().Err(err).Msg("failed to create coordinator")
	}

	connection.SetTimeouts(cfg.SchedulerPingIntervalMS, cfg.SchedulerDisconnectTimeoutMS)
	logger.Info().
		Int("pingIntervalMS", cfg.SchedulerPingIntervalMS).
		Int("disconnectTimeoutMS", cfg.SchedulerDisconnectTimeoutMS).
		Msg("configured connection timeouts")

	stateMachine := connection.NewStateMachine(coordinator.ID(), redisClient, logger)

	reconciler := scheduler.NewReconciler(
		coordinator,
		stateMachine,
		redisClient,
		queues,
		logger,
		cfg.SchedulerTickMS,
		cfg.SchedulerScaleDownSmoothing,
	)
	logger.Info().
		Int("tickMS", cfg.SchedulerTickMS).
		Float64("scaleDownSmoothing", cfg.SchedulerScaleDownSmoothing).
		Msg("created reconciler")

	// Set reconciler on server so it can expose scaling info
	server.SetReconciler(reconciler)

	stalledCleanup := scheduler.NewStalledJobCleanup(redisClient, queues, logger)
	logger.Info().Msg("created stalled cleanup")

	// Initialize lifecycle consumer with database connection
	consumer := lifecycle.NewConsumer(redisClient, coordinator.ID(), db, logger)

	go coordinator.Start(ctx)
	logger.Info().Msg("started coordinator")
	go reconciler.Start(ctx)
	logger.Info().Msg("started reconciler")
	go stalledCleanup.Start(ctx)
	logger.Info().Msg("started stalled cleanup")
	go consumer.Start(ctx)
	logger.Info().Msg("started consumer")

	logger.Info().
		Str("schedulerID", coordinator.ID()).
		Int("port", cfg.Port).
		Int("queues", len(queues)).
		Msg("scheduler started")

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, os.Interrupt, syscall.SIGTERM, syscall.SIGINT)

	<-sigCh
	logger.Info().Msg("received shutdown signal")

	cancel()

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 30*1000000000)
	defer shutdownCancel()

	if err := coordinator.Stop(shutdownCtx); err != nil {
		logger.Error().Err(err).Msg("error stopping coordinator")
	}

	reconciler.Stop()
	stalledCleanup.Stop()
	consumer.Stop()

	if err := server.Shutdown(shutdownCtx); err != nil {
		logger.Error().Err(err).Msg("error shutting down server")
	}

	logger.Info().Msg("scheduler stopped")
}
