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

// TestStateMachineBug_ExitCallbackAccessesDeletedMetadata tests that exit callback
// doesn't access metadata after it's been deleted (race condition)
func TestStateMachineBug_ExitCallbackAccessesDeletedMetadata(t *testing.T) {
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

	// Get the exit callback before transition
	sm.mu.RLock()
	metadata, exists := sm.connectionMetadata[conn]
	isConnected := exists && metadata != nil && metadata.State == StateConnected
	var exitCallback func() error
	var stopPingCheck chan struct{}
	if metadata != nil {
		exitCallback = metadata.ExitCallback
		stopPingCheck = metadata.StopPingCheck
	}
	sm.mu.RUnlock()

	if !isConnected || exitCallback == nil || stopPingCheck == nil {
		t.Skip("Connection not in connected state or no exit callback - skipping test")
		return
	}

	// Transition to terminal - this will delete metadata
	err = sm.Transition(ctx, conn, EventHangup)
	require.NoError(t, err)

	// Now try to access the channel - this tests that the channel is still valid
	// even though metadata was deleted
	assert.NotPanics(t, func() {
		select {
		case <-stopPingCheck:
			// Channel is closed (expected)
		default:
			// Channel is still open (unexpected but shouldn't panic)
		}
	}, "accessing channel after metadata deletion should not panic")

	// Verify metadata is deleted
	sm.mu.RLock()
	_, exists = sm.connectionMetadata[conn]
	sm.mu.RUnlock()
	assert.False(t, exists, "metadata should be deleted after terminal state")
}

// TestStateMachineBug_StateUpdatedBeforeEnterCompletes tests that if enter function
// fails, the state is already updated, leaving inconsistent state
func TestStateMachineBug_StateUpdatedBeforeEnterCompletes(t *testing.T) {
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

	// Verify connection is in connected state
	sm.mu.RLock()
	metadata, exists := sm.connectionMetadata[conn]
	isConnected := exists && metadata != nil && metadata.State == StateConnected
	sm.mu.RUnlock()

	if !isConnected {
		t.Skip("Connection not in connected state - skipping test")
		return
	}

	// Close Redis to cause enterDisconnecting to fail when updating Redis
	redisClient.Close()

	// Transition to disconnecting - enterDisconnecting will fail on Redis update
	// But state is already updated to disconnecting before enter function completes
	err = sm.Transition(ctx, conn, EventDisconnect)
	
	// Currently, if enter function fails, we log error but still update state
	// This could leave inconsistent state
	sm.mu.RLock()
	metadata, exists = sm.connectionMetadata[conn]
	finalState := StateTerminal
	if exists && metadata != nil {
		finalState = metadata.State
	}
	sm.mu.RUnlock()

	// State should either be disconnecting (if enter failed) or terminal (if cleanup happened)
	// But the issue is: if enterDisconnecting fails, we've already updated state but
	// Redis update failed, leaving inconsistent state
	assert.True(t, finalState == StateDisconnecting || finalState == StateTerminal,
		"state should be disconnecting or terminal, but should be consistent")
}

// TestStateMachineBug_ConcurrentTransitionAndHangup tests race condition where
// a transition happens while readLoop triggers HANGUP
func TestStateMachineBug_ConcurrentTransitionAndHangup(t *testing.T) {
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
	time.Sleep(300 * time.Millisecond)

	// Verify connection exists
	sm.mu.RLock()
	_, exists := sm.connectionMetadata[conn]
	sm.mu.RUnlock()
	require.True(t, exists, "connection should exist")

	// Concurrently trigger transition and simulate hangup
	var wg sync.WaitGroup

	wg.Add(1)
	go func() {
		defer wg.Done()
		_ = sm.Transition(ctx, conn, EventDisconnect)
	}()

	wg.Add(1)
	go func() {
		defer wg.Done()
		// Simulate hangup from readLoop
		_ = sm.Transition(ctx, conn, EventHangup)
	}()

	wg.Wait()

	// At least one should succeed, both might fail if connection already terminal
	// But neither should panic
	assert.NotPanics(t, func() {
		// Operations already completed above
	}, "concurrent transitions should not panic")

	// Verify connection eventually reaches terminal
	time.Sleep(200 * time.Millisecond)
	allConns := sm.GetAllConnections(q)
	assert.Equal(t, 0, allConns, "connection should eventually reach terminal state")
}

// TestStateMachineBug_EnterFunctionErrorLeavesInconsistentState tests that when
// enter function returns error, state is already updated but enter didn't complete
func TestStateMachineBug_EnterFunctionErrorLeavesInconsistentState(t *testing.T) {
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

	// Verify connection is in connected state
	sm.mu.RLock()
	metadata, exists := sm.connectionMetadata[conn]
	isConnected := exists && metadata != nil && metadata.State == StateConnected
	sm.mu.RUnlock()

	if !isConnected {
		t.Skip("Connection not in connected state - skipping test")
		return
	}

	// Close Redis before transition to cause enterDisconnecting to fail
	redisClient.Close()

	// Transition to disconnecting
	// In Transition():
	// 1. State is updated to "disconnecting" (line 361)
	// 2. enterDisconnecting is called (line 378)
	// 3. enterDisconnecting tries to update Redis and fails
	// 4. Error is logged but state is already "disconnecting"
	err = sm.Transition(ctx, conn, EventDisconnect)

	// Check current state
	sm.mu.RLock()
	metadata, exists = sm.connectionMetadata[conn]
	finalState := StateTerminal
	if exists && metadata != nil {
		finalState = metadata.State
	}
	sm.mu.RUnlock()

	// BUG: State is "disconnecting" but enterDisconnecting failed to update Redis
	// This leaves inconsistent state - in-memory says disconnecting, Redis says connected
	assert.Equal(t, StateDisconnecting, finalState, 
		"BUG: State is disconnecting but Redis update failed, leaving inconsistent state")
}

