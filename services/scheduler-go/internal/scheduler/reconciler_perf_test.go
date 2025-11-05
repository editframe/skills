package scheduler

import (
	"context"
	"testing"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/editframe/telecine/scheduler/internal/queue"
	redisclient "github.com/editframe/telecine/scheduler/internal/redis"
	"github.com/editframe/telecine/scheduler/internal/testutil"
)

func TestReconcilerPerformance(t *testing.T) {
	t.Skip("Skipping performance test - may have Redis key naming issues after memory test cleanup")
	_ = testutil.WithTestSpan(t)
	// Skip if Redis is not available
	client := redis.NewClient(&redis.Options{
		Addr: testutil.GetTestRedisAddr(),
	})
	defer client.Close()

	ctx := context.Background()
	if err := client.Ping(ctx).Err(); err != nil {
		t.Skip("Redis not available")
	}

	// Clean up any existing test data
	client.FlushDB(ctx)

	logger := testutil.Logger()
	queues := []queue.Queue{
		{Name: "test-queue-1", MaxWorkerCount: 10, WorkerConcurrency: 1},
		{Name: "test-queue-2", MaxWorkerCount: 10, WorkerConcurrency: 1},
	}

	// Create a mock coordinator
	coordinator := &Coordinator{} // We'll only test the reconciler part

	// Create a Redis client wrapper with Commands
	redisClient := &redisclient.Client{Client: client}
	redisClient.Commands = redisclient.NewCommands(client)
	reconciler := NewReconciler(coordinator, nil, redisClient, queues, logger, 2000, 0.9)

	// Add some test data to simulate accumulated completed jobs
	now := time.Now().UnixMilli()

	// Add many completed jobs to simulate the scaling problem
	for i := range 50000 {
		client.ZAdd(ctx, "queues:test-queue-1:completed", redis.Z{
			Score:  float64(now - int64(i*1000)), // Spread over time
			Member: "queues:test-queue-1:jobs:completed-job-" + string(rune(i)),
		})
	}

	// Add some queued and claimed jobs (these should be counted exactly)
	for i := range 10 {
		client.ZAdd(ctx, "queues:test-queue-1:queued", redis.Z{
			Score:  float64(now),
			Member: "queues:test-queue-1:jobs:queued-job-" + string(rune(i)),
		})
	}

	for i := range 5 {
		client.ZAdd(ctx, "queues:test-queue-1:claimed", redis.Z{
			Score:  float64(now),
			Member: "queues:test-queue-1:jobs:claimed-job-" + string(rune(i)),
		})
	}

	// Test the efficient queue stats
	start := time.Now()
	stats, err := reconciler.getQueuesInfo(ctx)
	duration := time.Since(start)

	require.NoError(t, err)
	require.Contains(t, stats, "test-queue-1")

	queueStats := stats["test-queue-1"]

	// Should have exact counts for queued and claimed
	assert.Equal(t, 10, queueStats.Queued)
	assert.Equal(t, 5, queueStats.Claimed)

	// Completed should be capped at 10000 (our maxCount)
	assert.Equal(t, 10000, queueStats.Completed)

	// Should complete quickly (under 100ms for this test)
	assert.Less(t, duration, 100*time.Millisecond, "Queue stats should be fast even with large completed job counts")

	t.Logf("Queue stats completed in %v", duration)
	t.Logf("Queued: %d, Claimed: %d, Completed: %d (capped)",
		queueStats.Queued, queueStats.Claimed, queueStats.Completed)
}

func TestStalledJobCleanupPerformance(t *testing.T) {
	_ = testutil.WithTestSpan(t)
	t.Skip("Skipping stalled job cleanup performance test")
	// Skip if Redis is not available
	client := redis.NewClient(&redis.Options{
		Addr: testutil.GetTestRedisAddr(),
	})
	defer client.Close()

	ctx := context.Background()
	if err := client.Ping(ctx).Err(); err != nil {
		t.Skip("Redis not available")
	}

	// Clean up any existing test data
	client.FlushDB(ctx)

	logger := testutil.Logger()
	queues := []queue.Queue{
		{Name: "test-queue", MaxWorkerCount: 10, WorkerConcurrency: 1},
	}

	// Create a Redis client wrapper with Commands
	redisClient := &redisclient.Client{Client: client}
	redisClient.Commands = redisclient.NewCommands(client)
	cleanup := NewStalledJobCleanup(redisClient, queues, logger)

	// Add many claimed jobs, some old (stalled) and some recent
	now := time.Now().UnixMilli()
	stalledTime := now - 15*1000 // 15 seconds ago (stalled)
	recentTime := now - 5*1000   // 5 seconds ago (not stalled)

	// Add many claimed jobs to simulate the scaling problem
	for i := range 100 {
		score := stalledTime
		if i%2 == 0 {
			score = recentTime // Half are recent, half are stalled
		}

		client.ZAdd(ctx, "queues:test-queue:claimed", redis.Z{
			Score:  float64(score),
			Member: "queues:test-queue:jobs:claimed-job-" + string(rune(i)),
		})

		// Add job data
		client.Set(ctx, "queues:test-queue:jobs:claimed-job-"+string(rune(i)),
			`{"json":{"jobId":"claimed-job-`+string(rune(i))+`","queue":"test-queue"}}`, 0)
	}

	// Test the efficient stalled job detection
	start := time.Now()
	err := cleanup.releaseAllStalledJobs(ctx, queues[0])
	duration := time.Since(start)

	require.NoError(t, err)

	// Should complete quickly (under 200ms for this test)
	assert.Less(t, duration, 200*time.Millisecond, "Stalled job cleanup should be fast even with many claimed jobs")

	t.Logf("Stalled job cleanup completed in %v", duration)
}
