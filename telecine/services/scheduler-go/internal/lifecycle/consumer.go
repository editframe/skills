package lifecycle

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/rs/zerolog"

	redisclient "github.com/editframe/telecine/scheduler/internal/redis"
)

const (
	StreamKey     = "lifecycle:jobs"
	ConsumerGroup = "default"
	BatchSize     = 1000
	BlockTimeMS   = 250
)

type Consumer struct {
	client     *redisclient.Client
	consumerID string
	logger     *zerolog.Logger
	registry   *Registry
	stopCh     chan struct{}
	wg         sync.WaitGroup
	started    bool
	startedMu  sync.Mutex
}

func NewConsumer(client *redisclient.Client, consumerID string, db *sql.DB, logger *zerolog.Logger) *Consumer {
	dbUpdater := NewDatabaseUpdater(db, logger)
	registry := NewRegistry(dbUpdater, logger)

	return &Consumer{
		client:     client,
		consumerID: consumerID,
		logger:     logger,
		registry:   registry,
		stopCh:     make(chan struct{}),
	}
}

func (c *Consumer) Start(ctx context.Context) error {
	c.startedMu.Lock()
	defer c.startedMu.Unlock()

	if c.started {
		c.logger.Warn().Msg("consumer already started")
		return nil
	}

	if err := c.initialize(ctx); err != nil {
		return err
	}

	c.started = true
	c.wg.Add(1)
	go c.consumeLoop(ctx)
	return nil
}

func (c *Consumer) consumeLoop(ctx context.Context) {
	defer c.wg.Done()

	c.logger.Info().Msg("Starting lifecycle consumer loop")

	for {
		select {
		case <-ctx.Done():
			c.logger.Info().Msg("Consumer loop stopping due to context cancellation")
			return
		case <-c.stopCh:
			c.logger.Info().Msg("Consumer loop stopping due to stop signal")
			return
		case <-time.After(BlockTimeMS * time.Millisecond):
			if err := c.processMessages(ctx); err != nil {
				c.logger.Error().Err(err).Msg("failed to process messages")
			}
		}
	}
}

func (c *Consumer) Stop() {
	c.startedMu.Lock()
	if !c.started {
		c.startedMu.Unlock()
		return
	}
	c.startedMu.Unlock()

	close(c.stopCh)
	c.wg.Wait()
}

func (c *Consumer) initialize(ctx context.Context) error {
	c.logger.Info().
		Str("stream", StreamKey).
		Str("consumerGroup", ConsumerGroup).
		Msg("Initializing consumer group")

	_, err := c.client.XGroupCreateMkStream(ctx, StreamKey, ConsumerGroup, "$").Result()
	if err != nil && err.Error() != "BUSYGROUP Consumer Group name already exists" {
		return fmt.Errorf("failed to create consumer group: %w", err)
	}
	return nil
}

func (c *Consumer) processMessages(ctx context.Context) error {
	c.logger.Trace().Msg("Reading messages from stream")

	// Read messages from the stream
	streams, err := c.client.XReadGroup(ctx, &redis.XReadGroupArgs{
		Group:    ConsumerGroup,
		Consumer: c.consumerID,
		Streams:  []string{StreamKey, ">"},
		Count:    BatchSize,
		Block:    time.Duration(BlockTimeMS) * time.Millisecond,
	}).Result()

	if err != nil {
		if err == redis.Nil {
			// No new messages, this is normal
			return nil
		}

		// Check if the consumer group no longer exists (e.g., after Redis reset)
		if c.isConsumerGroupError(err) {
			c.logger.Warn().
				Err(err).
				Str("stream", StreamKey).
				Str("consumerGroup", ConsumerGroup).
				Msg("Consumer group invalid, attempting to reinitialize")

			// Reinitialize the consumer group
			if initErr := c.initialize(ctx); initErr != nil {
				c.logger.Error().
					Err(initErr).
					Msg("Failed to reinitialize consumer group, will retry on next cycle")
				return fmt.Errorf("failed to reinitialize consumer group: %w", initErr)
			}

			c.logger.Info().
				Str("stream", StreamKey).
				Str("consumerGroup", ConsumerGroup).
				Msg("Consumer group reinitialized successfully, will process messages on next cycle")

			// Don't retry immediately - let the consumer loop handle the next attempt
			// This prevents tight loops if there are persistent issues
			return nil
		}

		return fmt.Errorf("failed to read from stream: %w", err)
	}

	if len(streams) == 0 {
		// No streams returned
		return nil
	}

	// Process messages from the first (and only) stream
	stream := streams[0]
	if len(stream.Messages) == 0 {
		return nil
	}

	c.logger.Debug().
		Int("messageCount", len(stream.Messages)).
		Msg("Processing messages")

	// Parse messages
	var lifecycleMessages []*LifecycleMessage
	var messageIDs []string

	for _, msg := range stream.Messages {
		messageIDs = append(messageIDs, msg.ID)

		// Convert Redis stream fields to our message format
		lifecycleMsg, err := ParseFromRedisFields(msg.Values)
		if err != nil {
			c.logger.Error().
				Err(err).
				Str("messageId", msg.ID).
				Interface("values", msg.Values).
				Msg("Failed to parse message, skipping")
			continue
		}

		lifecycleMessages = append(lifecycleMessages, lifecycleMsg)
	}

	if len(lifecycleMessages) == 0 {
		// No valid messages to process, but still acknowledge the messages
		c.logger.Debug().
			Int("totalMessages", len(stream.Messages)).
			Msg("No valid messages to process")
	} else {
		// Process the messages through our registry
		if err := c.registry.ProcessMessages(lifecycleMessages); err != nil {
			c.logger.Error().
				Err(err).
				Int("messageCount", len(lifecycleMessages)).
				Msg("Failed to process messages")
			// Continue to acknowledge messages even if processing failed
			// This prevents infinite reprocessing of bad messages
		}
	}

	// Acknowledge all messages (both successful and failed)
	if len(messageIDs) > 0 {
		if err := c.client.XAck(ctx, StreamKey, ConsumerGroup, messageIDs...).Err(); err != nil {
			c.logger.Error().
				Err(err).
				Strs("messageIds", messageIDs).
				Msg("Failed to acknowledge messages")
			return fmt.Errorf("failed to acknowledge messages: %w", err)
		}

		c.logger.Info().
			Int("acknowledgedCount", len(messageIDs)).
			Int("processedCount", len(lifecycleMessages)).
			Msg("Successfully processed and acknowledged messages")
	}

	return nil
}

// isConsumerGroupError checks if the error indicates that the consumer group is invalid/missing
// This happens when Redis is reset and the stream/consumer group is deleted
func (c *Consumer) isConsumerGroupError(err error) bool {
	if err == nil {
		return false
	}

	errStr := err.Error()
	// Common Redis errors when consumer group doesn't exist:
	// - "NOGROUP No such key 'lifecycle:jobs' or consumer group 'default' in XREADGROUP"
	// - "NOGROUP No such consumer group key name for the specified key"
	return strings.Contains(errStr, "NOGROUP") ||
		strings.Contains(errStr, "No such key") ||
		strings.Contains(errStr, "consumer group")
}
