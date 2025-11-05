package redis

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/rs/zerolog"
)

// CleanupConfig defines configuration for Redis data cleanup
type CleanupConfig struct {
	// CompletedJobTTL is how long to keep completed jobs in Redis
	CompletedJobTTL time.Duration
	// FailedJobTTL is how long to keep failed jobs in Redis
	FailedJobTTL time.Duration
	// CleanupInterval is how often to run cleanup
	CleanupInterval time.Duration
	// BatchSize is how many jobs to process per cleanup batch
	BatchSize int
	// MaxWorkflowAge is how long to keep workflow data
	MaxWorkflowAge time.Duration
}

// DefaultCleanupConfig returns sensible defaults for cleanup
func DefaultCleanupConfig() CleanupConfig {
	return CleanupConfig{
		CompletedJobTTL: 24 * time.Hour,     // Keep completed jobs for 24 hours
		FailedJobTTL:    7 * 24 * time.Hour, // Keep failed jobs for 7 days
		CleanupInterval: 1 * time.Hour,      // Run cleanup every hour
		BatchSize:       100,                // Process 100 jobs per batch
		MaxWorkflowAge:  1 * 24 * time.Hour, // Keep workflow data for 7 days
	}
}

// CleanupManager handles Redis data cleanup
type CleanupManager struct {
	client *redis.Client
	config CleanupConfig
	logger *zerolog.Logger
	stopCh chan struct{}
}

// NewCleanupManager creates a new cleanup manager
func NewCleanupManager(client *redis.Client, config CleanupConfig, logger *zerolog.Logger) *CleanupManager {
	return &CleanupManager{
		client: client,
		config: config,
		logger: logger,
		stopCh: make(chan struct{}),
	}
}

// Start begins the cleanup process
func (c *CleanupManager) Start(ctx context.Context) {
	go c.runCleanupLoop(ctx)
}

// Stop stops the cleanup process
func (c *CleanupManager) Stop() {
	close(c.stopCh)
}

// runCleanupLoop runs the cleanup process periodically
func (c *CleanupManager) runCleanupLoop(ctx context.Context) {
	ticker := time.NewTicker(c.config.CleanupInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-c.stopCh:
			return
		case <-ticker.C:
			if err := c.cleanup(ctx); err != nil {
				c.logger.Error().Err(err).Msg("cleanup failed")
			}
		}
	}
}

// cleanup performs the actual cleanup operations
func (c *CleanupManager) cleanup(ctx context.Context) error {
	c.logger.Info().Msg("starting Redis data cleanup")

	// Clean up completed jobs
	if err := c.cleanupCompletedJobs(ctx); err != nil {
		c.logger.Error().Err(err).Msg("failed to cleanup completed jobs")
	}

	// Clean up failed jobs
	if err := c.cleanupFailedJobs(ctx); err != nil {
		c.logger.Error().Err(err).Msg("failed to cleanup failed jobs")
	}

	// Clean up old workflow data
	if err := c.cleanupOldWorkflows(ctx); err != nil {
		c.logger.Error().Err(err).Msg("failed to cleanup old workflows")
	}

	// Clean up old scheduler data
	if err := c.cleanupOldSchedulers(ctx); err != nil {
		c.logger.Error().Err(err).Msg("failed to cleanup old schedulers")
	}

	c.logger.Info().Msg("Redis data cleanup completed")
	return nil
}

// cleanupCompletedJobs removes old completed jobs
func (c *CleanupManager) cleanupCompletedJobs(ctx context.Context) error {
	cutoffTime := time.Now().Add(-c.config.CompletedJobTTL).UnixMilli()

	// Get all queue names from Redis
	queueKeys, err := c.client.Keys(ctx, "queues:*:completed").Result()
	if err != nil {
		return fmt.Errorf("failed to get completed job keys: %w", err)
	}

	totalRemoved := 0
	for _, key := range queueKeys {
		removed, err := c.cleanupJobStage(ctx, key, cutoffTime, "completed")
		if err != nil {
			c.logger.Error().Err(err).Str("key", key).Msg("failed to cleanup completed jobs for queue")
			continue
		}
		totalRemoved += removed
	}

	c.logger.Info().Int("totalRemoved", totalRemoved).Msg("cleaned up completed jobs")
	return nil
}

// cleanupFailedJobs removes old failed jobs
func (c *CleanupManager) cleanupFailedJobs(ctx context.Context) error {
	cutoffTime := time.Now().Add(-c.config.FailedJobTTL).UnixMilli()

	// Get all queue names from Redis
	queueKeys, err := c.client.Keys(ctx, "queues:*:failed").Result()
	if err != nil {
		return fmt.Errorf("failed to get failed job keys: %w", err)
	}

	totalRemoved := 0
	for _, key := range queueKeys {
		removed, err := c.cleanupJobStage(ctx, key, cutoffTime, "failed")
		if err != nil {
			c.logger.Error().Err(err).Str("key", key).Msg("failed to cleanup failed jobs for queue")
			continue
		}
		totalRemoved += removed
	}

	c.logger.Info().Int("totalRemoved", totalRemoved).Msg("cleaned up failed jobs")
	return nil
}

// cleanupJobStage removes old jobs from a specific stage
func (c *CleanupManager) cleanupJobStage(ctx context.Context, key string, cutoffTime int64, stage string) (int, error) {
	// Get jobs older than cutoff time
	oldJobs, err := c.client.ZRangeByScore(ctx, key, &redis.ZRangeBy{
		Min:   "-inf",
		Max:   fmt.Sprintf("%d", cutoffTime),
		Count: int64(c.config.BatchSize),
	}).Result()

	if err != nil {
		return 0, fmt.Errorf("failed to get old jobs: %w", err)
	}

	if len(oldJobs) == 0 {
		return 0, nil
	}

	// Extract queue name from key (queues:{queueName}:{stage})
	queueName := extractQueueNameFromKey(key)
	if queueName == "" {
		return 0, fmt.Errorf("invalid key format: %s", key)
	}

	// Remove jobs from all related data structures
	removed := 0
	for _, jobKey := range oldJobs {
		if err := c.removeJobFromAllStages(ctx, jobKey, queueName, stage); err != nil {
			c.logger.Error().Err(err).Str("jobKey", jobKey).Msg("failed to remove job from all stages")
			continue
		}
		removed++
	}

	return removed, nil
}

// removeJobFromAllStages removes a job from all Redis data structures
func (c *CleanupManager) removeJobFromAllStages(ctx context.Context, jobKey, queueName, stage string) error {
	// Check if job data exists before attempting to clean up
	exists, err := c.client.Exists(ctx, jobKey).Result()
	if err != nil {
		return fmt.Errorf("failed to check job existence: %w", err)
	}

	if exists == 0 {
		// Job already deleted, skip
		return nil
	}

	// Remove from queue stage
	if err := c.client.ZRem(ctx, "queues:"+queueName+":"+stage, jobKey).Err(); err != nil {
		return fmt.Errorf("failed to remove from queue stage: %w", err)
	}

	// Remove job data
	if err := c.client.Del(ctx, jobKey).Err(); err != nil {
		return fmt.Errorf("failed to delete job data: %w", err)
	}

	return nil
}

// cleanupOldWorkflows removes old workflow data
func (c *CleanupManager) cleanupOldWorkflows(ctx context.Context) error {
	cutoffTime := time.Now().Add(-c.config.MaxWorkflowAge).UnixMilli()

	// Get all workflow keys
	workflowKeys, err := c.client.Keys(ctx, "workflows:*:completed").Result()
	if err != nil {
		return fmt.Errorf("failed to get workflow keys: %w", err)
	}

	totalRemoved := 0
	for _, key := range workflowKeys {
		removed, err := c.cleanupWorkflowStage(ctx, key, cutoffTime)
		if err != nil {
			c.logger.Error().Err(err).Str("key", key).Msg("failed to cleanup workflow stage")
			continue
		}
		totalRemoved += removed
	}

	c.logger.Info().Int("totalRemoved", totalRemoved).Msg("cleaned up old workflows")
	return nil
}

// cleanupWorkflowStage removes old jobs from a workflow stage
func (c *CleanupManager) cleanupWorkflowStage(ctx context.Context, key string, cutoffTime int64) (int, error) {
	// Get jobs older than cutoff time
	oldJobs, err := c.client.ZRangeByScore(ctx, key, &redis.ZRangeBy{
		Min:   "-inf",
		Max:   fmt.Sprintf("%d", cutoffTime),
		Count: int64(c.config.BatchSize),
	}).Result()

	if err != nil {
		return 0, fmt.Errorf("failed to get old workflow jobs: %w", err)
	}

	if len(oldJobs) == 0 {
		return 0, nil
	}

	// Remove jobs from workflow stage
	removed := 0
	for _, jobKey := range oldJobs {
		if err := c.client.ZRem(ctx, key, jobKey).Err(); err != nil {
			c.logger.Error().Err(err).Str("jobKey", jobKey).Msg("failed to remove job from workflow stage")
			continue
		}
		removed++
	}

	return removed, nil
}

// cleanupOldSchedulers removes old scheduler data
func (c *CleanupManager) cleanupOldSchedulers(ctx context.Context) error {
	cutoffTime := time.Now().Add(-c.config.MaxWorkflowAge).UnixMilli()

	// Remove old schedulers
	removed, err := c.client.ZRemRangeByScore(ctx, "schedulers", "0", fmt.Sprintf("%d", cutoffTime)).Result()
	if err != nil {
		return fmt.Errorf("failed to cleanup old schedulers: %w", err)
	}

	if removed > 0 {
		c.logger.Info().Int64("removed", removed).Msg("cleaned up old schedulers")
	}

	return nil
}

// extractQueueNameFromKey extracts queue name from a Redis key
func extractQueueNameFromKey(key string) string {
	// Expected format: queues:{queueName}:{stage}
	// Example: queues:process-isobmff:completed
	if len(key) < 8 || key[:7] != "queues:" {
		return ""
	}

	parts := splitString(key[7:], ":")
	if len(parts) < 2 {
		return ""
	}

	return parts[0]
}

// splitString splits a string by delimiter (simple implementation)
func splitString(s, delimiter string) []string {
	var result []string
	start := 0
	for i := 0; i < len(s); i++ {
		if i+len(delimiter) <= len(s) && s[i:i+len(delimiter)] == delimiter {
			result = append(result, s[start:i])
			start = i + len(delimiter)
			i += len(delimiter) - 1
		}
	}
	result = append(result, s[start:])
	return result
}
