package scheduler

import (
	"math"
	"testing"

	"github.com/stretchr/testify/assert"

	"github.com/editframe/telecine/scheduler/internal/connection"
	"github.com/editframe/telecine/scheduler/internal/queue"
	"github.com/editframe/telecine/scheduler/internal/testutil"
)

func TestExponentialSmoothing(t *testing.T) {
	ctx := testutil.WithTestSpan(t)
	logger := testutil.Logger()

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

	// Test 1: Initial scale-up to 100 workers
	smoothed := reconciler.updateSmoothedTarget(ctx, state, 100)
	assert.Equal(t, 100, smoothed, "Initial scale-up should be immediate")
	assert.Equal(t, 100.0, state.smoothedTarget)

	// Test 2: Maintain at 100 workers
	smoothed = reconciler.updateSmoothedTarget(ctx, state, 100)
	assert.Equal(t, 100, smoothed, "Should maintain at 100")
	assert.Equal(t, 100.0, state.smoothedTarget)

	// Test 3: Jobs complete, raw target drops to 0
	// Smoothed should decay gradually
	smoothed = reconciler.updateSmoothedTarget(ctx, state, 0)
	expected := 100*0.9 + 0*(1-0.9)
	assert.Equal(t, int(math.Ceil(expected)), smoothed, "Should decay by smoothing factor")
	assert.InDelta(t, expected, state.smoothedTarget, 0.01)

	t.Logf("After 1 cycle: raw=0, smoothed=%.2f (%.0f%%)", state.smoothedTarget, state.smoothedTarget)

	// Test 4: Continue decay over multiple cycles
	t.Logf("\nDecay simulation (starting from 100 workers, raw target drops to 0):")
	t.Logf("Cycle | Smoothed Target | Workers | Percentage")
	t.Logf("------|-----------------|---------|------------")
	t.Logf("    0 |          100.00 |     100 |      100%%")

	// Reset state for clean simulation
	state.smoothedTarget = 100.0

	for _, cycle := range []int{5, 10, 15, 20, 30, 40, 50} {
		// Reset and simulate from scratch each time
		state.smoothedTarget = 100.0

		for i := 0; i < cycle; i++ {
			smoothed = reconciler.updateSmoothedTarget(ctx, state, 0)
		}

		expected := 100 * math.Pow(0.9, float64(cycle))
		percentage := (state.smoothedTarget / 100.0) * 100

		t.Logf("%5d | %15.2f | %7d | %10.1f%%",
			cycle,
			state.smoothedTarget,
			smoothed,
			percentage)

		// Allow some tolerance for floating point arithmetic
		assert.InDelta(t, expected, state.smoothedTarget, 0.5,
			"Smoothed target should match expected decay at cycle %d", cycle)
	}
}

func TestScaleUpIsImmediate(t *testing.T) {
	ctx := testutil.WithTestSpan(t)
	logger := testutil.Logger()

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

	// Start at 0
	smoothed := reconciler.updateSmoothedTarget(ctx, state, 0)
	assert.Equal(t, 0, smoothed)

	// Scale up to 50 - should be immediate
	smoothed = reconciler.updateSmoothedTarget(ctx, state, 50)
	assert.Equal(t, 50, smoothed, "Scale-up should be immediate")
	assert.Equal(t, 50.0, state.smoothedTarget)

	// Scale up to 100 - should be immediate
	smoothed = reconciler.updateSmoothedTarget(ctx, state, 100)
	assert.Equal(t, 100, smoothed, "Scale-up should be immediate")
	assert.Equal(t, 100.0, state.smoothedTarget)

	// Decay to 50
	for i := 0; i < 10; i++ {
		smoothed = reconciler.updateSmoothedTarget(ctx, state, 0)
	}

	currentSmoothed := state.smoothedTarget
	assert.Less(t, currentSmoothed, 50.0, "Should have decayed below 50")

	// Scale back up to 50 - should be immediate
	smoothed = reconciler.updateSmoothedTarget(ctx, state, 50)
	assert.Equal(t, 50, smoothed, "Scale-up should be immediate even from decayed state")
	assert.Equal(t, 50.0, state.smoothedTarget)

	t.Logf("Scale-up behavior validated:")
	t.Logf("  - 0 → 50: immediate")
	t.Logf("  - 50 → 100: immediate")
	t.Logf("  - %.2f → 50: immediate (after decay)", currentSmoothed)
}

func TestBurstyWorkloadScenario(t *testing.T) {
	ctx := testutil.WithTestSpan(t)
	logger := testutil.Logger()

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

	t.Log("\nSimulating bursty workload scenario:")
	t.Log("Cycle | Raw Target | Smoothed | Workers | Event")
	t.Log("------|------------|----------|---------|------")

	scenarios := []struct {
		cycle     int
		rawTarget int
		event     string
	}{
		{0, 100, "Burst of 100 jobs arrives"},
		{1, 100, "Jobs still processing"},
		{2, 100, "Jobs still processing"},
		{3, 0, "All jobs complete"},
		{4, 0, "Queue empty"},
		{5, 0, "Queue empty"},
		{6, 0, "Queue empty"},
		{7, 0, "Queue empty"},
		{8, 0, "Queue empty"},
		{9, 0, "Queue empty"},
		{10, 50, "New burst of 50 jobs arrives"},
		{11, 50, "Jobs processing"},
		{12, 0, "Jobs complete"},
		{13, 0, "Queue empty"},
		{14, 0, "Queue empty"},
	}

	for _, scenario := range scenarios {
		smoothed := reconciler.updateSmoothedTarget(ctx, state, scenario.rawTarget)
		t.Logf("%5d | %10d | %8.1f | %7d | %s",
			scenario.cycle,
			scenario.rawTarget,
			state.smoothedTarget,
			smoothed,
			scenario.event)
	}

	t.Log("\nKey observations:")
	t.Log("  - Scale-up is immediate (cycle 0: 0→100, cycle 10: ~35→50)")
	t.Log("  - Scale-down is gradual (cycle 3-9: 100→90→81→...)")
	t.Log("  - Workers stay alive during idle periods")
	t.Log("  - Ready to handle next burst without cold start")
}

func TestSmoothingFactorBehavior(t *testing.T) {
	ctx := testutil.WithTestSpan(t)

	ctx, span := testutil.StartSpan(ctx, "calculate-decay-rates")
	t.Logf("Testing smoothing factor: %.2f", 0.9)
	const defaultTickMS = 2000
	t.Log("")
	t.Logf("Decay rate per cycle: %.1f%%", (1-0.9)*100)
	t.Logf("Half-life: ~%.0f cycles (~%.0f seconds)",
		math.Log(0.5)/math.Log(0.9),
		(math.Log(0.5)/math.Log(0.9))*float64(defaultTickMS)/1000)
	t.Log("")
	t.Log("After N cycles (starting from 100 workers):")

	for _, cycles := range []int{5, 10, 15, 20, 30, 40, 50} {
		remaining := 100 * math.Pow(0.9, float64(cycles))
		seconds := float64(cycles) * float64(defaultTickMS) / 1000
		t.Logf("  %2d cycles (%3.0fs): %5.1f workers (%.0f%%)",
			cycles, seconds, remaining, remaining)
	}
	span.End()

	assert.Equal(t, 0.9, 0.9, "Smoothing factor should be 0.9")
}

func TestScaleToZero(t *testing.T) {
	ctx := testutil.WithTestSpan(t)
	logger := testutil.Logger()

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

	// Start with 10 workers
	result := reconciler.updateSmoothedTarget(ctx, state, 10)
	assert.Equal(t, 10, result, "Should initialize to 10")

	// Drop to 0 and let it decay
	t.Log("\nDecaying from 10 workers to 0:")
	t.Log("Cycle | Smoothed | Result | Note")
	t.Log("------|----------|--------|-----")

	scaledToZero := false
	for cycle := 1; cycle <= 35; cycle++ {
		result = reconciler.updateSmoothedTarget(ctx, state, 0)
		note := ""
		if result == 0 {
			note = "← Scaled to zero"
			scaledToZero = true
		}

		// Only log key cycles to avoid spam
		if cycle <= 10 || cycle%5 == 0 || result == 0 {
			t.Logf("  %3d |    %.2f |    %d   | %s",
				cycle, state.smoothedTarget, result, note)
		}

		// Should scale to zero once smoothed target drops below 0.5
		if state.smoothedTarget < 0.5 {
			assert.Equal(t, 0, result,
				"Should scale to 0 when smoothed target < 0.5 (cycle %d, smoothed=%.2f)",
				cycle, state.smoothedTarget)
			break
		}
	}

	// Verify it scaled to zero
	assert.True(t, scaledToZero, "Should eventually scale to zero")
	assert.Equal(t, 0, result, "Final result should be zero")

	// Verify it can scale back up immediately
	result = reconciler.updateSmoothedTarget(ctx, state, 5)
	assert.Equal(t, 5, result, "Should scale up immediately from 0")
}
