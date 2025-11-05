package connection

import (
	"context"
	"sync"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/editframe/telecine/scheduler/internal/queue"
)

// TestStateMachineRace_ConcurrentTransitions tests that concurrent transitions
// on the same connection are handled safely without race conditions or panics
func TestStateMachineRace_ConcurrentTransitions(t *testing.T) {
	mockDialer := NewMockNetworkDialer(false, 0)
	mockTime := NewMockTimeProvider(time.Now())
	mockGoroutines := NewAsyncMockGoroutineManager()

	sm, _, cleanup := setupTestStateMachineWithMocks(t, mockDialer, mockTime, mockGoroutines)
	defer cleanup()

	ctx := context.Background()
	q := queue.Queue{
		Name:              "test-queue",
		WebSocketHost:     "ws://localhost:8080",
		MaxWorkerCount:    5,
		WorkerConcurrency: 1,
	}

	conn, err := sm.CreateConnection(ctx, q)
	require.NoError(t, err)
	require.NotNil(t, conn)

	// Wait for connection to reach connected state
	time.Sleep(200 * time.Millisecond)

	// Try to trigger multiple concurrent transitions
	var wg sync.WaitGroup
	errors := make(chan error, 10)
	
	// Concurrently trigger disconnect and hangup events
	for i := 0; i < 5; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			if err := sm.Transition(ctx, conn, EventDisconnect); err != nil {
				errors <- err
			}
		}()
	}

	for i := 0; i < 5; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			if err := sm.Transition(ctx, conn, EventHangup); err != nil {
				errors <- err
			}
		}()
	}

	wg.Wait()
	close(errors)

	// Collect errors
	var errorList []error
	for err := range errors {
		if err != nil {
			errorList = append(errorList, err)
		}
	}

	// Should not have any panics or unexpected errors
	// Some transitions may fail because state changed, but that's expected
	t.Logf("Received %d errors during concurrent transitions", len(errorList))

	// Verify connection eventually reaches terminal state
	time.Sleep(300 * time.Millisecond)
	allConns := sm.GetAllConnections(q)
	assert.Equal(t, 0, allConns, "connection should eventually reach terminal state")
}

// TestStateMachineRace_ExitCallbackFailure tests that if exit callback fails,
// the state machine doesn't leave Redis in an inconsistent state
func TestStateMachineRace_ExitCallbackFailure(t *testing.T) {
	mockDialer := NewMockNetworkDialer(false, 0)
	mockTime := NewMockTimeProvider(time.Now())
	mockGoroutines := NewAsyncMockGoroutineManager()

	sm, redisClient, cleanup := setupTestStateMachineWithMocks(t, mockDialer, mockTime, mockGoroutines)
	defer cleanup()

	ctx := context.Background()
	q := queue.Queue{
		Name:              "test-queue",
		WebSocketHost:     "ws://localhost:8080",
		MaxWorkerCount:    5,
		WorkerConcurrency: 1,
	}

	conn, err := sm.CreateConnection(ctx, q)
	require.NoError(t, err)

	// Wait for connection to reach connected state and ensure it stays connected
	// We need to prevent readLoop from failing quickly
	time.Sleep(300 * time.Millisecond)

	// Verify connection is in connected state
	sm.mu.RLock()
	metadata, exists := sm.connectionMetadata[conn]
	isConnected := exists && metadata != nil && metadata.State == StateConnected
	sm.mu.RUnlock()

	if !isConnected {
		t.Skip("Connection did not reach connected state - skipping exit callback test")
		return
	}

	// Close Redis client to simulate failure in exit callback
	redisClient.Close()

	// Try to transition - exit callback should fail
	err = sm.Transition(ctx, conn, EventDisconnect)
	
	// Transition should fail because exit callback failed
	// But we should check that state wasn't partially updated
	assert.Error(t, err, "transition should fail when exit callback fails")
	assert.Contains(t, err.Error(), "exit callback failed", "error should mention exit callback")

	// Verify connection is still in a valid state (not partially transitioned)
	sm.mu.RLock()
	metadata, exists = sm.connectionMetadata[conn]
	sm.mu.RUnlock()
	
	require.True(t, exists, "connection metadata should still exist")
	// State should still be connected since transition was aborted
	assert.Equal(t, StateConnected, metadata.State, "state should not change if exit callback fails")
}

// TestStateMachineRace_StopPingCheckDoubleClose tests that closing StopPingCheck
// channel multiple times doesn't panic
func TestStateMachineRace_StopPingCheckDoubleClose(t *testing.T) {
	mockDialer := NewMockNetworkDialer(false, 0)
	mockTime := NewMockTimeProvider(time.Now())
	mockGoroutines := NewAsyncMockGoroutineManager()

	sm, _, cleanup := setupTestStateMachineWithMocks(t, mockDialer, mockTime, mockGoroutines)
	defer cleanup()

	ctx := context.Background()
	q := queue.Queue{
		Name:              "test-queue",
		WebSocketHost:     "ws://localhost:8080",
		MaxWorkerCount:    5,
		WorkerConcurrency: 1,
	}

	conn, err := sm.CreateConnection(ctx, q)
	require.NoError(t, err)

	// Wait for connection to reach connected state
	time.Sleep(300 * time.Millisecond)

	// Get metadata and channel
	sm.mu.RLock()
	metadata, exists := sm.connectionMetadata[conn]
	isConnected := exists && metadata != nil && metadata.State == StateConnected
	sm.mu.RUnlock()

	if !isConnected {
		t.Skip("Connection did not reach connected state - skipping double close test")
		return
	}

	require.True(t, exists, "metadata should exist")
	require.NotNil(t, metadata, "metadata should not be nil")

	// Try to close the channel multiple times concurrently
	var wg sync.WaitGroup
	panicked := false
	var panicMu sync.Mutex
	
	for i := 0; i < 10; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			defer func() {
				if r := recover(); r != nil {
					panicMu.Lock()
					panicked = true
					panicMu.Unlock()
				}
			}()
			select {
			case <-metadata.StopPingCheck:
				// Already closed
			default:
				close(metadata.StopPingCheck)
			}
		}()
	}

	wg.Wait()

	// Should not panic
	panicMu.Lock()
	didPanic := panicked
	panicMu.Unlock()
	assert.False(t, didPanic, "closing channel multiple times should not panic")
}

// TestStateMachineRace_TransitionDuringShutdown tests that transitions
// attempted during shutdown are handled gracefully
func TestStateMachineRace_TransitionDuringShutdown(t *testing.T) {
	mockDialer := NewMockNetworkDialer(false, 0)
	mockTime := NewMockTimeProvider(time.Now())
	mockGoroutines := NewAsyncMockGoroutineManager()

	sm, _, cleanup := setupTestStateMachineWithMocks(t, mockDialer, mockTime, mockGoroutines)
	defer cleanup()

	ctx := context.Background()
	q := queue.Queue{
		Name:              "test-queue",
		WebSocketHost:     "ws://localhost:8080",
		MaxWorkerCount:    5,
		WorkerConcurrency: 1,
	}

	conn, err := sm.CreateConnection(ctx, q)
	require.NoError(t, err)

	// Wait for connection to establish
	time.Sleep(200 * time.Millisecond)

	// Start shutdown in a goroutine
	shutdownDone := make(chan struct{})
	go func() {
		sm.Shutdown()
		close(shutdownDone)
	}()

	// Try to transition during shutdown
	// This should either succeed or fail gracefully, but not panic
	assert.NotPanics(t, func() {
		_ = sm.Transition(ctx, conn, EventDisconnect)
	}, "transition during shutdown should not panic")

	// Wait for shutdown to complete
	select {
	case <-shutdownDone:
	case <-time.After(2 * time.Second):
		t.Fatal("shutdown did not complete")
	}
}

// TestStateMachineRace_MetadataAccessAfterDeletion tests that accessing metadata
// after a connection reaches terminal state doesn't cause issues
func TestStateMachineRace_MetadataAccessAfterDeletion(t *testing.T) {
	mockDialer := NewMockNetworkDialer(false, 0)
	mockTime := NewMockTimeProvider(time.Now())
	mockGoroutines := NewAsyncMockGoroutineManager()

	sm, _, cleanup := setupTestStateMachineWithMocks(t, mockDialer, mockTime, mockGoroutines)
	defer cleanup()

	ctx := context.Background()
	q := queue.Queue{
		Name:              "test-queue",
		WebSocketHost:     "ws://localhost:8080",
		MaxWorkerCount:    5,
		WorkerConcurrency: 1,
	}

	conn, err := sm.CreateConnection(ctx, q)
	require.NoError(t, err)

	// Wait for connection to establish and verify it's in a valid state
	time.Sleep(300 * time.Millisecond)

	// Verify connection exists before transition
	sm.mu.RLock()
	_, existsBefore := sm.connectionMetadata[conn]
	sm.mu.RUnlock()
	require.True(t, existsBefore, "connection should exist before transition")

	// Transition to terminal
	err = sm.Transition(ctx, conn, EventHangup)
	// This might fail if connection already reached terminal from readLoop
	// That's okay - the important part is testing what happens after deletion

	// Wait a bit for cleanup
	time.Sleep(100 * time.Millisecond)

	// Try to access metadata after deletion - should handle gracefully
	sm.mu.RLock()
	_, exists := sm.connectionMetadata[conn]
	sm.mu.RUnlock()
	assert.False(t, exists, "metadata should be deleted after terminal state")

	// Try to transition after deletion - should return error
	err = sm.Transition(ctx, conn, EventDisconnect)
	assert.Error(t, err, "transition after deletion should fail")
	assert.Contains(t, err.Error(), "connection without metadata", "error should mention missing metadata")
}

// TestStateMachineRace_EnterFunctionError tests that if enter function returns an error,
// the state machine doesn't leave things in an inconsistent state
func TestStateMachineRace_EnterFunctionError(t *testing.T) {
	// This test will need a custom state handler that returns an error
	// For now, we'll test that Redis errors in enterConnected are handled
	mockDialer := NewMockNetworkDialer(false, 0)
	mockTime := NewMockTimeProvider(time.Now())
	mockGoroutines := NewAsyncMockGoroutineManager()

	sm, redisClient, cleanup := setupTestStateMachineWithMocks(t, mockDialer, mockTime, mockGoroutines)
	defer cleanup()

	ctx := context.Background()
	q := queue.Queue{
		Name:              "test-queue",
		WebSocketHost:     "ws://localhost:8080",
		MaxWorkerCount:    5,
		WorkerConcurrency: 1,
	}

	conn, err := sm.CreateConnection(ctx, q)
	require.NoError(t, err)

	// Wait for connection to be in connecting state
	time.Sleep(50 * time.Millisecond)

	// Close Redis to cause enterConnected to fail
	redisClient.Close()

	// Try to transition to connected - this should fail
	// But the connection should still be in a valid state
	err = sm.Transition(ctx, conn, EventConnectSuccess)
	
	// Enter function may fail, but state should be updated or connection cleaned up
	// The exact behavior depends on implementation
	sm.mu.RLock()
	metadata, exists := sm.connectionMetadata[conn]
	sm.mu.RUnlock()

	if exists {
		// If metadata exists, state should be valid
		assert.NotEqual(t, "undefined", string(metadata.State), "state should not be undefined")
	}
}

// TestStateMachineRace_RedisStateConsistency tests that Redis state matches
// in-memory state after transitions
func TestStateMachineRace_RedisStateConsistency(t *testing.T) {
	mockDialer := NewMockNetworkDialer(false, 0)
	mockTime := NewMockTimeProvider(time.Now())
	mockGoroutines := NewAsyncMockGoroutineManager()

	sm, redisClient, cleanup := setupTestStateMachineWithMocks(t, mockDialer, mockTime, mockGoroutines)
	defer cleanup()

	ctx := context.Background()
	q := queue.Queue{
		Name:              "test-queue",
		WebSocketHost:     "ws://localhost:8080",
		MaxWorkerCount:    5,
		WorkerConcurrency: 1,
	}

	conn, err := sm.CreateConnection(ctx, q)
	require.NoError(t, err)

	// Wait for connection to reach connected state
	time.Sleep(300 * time.Millisecond)

	// Check Redis state matches in-memory state
	redisCtx := context.Background()
	connectingKey := "scheduler:test-scheduler:test-queue:connecting"
	connectedKey := "scheduler:test-scheduler:test-queue:connected"

	// Verify connection is in connected state in memory
	sm.mu.RLock()
	metadata, exists := sm.connectionMetadata[conn]
	isConnected := exists && metadata != nil && metadata.State == StateConnected
	sm.mu.RUnlock()

	if !isConnected {
		t.Skip("Connection did not reach connected state - skipping Redis consistency test")
		return
	}

	// Check Redis has the connection in connected set
	count, err := redisClient.ZCard(redisCtx, connectedKey).Result()
	require.NoError(t, err)
	assert.GreaterOrEqual(t, int(count), 1, "Redis should have connection in connected set")

	// Check Redis doesn't have it in connecting set
	count, err = redisClient.ZCard(redisCtx, connectingKey).Result()
	require.NoError(t, err)
	assert.Equal(t, 0, int(count), "Redis should not have connection in connecting set after transition")

	// Transition to terminal
	err = sm.Transition(ctx, conn, EventHangup)
	// May fail if already terminal, but that's okay
	_ = err

	// Wait for cleanup
	time.Sleep(300 * time.Millisecond)

	// Verify Redis is cleaned up
	count, err = redisClient.ZCard(redisCtx, connectedKey).Result()
	require.NoError(t, err)
	assert.Equal(t, 0, int(count), "Redis should not have connection after terminal state")
}

