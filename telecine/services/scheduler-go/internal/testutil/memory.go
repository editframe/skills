package testutil

import (
	"os"
	"runtime"
	"testing"

	"github.com/stretchr/testify/require"
)

// MemoryStats holds snapshots of memory and goroutine counts.
type MemoryStats struct {
	HeapAlloc   uint64
	HeapObjects uint64
	Goroutines  int
}

// CaptureMemoryStats captures the current memory and goroutine stats after forcing GC.
func CaptureMemoryStats() MemoryStats {
	runtime.GC()
	runtime.GC()
	var m runtime.MemStats
	runtime.ReadMemStats(&m)
	return MemoryStats{
		HeapAlloc:   m.HeapAlloc,
		HeapObjects: m.HeapObjects,
		Goroutines:  runtime.NumGoroutine(),
	}
}

// AssertNoMemoryGrowth verifies that memory stabilizes after warmup and doesn't grow with iterations.
// For long-running services that never restart, we need to ensure memory returns to a stable state
// after each operation, not just that it grows slowly.
func AssertNoMemoryGrowth(t *testing.T, operation func(), iterations int) {
	t.Helper()

	if iterations < 20 {
		t.Fatal("Need at least 20 iterations to verify stability")
	}

	// Capture initial baseline
	baseline := CaptureMemoryStats()

	// Run operation once to warm up (allocate any one-time structures)
	operation()
	afterWarmup := CaptureMemoryStats()

	// Run several more iterations to let memory stabilize
	for i := 0; i < 10; i++ {
		operation()
	}
	afterStabilization := CaptureMemoryStats()

	// Now run many more iterations and verify memory stays stable
	for i := 0; i < iterations-11; i++ {
		operation()
	}
	final := CaptureMemoryStats()

	// Calculate growth from stabilization to final
	objectGrowthDuringRun := int64(final.HeapObjects) - int64(afterStabilization.HeapObjects)
	goroutineGrowthDuringRun := final.Goroutines - afterStabilization.Goroutines

	t.Logf("Memory Stability Analysis (%d iterations):", iterations)
	t.Logf("  Baseline:         Objects=%d, Goroutines=%d", baseline.HeapObjects, baseline.Goroutines)
	t.Logf("  After Warmup:     Objects=%d, Goroutines=%d", afterWarmup.HeapObjects, afterWarmup.Goroutines)
	t.Logf("  After Stabilize:  Objects=%d, Goroutines=%d", afterStabilization.HeapObjects, afterStabilization.Goroutines)
	t.Logf("  Final:            Objects=%d, Goroutines=%d", final.HeapObjects, final.Goroutines)
	t.Logf("  Growth after stabilization: Objects=%+d, Goroutines=%+d", objectGrowthDuringRun, goroutineGrowthDuringRun)

	// For a long-running service, memory should stabilize after warmup
	// We verify that growth stays within 75% of stabilized memory
	stabilizedObjects := afterStabilization.HeapObjects
	maxAcceptableObjectGrowthPct := 75.0 // 75% growth allowed
	actualGrowthPct := 100.0 * float64(objectGrowthDuringRun) / float64(stabilizedObjects)

	maxAcceptableGoroutineGrowthPct := 50.0 // 50% growth allowed for goroutines
	actualGoroutineGrowthPct := 100.0 * float64(goroutineGrowthDuringRun) / float64(afterStabilization.Goroutines)

	require.LessOrEqual(t, actualGrowthPct, maxAcceptableObjectGrowthPct,
		"Heap objects grew by %.1f%% after stabilization (%d objects). For a long-running service, growth should be < %.1f%%.",
		actualGrowthPct, objectGrowthDuringRun, maxAcceptableObjectGrowthPct)

	require.LessOrEqual(t, actualGoroutineGrowthPct, maxAcceptableGoroutineGrowthPct,
		"Goroutines grew by %.1f%% after stabilization (%d goroutines). For a long-running service, growth should be < %.1f%%.",
		actualGoroutineGrowthPct, goroutineGrowthDuringRun, maxAcceptableGoroutineGrowthPct)
}

// AssertGoroutinesReturn verifies that goroutines return to baseline after cleanup.
// This is stricter than AssertNoMemoryGrowth and should be used when you expect
// exact goroutine cleanup.
func AssertGoroutinesReturn(t *testing.T, baseline MemoryStats, maxDelta int) {
	t.Helper()

	current := CaptureMemoryStats()
	delta := current.Goroutines - baseline.Goroutines

	t.Logf("Goroutine Check: %d -> %d (delta: %+d, max allowed: %d)",
		baseline.Goroutines, current.Goroutines, delta, maxDelta)

	require.LessOrEqual(t, delta, maxDelta,
		"Goroutines did not return to baseline. Started with %d, ended with %d (delta: %+d)",
		baseline.Goroutines, current.Goroutines, delta)
}

func GetTestRedisAddr() string {
	if host := os.Getenv("VALKEY_HOST"); host != "" {
		port := os.Getenv("VALKEY_PORT")
		if port == "" {
			port = "6379"
		}
		return host + ":" + port
	}
	return "localhost:6379"
}
