package scaling

import (
	"fmt"
	"math"

	"github.com/editframe/telecine/scheduler/internal/queue"
)

const (
	// ScaleDownSmoothingFactor controls how quickly we scale down
	// 0.9 means target decays by ~10% per reconciliation cycle (every 2s)
	ScaleDownSmoothingFactor = 0.9
)

// CalculateScalingDecision is a pure function that determines what scaling action to take.
// It takes immutable inputs and returns an immutable decision.
// No I/O, no mutations, deterministic - easy to test.
func CalculateScalingDecision(
	q queue.Queue,
	stats QueueStats,
	connections ConnectionState,
	history ScalingHistory,
	rank, total int,
) ScalingDecision {
	// Calculate natural queue depth (work that needs to be done)
	naturalQueueDepth := stats.Queued + stats.Claimed - stats.Stalled

	// Convert to concurrent depth (accounting for worker concurrency)
	concurrentQueueDepth := int(math.Ceil(float64(naturalQueueDepth) / float64(q.WorkerConcurrency)))

	// Constrain to max worker count
	constrainedQueueDepth := min(concurrentQueueDepth, q.MaxWorkerCount)

	// Calculate this scheduler's fair share
	rawFairShare := CalculateFairShare(rank, total, constrainedQueueDepth)

	// Apply smoothing for scale-down
	smoothedTarget := SmoothTarget(history.SmoothedTarget, rawFairShare, history.LastRawTarget)

	// Determine action
	action := DetermineAction(connections.Working, int(smoothedTarget), connections.Total)

	// Build reason string
	reason := fmt.Sprintf(
		"natural=%d concurrent=%d constrained=%d raw=%d smoothed=%.1f working=%d total=%d",
		naturalQueueDepth, concurrentQueueDepth, constrainedQueueDepth,
		rawFairShare, smoothedTarget, connections.Working, connections.Total,
	)

	return ScalingDecision{
		QueueName:             q.Name,
		Action:                action,
		TargetConnections:     int(smoothedTarget),
		CurrentConnections:    connections.Total,
		WorkingConnections:    connections.Working,
		Reason:                reason,
		NewSmoothedTarget:     smoothedTarget,
		NaturalQueueDepth:     naturalQueueDepth,
		ConcurrentQueueDepth:  concurrentQueueDepth,
		ConstrainedQueueDepth: constrainedQueueDepth,
		RawFairShare:          rawFairShare,
	}
}

// CalculateFairShare distributes demand fairly across schedulers.
// Pure function: deterministic, no side effects.
func CalculateFairShare(rank, total, demand int) int {
	if total == 0 {
		return 0
	}

	baseShare := demand / total
	remainder := demand % total

	// Distribute remainder to lower-ranked schedulers
	if rank < remainder {
		return baseShare + 1
	}

	return baseShare
}

// SmoothTarget applies exponential smoothing to scale-down decisions.
// Scale up is immediate, scale down is gradual.
// Pure function: deterministic, no side effects.
func SmoothTarget(currentSmoothed float64, rawTarget, lastRawTarget int) float64 {
	// Scale up immediately
	if rawTarget > lastRawTarget {
		return float64(rawTarget)
	}

	// Scale down gradually using exponential smoothing
	return currentSmoothed*ScaleDownSmoothingFactor + float64(rawTarget)*(1-ScaleDownSmoothingFactor)
}

// DetermineAction decides what scaling action to take.
// Pure function: deterministic, no side effects.
func DetermineAction(working, target, total int) ScalingAction {
	if working < target {
		return ActionScaleUp
	}

	if total > target {
		return ActionScaleDown
	}

	// Clean up state when queue is idle
	if target == 0 && total == 0 {
		return ActionCleanupState
	}

	return ActionNone
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
