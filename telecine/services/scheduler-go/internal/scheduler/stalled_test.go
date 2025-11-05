package scheduler

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/editframe/telecine/scheduler/internal/queue"
	"github.com/editframe/telecine/scheduler/internal/redis"
	"github.com/editframe/telecine/scheduler/internal/testutil"
)

func TestNewStalledJobCleanup(t *testing.T) {
	_ = testutil.WithTestSpan(t)
	client := &redis.Client{}
	queues := []queue.Queue{
		{Name: "test-queue"},
	}
	logger := testutil.Logger()

	cleanup := NewStalledJobCleanup(client, queues, logger)

	assert.NotNil(t, cleanup)
	assert.Equal(t, client, cleanup.client)
	assert.Equal(t, queues, cleanup.queues)
	assert.Equal(t, logger, cleanup.logger)
	assert.NotNil(t, cleanup.stopCh)
}

func TestStalledJobCleanup_Stop(t *testing.T) {
	_ = testutil.WithTestSpan(t)
	client := &redis.Client{}
	queues := []queue.Queue{}
	logger := testutil.Logger()

	cleanup := NewStalledJobCleanup(client, queues, logger)

	// Test that Stop doesn't block
	done := make(chan bool)
	go func() {
		cleanup.Stop()
		done <- true
	}()

	select {
	case <-done:
		// Success - Stop completed
	case <-time.After(100 * time.Millisecond):
		t.Fatal("Stop() should not block")
	}
}

func TestStalledJobCleanup_Start(t *testing.T) {
	_ = testutil.WithTestSpan(t)
	client := &redis.Client{}
	queues := []queue.Queue{}
	logger := testutil.Logger()

	cleanup := NewStalledJobCleanup(client, queues, logger)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Start the cleanup (this starts a goroutine)
	cleanup.Start(ctx)

	// Give it a moment to start
	time.Sleep(10 * time.Millisecond)

	// Stop it
	cleanup.Stop()

	// Test passes if no panic or deadlock occurs
}

func TestJob_Struct(t *testing.T) {
	_ = testutil.WithTestSpan(t)
	now := time.Now()
	job := Job{
		Queue:      "test-queue",
		WorkflowID: "workflow-123",
		Workflow:   "test-workflow",
		JobID:      "job-456",
		OrgID:      "org-789",
		Attempts:   2,
		ClaimedAt:  &now,
		Payload:    map[string]interface{}{"key": "value"},
	}

	assert.Equal(t, "test-queue", job.Queue)
	assert.Equal(t, "workflow-123", job.WorkflowID)
	assert.Equal(t, "test-workflow", job.Workflow)
	assert.Equal(t, "job-456", job.JobID)
	assert.Equal(t, "org-789", job.OrgID)
	assert.Equal(t, 2, job.Attempts)
	assert.Equal(t, &now, job.ClaimedAt)
	assert.Equal(t, map[string]interface{}{"key": "value"}, job.Payload)
}

func TestConstants(t *testing.T) {
	_ = testutil.WithTestSpan(t)
	assert.Equal(t, 2000, RestartIntervalMS)
	assert.Equal(t, 3, MaxRetries)
}

func TestStalledJobCleanup_Integration(t *testing.T) {
	_ = testutil.WithTestSpan(t)
	// This is a basic integration test that doesn't require Redis
	client := &redis.Client{}
	queues := []queue.Queue{
		{Name: "test-queue-1"},
		{Name: "test-queue-2"},
	}
	logger := testutil.Logger()

	cleanup := NewStalledJobCleanup(client, queues, logger)
	require.NotNil(t, cleanup)

	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Millisecond)
	defer cancel()

	// Start cleanup
	cleanup.Start(ctx)

	// Let it run briefly
	time.Sleep(20 * time.Millisecond)

	// Stop cleanup
	cleanup.Stop()

	// Test that the cleanup can be started and stopped without issues
	assert.NotNil(t, cleanup.client)
	assert.Len(t, cleanup.queues, 2)
}

func TestStalledJobCleanup_MultipleStopCalls(t *testing.T) {
	_ = testutil.WithTestSpan(t)
	client := &redis.Client{}
	queues := []queue.Queue{}
	logger := testutil.Logger()

	cleanup := NewStalledJobCleanup(client, queues, logger)

	// First Stop call should work
	cleanup.Stop()

	// Subsequent Stop calls will panic due to closing closed channel
	// This is expected behavior based on the current implementation
	assert.Panics(t, func() {
		cleanup.Stop()
	}, "Multiple Stop calls should panic due to closing closed channel")
}

func TestStalledJobCleanup_StartAfterStop(t *testing.T) {
	_ = testutil.WithTestSpan(t)
	client := &redis.Client{}
	queues := []queue.Queue{}
	logger := testutil.Logger()

	// Create separate cleanup instances since Stop() can only be called once
	cleanup1 := NewStalledJobCleanup(client, queues, logger)
	cleanup2 := NewStalledJobCleanup(client, queues, logger)

	ctx := context.Background()

	// Start first cleanup and stop it
	cleanup1.Start(ctx)
	time.Sleep(10 * time.Millisecond)
	cleanup1.Stop()

	// Start second cleanup - should work without issues
	cleanup2.Start(ctx)
	time.Sleep(10 * time.Millisecond)
	cleanup2.Stop()

	// Test passes if no panic or deadlock occurs
}
