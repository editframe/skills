package connection

import (
	"sync/atomic"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestMockGoroutineManager_Spawn(t *testing.T) {
	mgr := NewMockGoroutineManager()

	executed := false
	err := mgr.Spawn("test-1", func() {
		executed = true
	})

	require.NoError(t, err)
	assert.True(t, executed, "function should execute synchronously")

	executions := mgr.GetExecutions()
	assert.Len(t, executions, 1)
	assert.Equal(t, "test-1", executions[0])
}

func TestMockGoroutineManager_MultipleSpawns(t *testing.T) {
	mgr := NewMockGoroutineManager()

	count := 0
	for i := 0; i < 5; i++ {
		err := mgr.Spawn("test", func() {
			count++
		})
		require.NoError(t, err)
	}

	assert.Equal(t, 5, count)

	executions := mgr.GetExecutions()
	assert.Len(t, executions, 5)
}

func TestMockGoroutineManager_Wait(t *testing.T) {
	mgr := NewMockGoroutineManager()

	err := mgr.Spawn("test", func() {
		// No-op
	})
	require.NoError(t, err)

	// Should return immediately (synchronous execution)
	result := mgr.Wait("test", 1*time.Second)
	assert.True(t, result)
}

func TestMockGoroutineManager_WaitAll(t *testing.T) {
	mgr := NewMockGoroutineManager()

	for i := 0; i < 3; i++ {
		err := mgr.Spawn("test", func() {
			// No-op
		})
		require.NoError(t, err)
	}

	// Should return immediately (synchronous execution)
	result := mgr.WaitAll(1 * time.Second)
	assert.True(t, result)
}

func TestMockGoroutineManager_Count(t *testing.T) {
	mgr := NewMockGoroutineManager()

	// Mock manager always returns 0 (synchronous execution)
	assert.Equal(t, 0, mgr.Count())

	err := mgr.Spawn("test", func() {})
	require.NoError(t, err)

	assert.Equal(t, 0, mgr.Count())
}

func TestRealGoroutineManager_Spawn(t *testing.T) {
	mgr := NewRealGoroutineManager()

	var executed atomic.Bool
	err := mgr.Spawn("test-1", func() {
		time.Sleep(10 * time.Millisecond)
		executed.Store(true)
	})

	require.NoError(t, err)

	// Wait for goroutine to complete
	time.Sleep(50 * time.Millisecond)
	assert.True(t, executed.Load())
}

func TestRealGoroutineManager_Count(t *testing.T) {
	mgr := NewRealGoroutineManager()

	assert.Equal(t, 0, mgr.Count())

	// Spawn a long-running goroutine
	done := make(chan struct{})
	err := mgr.Spawn("test-1", func() {
		<-done
	})
	require.NoError(t, err)

	// Should have 1 active goroutine
	time.Sleep(10 * time.Millisecond)
	assert.Equal(t, 1, mgr.Count())

	// Signal completion
	close(done)
	time.Sleep(10 * time.Millisecond)

	// Should be back to 0
	assert.Equal(t, 0, mgr.Count())
}

func TestRealGoroutineManager_Wait(t *testing.T) {
	mgr := NewRealGoroutineManager()

	done := make(chan struct{})
	err := mgr.Spawn("test-1", func() {
		time.Sleep(50 * time.Millisecond)
		close(done)
	})
	require.NoError(t, err)

	// Wait should succeed
	result := mgr.Wait("test-1", 200*time.Millisecond)
	assert.True(t, result)

	// Verify goroutine actually completed
	select {
	case <-done:
		// Success
	case <-time.After(100 * time.Millisecond):
		t.Fatal("Goroutine should have completed")
	}
}

func TestRealGoroutineManager_WaitAll(t *testing.T) {
	mgr := NewRealGoroutineManager()

	count := 3
	for i := 0; i < count; i++ {
		err := mgr.Spawn("test", func() {
			time.Sleep(20 * time.Millisecond)
		})
		require.NoError(t, err)
	}

	// WaitAll should wait for all goroutines
	result := mgr.WaitAll(200 * time.Millisecond)
	assert.True(t, result)

	// All should be complete
	assert.Equal(t, 0, mgr.Count())
}

func TestRealGoroutineManager_Stop(t *testing.T) {
	mgr := NewRealGoroutineManager()

	stopped := false
	err := mgr.Spawn("test-1", func() {
		// Goroutine doesn't check stop signal in this test
		// Just testing that Stop doesn't panic
		time.Sleep(10 * time.Millisecond)
		stopped = true
	})
	require.NoError(t, err)

	// Stop should not panic
	mgr.Stop("test-1")

	time.Sleep(50 * time.Millisecond)
	assert.True(t, stopped)
}

func TestRealGoroutineManager_StopAll(t *testing.T) {
	mgr := NewRealGoroutineManager()

	for i := 0; i < 3; i++ {
		err := mgr.Spawn("test", func() {
			time.Sleep(10 * time.Millisecond)
		})
		require.NoError(t, err)
	}

	// StopAll should not panic
	mgr.StopAll()

	// Wait for goroutines to finish
	result := mgr.WaitAll(200 * time.Millisecond)
	assert.True(t, result)
}
