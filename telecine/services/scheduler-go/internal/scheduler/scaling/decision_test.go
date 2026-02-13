package scaling

import (
	"testing"

	"github.com/editframe/telecine/scheduler/internal/queue"
	"github.com/stretchr/testify/assert"
)

func TestCalculateFairShare(t *testing.T) {
	tests := []struct {
		name     string
		rank     int
		total    int
		demand   int
		expected int
	}{
		{
			name:     "single scheduler gets all demand",
			rank:     0,
			total:    1,
			demand:   10,
			expected: 10,
		},
		{
			name:     "even distribution",
			rank:     0,
			total:    2,
			demand:   10,
			expected: 5,
		},
		{
			name:     "even distribution rank 1",
			rank:     1,
			total:    2,
			demand:   10,
			expected: 5,
		},
		{
			name:     "uneven distribution - rank 0 gets extra",
			rank:     0,
			total:    3,
			demand:   10,
			expected: 4, // 10/3 = 3 base + 1 remainder
		},
		{
			name:     "uneven distribution - rank 1 gets base",
			rank:     1,
			total:    3,
			demand:   10,
			expected: 3, // 10/3 = 3 base
		},
		{
			name:     "uneven distribution - rank 2 gets base",
			rank:     2,
			total:    3,
			demand:   10,
			expected: 3, // 10/3 = 3 base
		},
		{
			name:     "zero demand",
			rank:     0,
			total:    3,
			demand:   0,
			expected: 0,
		},
		{
			name:     "zero total schedulers",
			rank:     0,
			total:    0,
			demand:   10,
			expected: 0,
		},
		{
			name:     "demand less than schedulers",
			rank:     0,
			total:    5,
			demand:   2,
			expected: 1, // rank 0 gets 1
		},
		{
			name:     "demand less than schedulers - rank 1",
			rank:     1,
			total:    5,
			demand:   2,
			expected: 1, // rank 1 gets 1
		},
		{
			name:     "demand less than schedulers - rank 2",
			rank:     2,
			total:    5,
			demand:   2,
			expected: 0, // rank 2 gets 0
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := CalculateFairShare(tt.rank, tt.total, tt.demand)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestCalculateFairShare_TotalDistribution(t *testing.T) {
	// Property: sum of all shares should equal demand
	demand := 17
	total := 5

	sum := 0
	for rank := 0; rank < total; rank++ {
		share := CalculateFairShare(rank, total, demand)
		sum += share
	}

	assert.Equal(t, demand, sum, "sum of all shares should equal demand")
}

func TestSmoothTarget(t *testing.T) {
	tests := []struct {
		name            string
		currentSmoothed float64
		rawTarget       int
		lastRawTarget   int
		expected        float64
	}{
		{
			name:            "scale up immediately",
			currentSmoothed: 5.0,
			rawTarget:       10,
			lastRawTarget:   5,
			expected:        10.0,
		},
		{
			name:            "scale down gradually from 10 to 0",
			currentSmoothed: 10.0,
			rawTarget:       0,
			lastRawTarget:   10,
			expected:        9.0, // 10*0.9 + 0*0.1 = 9.0
		},
		{
			name:            "scale down gradually from 10 to 5",
			currentSmoothed: 10.0,
			rawTarget:       5,
			lastRawTarget:   10,
			expected:        9.5, // 10*0.9 + 5*0.1 = 9.5
		},
		{
			name:            "no change",
			currentSmoothed: 5.0,
			rawTarget:       5,
			lastRawTarget:   5,
			expected:        5.0, // 5*0.9 + 5*0.1 = 5.0
		},
		{
			name:            "scale up from zero",
			currentSmoothed: 0.0,
			rawTarget:       10,
			lastRawTarget:   0,
			expected:        10.0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := SmoothTarget(tt.currentSmoothed, tt.rawTarget, tt.lastRawTarget)
			assert.InDelta(t, tt.expected, result, 0.01)
		})
	}
}

func TestSmoothTarget_ConvergesToTarget(t *testing.T) {
	// Property: repeated smoothing should converge to target
	current := 100.0
	target := 0
	lastTarget := 100

	// After many iterations, should be close to target
	for i := 0; i < 100; i++ {
		current = SmoothTarget(current, target, lastTarget)
		lastTarget = target
	}

	assert.Less(t, current, 1.0, "should converge close to target after many iterations")
}

func TestDetermineAction(t *testing.T) {
	tests := []struct {
		name     string
		working  int
		target   int
		total    int
		expected ScalingAction
	}{
		{
			name:     "scale up when working < target",
			working:  3,
			target:   5,
			total:    3,
			expected: ActionScaleUp,
		},
		{
			name:     "scale down idle connections when total > target and total > working",
			working:  3,
			target:   3,
			total:    5,
			expected: ActionScaleDown,
		},
		{
			name:     "no scale down when all connections are working",
			working:  5,
			target:   3,
			total:    5,
			expected: ActionNone,
		},
		{
			name:     "no action when at target",
			working:  5,
			target:   5,
			total:    5,
			expected: ActionNone,
		},
		{
			name:     "cleanup when idle",
			working:  0,
			target:   0,
			total:    0,
			expected: ActionCleanupState,
		},
		{
			name:     "scale up from zero",
			working:  0,
			target:   5,
			total:    0,
			expected: ActionScaleUp,
		},
		{
			name:     "scale up when working < target even if total = target",
			working:  3,
			target:   5,
			total:    5,
			expected: ActionScaleUp, // Should scale up because working < target
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := DetermineAction(tt.working, tt.target, tt.total)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestCalculateScalingDecision(t *testing.T) {
	q := queue.Queue{
		Name:              "test-queue",
		MaxWorkerCount:    10,
		WorkerConcurrency: 1,
	}

	tests := []struct {
		name               string
		stats              QueueStats
		connections        ConnectionState
		history            ScalingHistory
		rank               int
		total              int
		expectedAction     ScalingAction
		expectedTarget     int
		expectedNatural    int
		expectedConcurrent int
	}{
		{
			name: "scale up from zero",
			stats: QueueStats{
				Queued:  5,
				Claimed: 0,
				Stalled: 0,
			},
			connections: ConnectionState{
				Total:   0,
				Working: 0,
			},
			history: ScalingHistory{
				SmoothedTarget: 0,
				LastRawTarget:  0,
			},
			rank:               0,
			total:              1,
			expectedAction:     ActionScaleUp,
			expectedTarget:     5,
			expectedNatural:    5,
			expectedConcurrent: 5,
		},
		{
			name: "no scale down when all connections are working even if target is lower",
			stats: QueueStats{
				Queued:  0,
				Claimed: 0,
				Stalled: 0,
			},
			connections: ConnectionState{
				Total:   10,
				Working: 10,
			},
			history: ScalingHistory{
				SmoothedTarget: 10.0,
				LastRawTarget:  10,
			},
			rank:               0,
			total:              1,
			expectedAction:     ActionNone,
			expectedTarget:     9, // 10*0.9 + 0*0.1 = 9
			expectedNatural:    0,
			expectedConcurrent: 0,
		},
		{
			name: "scale down idle connections when working connections already at target",
			stats: QueueStats{
				Queued:  3,
				Claimed: 0,
				Stalled: 0,
			},
			connections: ConnectionState{
				Total:   5,
				Working: 3,
			},
			history: ScalingHistory{
				SmoothedTarget: 0,
				LastRawTarget:  0,
			},
			rank:               0,
			total:              1,
			expectedAction:     ActionScaleDown,
			expectedTarget:     3,
			expectedNatural:    3,
			expectedConcurrent: 3,
		},
		{
			name: "respect max worker count",
			stats: QueueStats{
				Queued:  100,
				Claimed: 0,
				Stalled: 0,
			},
			connections: ConnectionState{
				Total:   0,
				Working: 0,
			},
			history: ScalingHistory{
				SmoothedTarget: 0,
				LastRawTarget:  0,
			},
			rank:               0,
			total:              1,
			expectedAction:     ActionScaleUp,
			expectedTarget:     10, // capped at MaxWorkerCount
			expectedNatural:    100,
			expectedConcurrent: 100,
		},
		{
			name: "account for stalled jobs",
			stats: QueueStats{
				Queued:  10,
				Claimed: 5,
				Stalled: 3,
			},
			connections: ConnectionState{
				Total:   0,
				Working: 0,
			},
			history: ScalingHistory{
				SmoothedTarget: 0,
				LastRawTarget:  0,
			},
			rank:               0,
			total:              1,
			expectedAction:     ActionScaleUp,
			expectedTarget:     10, // capped at MaxWorkerCount
			expectedNatural:    12, // 10 + 5 - 3
			expectedConcurrent: 12,
		},
		{
			name: "fair share distribution",
			stats: QueueStats{
				Queued:  10,
				Claimed: 0,
				Stalled: 0,
			},
			connections: ConnectionState{
				Total:   0,
				Working: 0,
			},
			history: ScalingHistory{
				SmoothedTarget: 0,
				LastRawTarget:  0,
			},
			rank:               1,
			total:              3,
			expectedAction:     ActionScaleUp,
			expectedTarget:     3, // 10/3 = 3 base (rank 1 doesn't get remainder)
			expectedNatural:    10,
			expectedConcurrent: 10,
		},
		{
			name: "cleanup when idle",
			stats: QueueStats{
				Queued:  0,
				Claimed: 0,
				Stalled: 0,
			},
			connections: ConnectionState{
				Total:   0,
				Working: 0,
			},
			history: ScalingHistory{
				SmoothedTarget: 0,
				LastRawTarget:  0,
			},
			rank:               0,
			total:              1,
			expectedAction:     ActionCleanupState,
			expectedTarget:     0,
			expectedNatural:    0,
			expectedConcurrent: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			decision := CalculateScalingDecision(q, tt.stats, tt.connections, tt.history, tt.rank, tt.total)

			assert.Equal(t, tt.expectedAction, decision.Action, "action")
			assert.Equal(t, tt.expectedTarget, decision.TargetConnections, "target connections")
			assert.Equal(t, tt.expectedNatural, decision.NaturalQueueDepth, "natural queue depth")
			assert.Equal(t, tt.expectedConcurrent, decision.ConcurrentQueueDepth, "concurrent queue depth")
			assert.Equal(t, q.Name, decision.QueueName, "queue name")
			assert.NotEmpty(t, decision.Reason, "reason should be populated")
		})
	}
}

func TestCalculateScalingDecision_WithConcurrency(t *testing.T) {
	q := queue.Queue{
		Name:              "test-queue",
		MaxWorkerCount:    10,
		WorkerConcurrency: 2, // Each worker handles 2 jobs
	}

	decision := CalculateScalingDecision(
		q,
		QueueStats{Queued: 10, Claimed: 0, Stalled: 0},
		ConnectionState{Total: 0, Working: 0},
		ScalingHistory{SmoothedTarget: 0, LastRawTarget: 0},
		0,
		1,
	)

	assert.Equal(t, ActionScaleUp, decision.Action)
	assert.Equal(t, 5, decision.TargetConnections, "should need 5 workers for 10 jobs with concurrency 2")
	assert.Equal(t, 10, decision.NaturalQueueDepth)
	assert.Equal(t, 5, decision.ConcurrentQueueDepth)
}

// Benchmark to ensure pure functions are fast
func BenchmarkCalculateScalingDecision(b *testing.B) {
	q := queue.Queue{
		Name:              "test-queue",
		MaxWorkerCount:    10,
		WorkerConcurrency: 1,
	}
	stats := QueueStats{Queued: 5, Claimed: 0, Stalled: 0}
	connections := ConnectionState{Total: 3, Working: 3}
	history := ScalingHistory{SmoothedTarget: 3.0, LastRawTarget: 3}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = CalculateScalingDecision(q, stats, connections, history, 0, 1)
	}
}

func BenchmarkCalculateFairShare(b *testing.B) {
	for i := 0; i < b.N; i++ {
		_ = CalculateFairShare(0, 3, 10)
	}
}

func BenchmarkSmoothTarget(b *testing.B) {
	for i := 0; i < b.N; i++ {
		_ = SmoothTarget(10.0, 5, 10)
	}
}
