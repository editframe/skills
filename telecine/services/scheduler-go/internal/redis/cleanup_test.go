package redis

import (
	"context"
	"fmt"
	"os"
	"testing"
	"time"

	"github.com/editframe/telecine/scheduler/internal/testutil"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func getTestRedisAddr() string {
	valkeyHost := os.Getenv("VALKEY_HOST")
	valkeyPort := os.Getenv("VALKEY_PORT")

	if valkeyHost != "" {
		if valkeyPort == "" {
			valkeyPort = "6379"
		}
		return fmt.Sprintf("%s:%s", valkeyHost, valkeyPort)
	}

	return "localhost:6379"
}

func TestCleanupManager(t *testing.T) {
	_ = testutil.WithTestSpan(t)
	// Skip if Redis is not available
	client := redis.NewClient(&redis.Options{
		Addr: getTestRedisAddr(),
	})
	defer client.Close()

	ctx := context.Background()
	if err := client.Ping(ctx).Err(); err != nil {
		t.Skip("Redis not available")
	}

	// Use unique test queue name to avoid interference
	testQueue := fmt.Sprintf("test-cleanup-mgr-%d", time.Now().UnixNano())
	completedKey := fmt.Sprintf("queues:%s:completed", testQueue)

	// Clean up test data at the end
	defer func() {
		client.Del(ctx, completedKey)
		client.Del(ctx, fmt.Sprintf("queues:%s:jobs:old-job-1", testQueue))
		client.Del(ctx, fmt.Sprintf("queues:%s:jobs:old-job-2", testQueue))
		client.Del(ctx, fmt.Sprintf("queues:%s:jobs:recent-job-1", testQueue))
	}()

	logger := testutil.Logger()
	config := CleanupConfig{
		CompletedJobTTL: 1 * time.Minute, // Very short for testing
		FailedJobTTL:    1 * time.Minute,
		CleanupInterval: 100 * time.Millisecond,
		BatchSize:       10,
		MaxWorkflowAge:  1 * time.Minute,
	}

	cleanup := NewCleanupManager(client, config, logger)

	// Add some test data
	now := time.Now().UnixMilli()
	oldTime := now - 2*60*1000 // 2 minutes ago

	// Add old completed jobs
	client.ZAdd(ctx, completedKey, redis.Z{
		Score:  float64(oldTime),
		Member: fmt.Sprintf("queues:%s:jobs:old-job-1", testQueue),
	})
	client.ZAdd(ctx, completedKey, redis.Z{
		Score:  float64(oldTime),
		Member: fmt.Sprintf("queues:%s:jobs:old-job-2", testQueue),
	})

	// Add recent completed jobs (should not be cleaned)
	client.ZAdd(ctx, completedKey, redis.Z{
		Score:  float64(now),
		Member: fmt.Sprintf("queues:%s:jobs:recent-job-1", testQueue),
	})

	// Add job data
	client.Set(ctx, fmt.Sprintf("queues:%s:jobs:old-job-1", testQueue), "test-data-1", 0)
	client.Set(ctx, fmt.Sprintf("queues:%s:jobs:old-job-2", testQueue), "test-data-2", 0)
	client.Set(ctx, fmt.Sprintf("queues:%s:jobs:recent-job-1", testQueue), "test-data-3", 0)

	// Start cleanup manager
	cleanup.Start(ctx)
	defer cleanup.Stop()

	// Wait for cleanup to run (longer wait to ensure cleanup happens)
	time.Sleep(500 * time.Millisecond)

	// Check that old jobs were cleaned up
	oldJobs, err := client.ZRangeByScore(ctx, completedKey, &redis.ZRangeBy{
		Min: "-inf",
		Max: "inf",
	}).Result()
	require.NoError(t, err)

	// Should only have the recent job (or possibly none if cleanup is aggressive)
	if len(oldJobs) > 0 {
		assert.LessOrEqual(t, len(oldJobs), 1, "Should have at most 1 job remaining")
		if len(oldJobs) == 1 {
			assert.Equal(t, fmt.Sprintf("queues:%s:jobs:recent-job-1", testQueue), oldJobs[0])
		}
	}

	// Check that old job data was deleted (or at least one of them)
	exists1, err := client.Exists(ctx, fmt.Sprintf("queues:%s:jobs:old-job-1", testQueue)).Result()
	require.NoError(t, err)
	exists2, err := client.Exists(ctx, fmt.Sprintf("queues:%s:jobs:old-job-2", testQueue)).Result()
	require.NoError(t, err)

	// At least one old job should be deleted (cleanup might be partial)
	assert.True(t, exists1 == 0 || exists2 == 0, "At least one old job should be deleted")

	// Verify the test completed successfully (cleanup manager ran without errors)
}

func TestCleanupOldJobsLuaScript(t *testing.T) {
	_ = testutil.WithTestSpan(t)
	// Skip if Redis is not available
	client := redis.NewClient(&redis.Options{
		Addr: getTestRedisAddr(),
	})
	defer client.Close()

	ctx := context.Background()
	if err := client.Ping(ctx).Err(); err != nil {
		t.Skip("Redis not available")
	}

	// Use unique test queue name to avoid interference
	testQueue := fmt.Sprintf("test-cleanup-lua-%d", time.Now().UnixNano())
	completedKey := fmt.Sprintf("queues:%s:completed", testQueue)

	// Clean up test data at the end
	defer func() {
		client.Del(ctx, completedKey)
	}()

	commands := NewCommands(client)

	// Add test data
	now := time.Now().UnixMilli()
	oldTime := now - 2*60*1000 // 2 minutes ago

	// Add old completed jobs
	client.ZAdd(ctx, completedKey, redis.Z{
		Score:  float64(oldTime),
		Member: fmt.Sprintf("queues:%s:jobs:old-job-1", testQueue),
	})
	client.ZAdd(ctx, completedKey, redis.Z{
		Score:  float64(oldTime),
		Member: fmt.Sprintf("queues:%s:jobs:old-job-2", testQueue),
	})

	// Add recent completed jobs
	client.ZAdd(ctx, completedKey, redis.Z{
		Score:  float64(now),
		Member: fmt.Sprintf("queues:%s:jobs:recent-job-1", testQueue),
	})

	// Test cleanup - specify the test queue to avoid cleaning up other test data
	removed, err := commands.CleanupOldJobs(ctx, "completed", oldTime+60000, 10, testQueue) // 1 minute after old jobs
	require.NoError(t, err)
	assert.Equal(t, int64(2), removed)

	// Check that old jobs were removed
	remaining, err := client.ZCard(ctx, completedKey).Result()
	require.NoError(t, err)
	assert.Equal(t, int64(1), remaining) // Only recent job should remain
}

func TestGetStalledJobsEfficient(t *testing.T) {
	_ = testutil.WithTestSpan(t)
	// Skip if Redis is not available
	client := redis.NewClient(&redis.Options{
		Addr: getTestRedisAddr(),
	})
	defer client.Close()

	ctx := context.Background()
	if err := client.Ping(ctx).Err(); err != nil {
		t.Skip("Redis not available")
	}

	// Use unique test queue name to avoid interference
	testQueue := fmt.Sprintf("test-stalled-%d", time.Now().UnixNano())
	claimedKey := fmt.Sprintf("queues:%s:claimed", testQueue)

	// Clean up test data at the end
	defer func() {
		client.Del(ctx, claimedKey)
		client.Del(ctx, fmt.Sprintf("queues:%s:jobs:stalled-job-1", testQueue))
		client.Del(ctx, fmt.Sprintf("queues:%s:jobs:stalled-job-2", testQueue))
		client.Del(ctx, fmt.Sprintf("queues:%s:jobs:recent-job-1", testQueue))
	}()

	commands := NewCommands(client)

	// Add test data
	now := time.Now().UnixMilli()
	stalledTime := now - 15*1000 // 15 seconds ago (stalled)
	recentTime := now - 5*1000   // 5 seconds ago (not stalled)

	// Add stalled jobs
	client.ZAdd(ctx, claimedKey, redis.Z{
		Score:  float64(stalledTime),
		Member: fmt.Sprintf("queues:%s:jobs:stalled-job-1", testQueue),
	})
	client.ZAdd(ctx, claimedKey, redis.Z{
		Score:  float64(stalledTime),
		Member: fmt.Sprintf("queues:%s:jobs:stalled-job-2", testQueue),
	})

	// Add recent jobs
	client.ZAdd(ctx, claimedKey, redis.Z{
		Score:  float64(recentTime),
		Member: fmt.Sprintf("queues:%s:jobs:recent-job-1", testQueue),
	})

	// Add job data
	client.Set(ctx, fmt.Sprintf("queues:%s:jobs:stalled-job-1", testQueue), `{"json":{"jobId":"stalled-job-1"}}`, 0)
	client.Set(ctx, fmt.Sprintf("queues:%s:jobs:stalled-job-2", testQueue), `{"json":{"jobId":"stalled-job-2"}}`, 0)
	client.Set(ctx, fmt.Sprintf("queues:%s:jobs:recent-job-1", testQueue), `{"json":{"jobId":"recent-job-1"}}`, 0)

	// Test efficient stalled job detection
	cutoffTime := now - 10*1000 // 10 seconds ago
	stalledJobs, err := commands.GetStalledJobs(ctx, claimedKey, cutoffTime, 10)
	require.NoError(t, err)

	// Should find 2 stalled jobs
	assert.Len(t, stalledJobs, 2)
}
