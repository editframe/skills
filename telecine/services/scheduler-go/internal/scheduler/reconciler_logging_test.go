package scheduler

import (
	"testing"

	"github.com/stretchr/testify/assert"

	"github.com/editframe/telecine/scheduler/internal/connection"
	"github.com/editframe/telecine/scheduler/internal/queue"
	"github.com/editframe/telecine/scheduler/internal/testutil"
	"github.com/editframe/telecine/scheduler/pkg/logging"
)

// TestLoggingWithTraces demonstrates that logs include trace_id and span_id
func TestLoggingWithTraces(t *testing.T) {
	ctx := testutil.WithTestSpan(t)

	// Use the global logger (already initialized in TestMain)
	logger := logging.Logger()

	testQueue := queue.Queue{
		Name:              "test-queue",
		MaxWorkerCount:    100,
		WorkerConcurrency: 1,
	}

	queues := []queue.Queue{testQueue}

	coordinator := &Coordinator{
		info: &SchedulerInfo{
			ID: "test-scheduler",
		},
	}

	stateMachine := connection.NewStateMachine("test-scheduler", nil, logger)
	reconciler := NewReconciler(coordinator, stateMachine, nil, queues, logger, 2000, 0.9)

	state := reconciler.getOrCreateScalingState(testQueue.Name)

	// Create a child span for scaling operations
	ctx, span := testutil.StartSpan(ctx, "test-scaling")
	defer span.End()

	// Log with trace context - these logs will include trace_id and span_id
	reconciler.log(ctx).Info().
		Str("queue", testQueue.Name).
		Msg("Testing log with trace context")

	// Perform scaling operation which will also log
	smoothed := reconciler.updateSmoothedTarget(ctx, state, 100)
	assert.Equal(t, 100, smoothed)

	reconciler.log(ctx).Info().
		Int("smoothed", smoothed).
		Msg("Scaling operation complete")
}
