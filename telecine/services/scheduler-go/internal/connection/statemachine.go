package connection

import (
	"context"
	"fmt"
	"sync"
	"time"

	goredis "github.com/redis/go-redis/v9"
	"github.com/rs/zerolog"

	"github.com/editframe/telecine/scheduler/internal/connection/transitions"
	"github.com/editframe/telecine/scheduler/internal/queue"
	"github.com/editframe/telecine/scheduler/internal/redis"
)

// Context Usage Strategy:
//
// This package uses context.Background() for state transitions triggered by
// asynchronous events (HANGUP, TIMEOUT, NO_PONG, DISCONNECT_SUCCESS, CONNECT_SUCCESS)
// because these events are not tied to the lifecycle of the parent context that
// initiated the connection. They represent independent state changes triggered by
// network events, timeouts, or completion of async operations.
//
// The parent context (from CreateConnection or external callers) is used for:
// - Redis operations during state entry (updateRedisState, removeFromRedisState)
// - Cancellation of in-progress operations when the parent is cancelled
//
// This separation ensures that:
// 1. Network-driven state changes complete even if the caller's context is cancelled
// 2. Redis operations respect the caller's cancellation/timeout requirements
// 3. Goroutines can safely trigger transitions without coupling to parent lifecycle

// Constants for timeouts and retry logic
const (
	// PingCheckInterval is the interval between ping checks for connected workers
	PingCheckInterval = 5 * time.Second

	// DisconnectTimeout is the maximum time to wait for graceful disconnect
	DisconnectTimeout = 30 * time.Second

	// RedisRetryMaxAttempts is the maximum number of retry attempts for Redis operations
	RedisRetryMaxAttempts = 3

	// RedisRetryBaseBackoff is the base backoff duration for Redis retry (exponential backoff)
	RedisRetryBaseBackoff = 100 * time.Millisecond
)

type ConnectionState string

const (
	StateConnecting    ConnectionState = "connecting"
	StateConnected     ConnectionState = "connected"
	StateDisconnecting ConnectionState = "disconnecting"
	StateTerminal      ConnectionState = "terminal"
)

type ConnectionEvent string

const (
	EventInit              ConnectionEvent = "INIT"
	EventConnectSuccess    ConnectionEvent = "CONNECT_SUCCESS"
	EventTimeout           ConnectionEvent = "TIMEOUT"
	EventHangup            ConnectionEvent = "HANGUP"
	EventDisconnect        ConnectionEvent = "DISCONNECT"
	EventNoPong            ConnectionEvent = "NO_PONG"
	EventDisconnectSuccess ConnectionEvent = "DISCONNECT_SUCCESS"
)

// StateHandler defines what happens when entering/exiting a connection state
type StateHandler struct {
	ValidEvents map[ConnectionEvent]ConnectionState
	Enter       func(ctx context.Context, conn *WorkerConnection, sm *StateMachine) (func() error, error)
}

// ConnectionMetadata tracks per-connection state and cleanup functions
type ConnectionMetadata struct {
	State          ConnectionState
	ExitCallback   func() error
	WaitingForPong bool
	StopPingCheck  chan struct{}
}

type StateMachine struct {
	schedulerID string
	client      *redis.Client
	logger      *zerolog.Logger

	// Connection metadata - single source of truth for connection state
	// This replaces the separate connectingConnections, connectedConnections,
	// and disconnectingConnections maps to eliminate duplicate state tracking
	connectionMetadata map[*WorkerConnection]*ConnectionMetadata

	// State machine definition
	stateMachine map[ConnectionState]*StateHandler

	// Shutdown control
	shutdown     chan struct{}
	shutdownOnce sync.Once

	// Injected dependencies
	dialer       NetworkDialer
	timeProvider TimeProvider
	goroutineMgr GoroutineManager

	mu sync.RWMutex // Protects all maps
}

// StateMachineOption is a functional option for configuring StateMachine
type StateMachineOption func(*StateMachine)

// WithNetworkDialer sets a custom network dialer (for testing)
func WithNetworkDialer(d NetworkDialer) StateMachineOption {
	return func(sm *StateMachine) {
		sm.dialer = d
	}
}

// WithTimeProvider sets a custom time provider (for testing)
func WithTimeProvider(t TimeProvider) StateMachineOption {
	return func(sm *StateMachine) {
		sm.timeProvider = t
	}
}

// WithGoroutineManager sets a custom goroutine manager (for testing)
func WithGoroutineManager(g GoroutineManager) StateMachineOption {
	return func(sm *StateMachine) {
		sm.goroutineMgr = g
	}
}

func NewStateMachine(schedulerID string, client *redis.Client, logger *zerolog.Logger, opts ...StateMachineOption) *StateMachine {
	sm := &StateMachine{
		schedulerID:        schedulerID,
		client:             client,
		logger:             logger,
		connectionMetadata: make(map[*WorkerConnection]*ConnectionMetadata),
		shutdown:           make(chan struct{}),
		// Default to real implementations
		dialer:       NewRealNetworkDialer(20 * time.Second),
		timeProvider: NewRealTimeProvider(),
		goroutineMgr: NewRealGoroutineManager(),
	}

	// Apply functional options
	for _, opt := range opts {
		opt(sm)
	}

	// Initialize state machine definition (matches TypeScript connectionMachine)
	sm.stateMachine = map[ConnectionState]*StateHandler{
		StateConnecting: {
			ValidEvents: map[ConnectionEvent]ConnectionState{
				EventConnectSuccess: StateConnected,
				EventTimeout:        StateTerminal,
				EventHangup:         StateTerminal,
			},
			Enter: sm.enterConnecting,
		},
		StateConnected: {
			ValidEvents: map[ConnectionEvent]ConnectionState{
				EventNoPong:     StateDisconnecting,
				EventDisconnect: StateDisconnecting,
				EventHangup:     StateTerminal,
			},
			Enter: sm.enterConnected,
		},
		StateDisconnecting: {
			ValidEvents: map[ConnectionEvent]ConnectionState{
				EventDisconnectSuccess: StateTerminal,
				EventTimeout:           StateTerminal,
				EventHangup:            StateTerminal,
			},
			Enter: sm.enterDisconnecting,
		},
		StateTerminal: {
			ValidEvents: map[ConnectionEvent]ConnectionState{},
			Enter:       sm.enterTerminal,
		},
	}

	return sm
}

// Shutdown gracefully shuts down the state machine
func (sm *StateMachine) Shutdown() {
	sm.shutdownOnce.Do(func() {
		close(sm.shutdown)
		sm.logger.Info().Msg("State machine shutdown initiated")

		// Stop all tracked goroutines deterministically
		sm.goroutineMgr.StopAll()

		// Wait for goroutines to finish with a shorter timeout for tests
		if !sm.goroutineMgr.WaitAll(1 * time.Second) {
			sm.logger.Warn().Msg("timeout waiting for goroutines to stop during shutdown")
		}

		// Terminate all connections to clean up goroutines
		sm.mu.Lock()
		connectionCount := len(sm.connectionMetadata)
		sm.logger.Info().Int("connectionCount", connectionCount).Msg("terminating connections")

		for conn := range sm.connectionMetadata {
			conn.Terminate()
			// Clean up all goroutines associated with this connection
			sm.cleanupConnectionGoroutines(conn)
		}
		sm.mu.Unlock()

		sm.logger.Info().Msg("State machine shutdown completed")
	})
}

// IsShutdown returns true if the state machine is shutting down
func (sm *StateMachine) IsShutdown() bool {
	select {
	case <-sm.shutdown:
		return true
	default:
		return false
	}
}

// cleanupConnectionGoroutines removes all goroutines associated with a connection
func (sm *StateMachine) cleanupConnectionGoroutines(conn *WorkerConnection) {
	// Stop all goroutines that match this connection's ID patterns
	// The goroutine manager handles all tracking and cleanup
	// Note: WorkerConnection spawns read-%s and ping-%s goroutines that must be cleaned up
	patterns := []string{
		fmt.Sprintf("connect-%s", conn.ID),
		fmt.Sprintf("connect-shutdown-monitor-%s", conn.ID),
		fmt.Sprintf("ping-%s", conn.ID),          // StateMachine ping check
		fmt.Sprintf("ping-monitor-%s", conn.ID),  // StateMachine ping monitor
		fmt.Sprintf("read-%s", conn.ID),          // WorkerConnection readLoop
		fmt.Sprintf("disconnect-%s", conn.ID),
		fmt.Sprintf("disconnect-worker-%s", conn.ID),
	}

	for _, pattern := range patterns {
		sm.goroutineMgr.Stop(pattern)
	}
}

// WaitForConnectionCleanup waits for all goroutines associated with a connection to finish
func (sm *StateMachine) WaitForConnectionCleanup(conn *WorkerConnection, timeout time.Duration) bool {
	patterns := []string{
		fmt.Sprintf("connect-%s", conn.ID),
		fmt.Sprintf("connect-shutdown-monitor-%s", conn.ID),
		fmt.Sprintf("ping-%s", conn.ID),          // StateMachine ping check
		fmt.Sprintf("ping-monitor-%s", conn.ID),  // StateMachine ping monitor
		fmt.Sprintf("read-%s", conn.ID),          // WorkerConnection readLoop
		fmt.Sprintf("disconnect-%s", conn.ID),
		fmt.Sprintf("disconnect-worker-%s", conn.ID),
	}

	// Wait for each goroutine pattern to complete
	for _, pattern := range patterns {
		if !sm.goroutineMgr.Wait(pattern, timeout) {
			return false
		}
	}

	return true
}

func (sm *StateMachine) CreateConnection(ctx context.Context, q queue.Queue) (*WorkerConnection, error) {
	var conn *WorkerConnection
	var err error

	conn, err = NewWorkerConnection(q, sm.logger, func() {
		sm.Transition(ctx, conn, EventHangup)
	}, func() {
		sm.HandlePong(ctx, conn)
	}, sm.dialer, sm.timeProvider, sm.goroutineMgr)
	if err != nil {
		return nil, err
	}

	sm.mu.Lock()
	// Initialize with undefined state, matching TypeScript approach
	sm.connectionMetadata[conn] = &ConnectionMetadata{
		State:         "undefined", // Start in undefined state like TypeScript
		StopPingCheck: make(chan struct{}),
	}
	sm.mu.Unlock()

	// Perform initial state transition synchronously to avoid race conditions
	if err := sm.Transition(ctx, conn, EventInit); err != nil {
		sm.mu.Lock()
		delete(sm.connectionMetadata, conn)
		sm.mu.Unlock()
		return nil, err
	}

	return conn, nil
}

func (sm *StateMachine) Transition(ctx context.Context, conn *WorkerConnection, event ConnectionEvent) error {
	sm.mu.Lock()
	defer sm.mu.Unlock()

	// Get metadata - it must exist for valid connections
	// If metadata doesn't exist, it indicates a programming error (e.g., transition
	// attempted on a connection that was already cleaned up or never initialized)
	metadata, ok := sm.connectionMetadata[conn]
	if !ok {
		return fmt.Errorf("transition attempted on connection without metadata (conn=%s, event=%s) - connection may have been cleaned up or never initialized", conn.ID, event)
	}

	currentState := metadata.State

	// Use pure function to calculate next state
	transitionResult := transitions.CalculateNextState(
		transitions.State(currentState),
		transitions.Event(event),
	)

	if !transitionResult.Valid {
		// Match TypeScript behavior: log error and return early without doing anything
		// TypeScript comment: "I don't love just letting this pass, but we'll log the errors and see
		// if we learn more about what causes them. But throwing here crashes the server"
		sm.logger.Error().
			Str("currentState", string(currentState)).
			Str("event", string(event)).
			Str("connectionID", conn.ID).
			Str("queue", conn.Queue.Name).
			Str("reason", transitionResult.Reason).
			Msg("invalid state transition")

		// Just return like TypeScript does - don't force cleanup, don't error
		return nil
	}

	newState := ConnectionState(transitionResult.NextState)

	sm.logger.Debug().
		Str("connectionID", conn.ID).
		Str("queue", conn.Queue.Name).
		Str("currentState", string(currentState)).
		Str("newState", string(newState)).
		Str("event", string(event)).
		Msgf("connection state transition [conn=%s queue=%s %s->%s event=%s]", conn.ID, conn.Queue.Name, string(currentState), string(newState), string(event))

	// Call exit callback for current state
	// If exit callback fails, we should not proceed with the transition
	// This prevents leaving stale state in Redis
	if metadata.ExitCallback != nil {
		if err := metadata.ExitCallback(); err != nil {
			sm.logger.Error().
				Err(err).
				Str("connectionID", conn.ID).
				Msg("error in exit callback, aborting transition")
			return fmt.Errorf("exit callback failed: %w", err)
		}
		metadata.ExitCallback = nil
	}

	// Store old state in case we need to roll back
	oldState := metadata.State

	// Call enter function for new state BEFORE updating state
	// This ensures that if enter function fails, we haven't updated state yet
	// preventing inconsistent state between in-memory and Redis
	var exitCallback func() error
	if newStateHandler, exists := sm.stateMachine[newState]; exists && newStateHandler.Enter != nil {
		var err error
		exitCallback, err = newStateHandler.Enter(ctx, conn, sm)
		if err != nil {
			sm.logger.Error().
				Err(err).
				Str("connectionID", conn.ID).
				Str("currentState", string(oldState)).
				Str("newState", string(newState)).
				Msg("error in enter function, aborting transition")
			// State was not updated, so we can safely return error
			return fmt.Errorf("enter function failed: %w", err)
		}
	}

	// Only update state after enter function succeeds
	// This ensures state consistency between in-memory and Redis
	metadata.State = newState
	metadata.ExitCallback = exitCallback

	// Clean up terminal connections after enter function completes and state is updated
	if newState == StateTerminal {
		delete(sm.connectionMetadata, conn)
	}

	return nil
}

// State enter functions (matching TypeScript pattern)
func (sm *StateMachine) enterConnecting(ctx context.Context, conn *WorkerConnection, stateMachine *StateMachine) (func() error, error) {
	sm.logger.Debug().
		Str("connectionID", conn.ID).
		Str("queue", conn.Queue.Name).
		Msgf("entering connecting state [conn=%s queue=%s]", conn.ID, conn.Queue.Name)

	// Update Redis state
	now := time.Now().UnixMilli()
	if err := sm.updateRedisState(ctx, conn, StateConnecting, now); err != nil {
		return nil, fmt.Errorf("failed to update Redis state: %w", err)
	}

	// Start connection process using goroutine manager
	goroutineID := fmt.Sprintf("connect-%s", conn.ID)

	sm.goroutineMgr.Spawn(goroutineID, func() {
		sm.logger.Debug().
			Str("connectionID", conn.ID).
			Str("queue", conn.Queue.Name).
			Msgf("starting connection attempt [conn=%s queue=%s]", conn.ID, conn.Queue.Name)

		// Create a context that cancels on shutdown
		// This eliminates the need for a separate monitor goroutine
		connectCtx, cancel := context.WithCancel(ctx)
		defer cancel()

	// Monitor shutdown signal and cancel context if triggered
	shutdownMonitorID := fmt.Sprintf("connect-shutdown-monitor-%s", conn.ID)
	sm.goroutineMgr.Spawn(shutdownMonitorID, func() {
		select {
		case <-sm.shutdown:
			cancel()
		case <-connectCtx.Done():
		}
	})

		// Connect directly (no separate goroutine needed - conn.Connect respects context)
		if err := conn.Connect(connectCtx); err != nil {
			select {
			case <-connectCtx.Done():
				sm.logger.Debug().
					Str("connectionID", conn.ID).
					Str("queue", conn.Queue.Name).
					Msg("connection attempt cancelled due to shutdown")
			default:
				sm.logger.Error().
					Err(err).
					Str("connectionID", conn.ID).
					Str("queue", conn.Queue.Name).
					Msg("failed to connect")
				sm.Transition(context.Background(), conn, EventTimeout)
			}
			return
		}

		// Wait for connection directly (no separate goroutine needed)
		if err := conn.WaitForConnection(); err != nil {
			select {
			case <-connectCtx.Done():
				sm.logger.Debug().
					Str("connectionID", conn.ID).
					Str("queue", conn.Queue.Name).
					Msg("connection wait cancelled due to shutdown")
			default:
				sm.logger.Error().
					Err(err).
					Str("connectionID", conn.ID).
					Str("queue", conn.Queue.Name).
					Msg("wait for connection failed")
				sm.Transition(context.Background(), conn, EventTimeout)
			}
			return
		}

		sm.logger.Debug().
			Str("connectionID", conn.ID).
			Str("queue", conn.Queue.Name).
			Msg("connection established, transitioning to connected")

		// Check if connection is still valid before transitioning.
		// This prevents a race where HANGUP/TIMEOUT transitions the connection to TERMINAL
		// before this goroutine runs. The goroutine executes asynchronously after the
		// parent Transition() releases sm.mu, so this RLock is safe (no deadlock risk).
		sm.mu.RLock()
		metadata, exists := sm.connectionMetadata[conn]
		isTerminal := !exists || metadata.State == StateTerminal
		sm.mu.RUnlock()

		if !isTerminal {
			sm.Transition(context.Background(), conn, EventConnectSuccess)
		}
	})

	// Return exit callback that removes from Redis
	return func() error {
		if err := sm.removeFromRedisState(ctx, conn, StateConnecting); err != nil {
			sm.logger.Error().
				Err(err).
				Str("connectionID", conn.ID).
				Msg("failed to remove from Redis connecting state")
			return err
		}
		return nil
	}, nil
}

func (sm *StateMachine) enterConnected(ctx context.Context, conn *WorkerConnection, stateMachine *StateMachine) (func() error, error) {
	sm.logger.Debug().
		Str("connectionID", conn.ID).
		Str("queue", conn.Queue.Name).
		Msgf("entering connected state [conn=%s queue=%s]", conn.ID, conn.Queue.Name)

	// Update Redis state
	now := time.Now().UnixMilli()
	if err := sm.updateRedisState(ctx, conn, StateConnected, now); err != nil {
		return nil, fmt.Errorf("failed to update Redis state: %w", err)
	}

	// Get metadata for ping check setup
	// Note: This is called from Transition() which holds sm.mu.Lock(),
	// so accessing connectionMetadata is safe. However, we should still check
	// that metadata exists since it could theoretically be deleted by another
	// transition in the same call stack (though unlikely due to lock).
	metadata := sm.connectionMetadata[conn]
	if metadata == nil {
		return nil, fmt.Errorf("metadata not found for connection")
	}

	// Start ping check
	pingGoroutineID := fmt.Sprintf("ping-%s", conn.ID)
	sm.goroutineMgr.Spawn(pingGoroutineID, func() {
		sm.startPingCheck(ctx, conn, metadata)
	})

	// Return exit callback that stops ping check and removes from Redis
	return func() error {
		sm.logger.Debug().
			Str("connectionID", conn.ID).
			Str("queue", conn.Queue.Name).
			Msgf("exiting connected state [conn=%s queue=%s]", conn.ID, conn.Queue.Name)

		// Stop ping check
		select {
		case <-metadata.StopPingCheck:
			// Already closed
		default:
			close(metadata.StopPingCheck)
		}
		metadata.WaitingForPong = false

		if err := sm.removeFromRedisState(ctx, conn, StateConnected); err != nil {
			sm.logger.Error().
				Err(err).
				Str("connectionID", conn.ID).
				Msg("failed to remove from Redis connected state")
			return err
		}
		return nil
	}, nil
}

func (sm *StateMachine) enterDisconnecting(ctx context.Context, conn *WorkerConnection, stateMachine *StateMachine) (func() error, error) {
	sm.logger.Debug().
		Str("connectionID", conn.ID).
		Str("queue", conn.Queue.Name).
		Msg("entering disconnecting state")

	// Update Redis state
	now := time.Now().UnixMilli()
	if err := sm.updateRedisState(ctx, conn, StateDisconnecting, now); err != nil {
		return nil, fmt.Errorf("failed to update Redis state: %w", err)
	}

	// Start graceful disconnect process with timeout
	goroutineID := fmt.Sprintf("disconnect-%s", conn.ID)

	sm.goroutineMgr.Spawn(goroutineID, func() {
		sm.logger.Debug().
			Str("connectionID", conn.ID).
			Str("queue", conn.Queue.Name).
			Msg("starting graceful disconnect")

		// Create a context with timeout for disconnect
		disconnectCtx, cancel := context.WithTimeout(context.Background(), DisconnectTimeout)
		defer cancel()

		// Disconnect directly with timeout
		// Use a goroutine to allow timeout, but keep it simple since Disconnect() may block
		done := make(chan error, 1)
		disconnectGoroutineID := fmt.Sprintf("disconnect-worker-%s", conn.ID)
		sm.goroutineMgr.Spawn(disconnectGoroutineID, func() {
			done <- conn.Disconnect()
		})

		select {
		case err := <-done:
			if err != nil {
				sm.logger.Error().
					Err(err).
					Str("connectionID", conn.ID).
					Msg("failed to disconnect gracefully")
			}
			// Disconnect completed (with or without error)
			sm.mu.RLock()
			metadata, exists := sm.connectionMetadata[conn]
			isTerminal := !exists || metadata.State == StateTerminal
			sm.mu.RUnlock()

			if !isTerminal {
				sm.Transition(context.Background(), conn, EventDisconnectSuccess)
			}
		case <-disconnectCtx.Done():
			// Disconnect timed out
			sm.mu.RLock()
			metadata, exists := sm.connectionMetadata[conn]
			isTerminal := !exists || metadata.State == StateTerminal
			sm.mu.RUnlock()

			if !isTerminal {
				sm.logger.Warn().
					Str("connectionID", conn.ID).
					Str("queue", conn.Queue.Name).
					Msg("disconnect timeout, forcing transition")
				sm.Transition(context.Background(), conn, EventDisconnectSuccess)
			}
		}
	})

	// Return exit callback that removes from Redis
	return func() error {
		if err := sm.removeFromRedisState(ctx, conn, StateDisconnecting); err != nil {
			sm.logger.Error().
				Err(err).
				Str("connectionID", conn.ID).
				Msg("failed to remove from Redis disconnecting state")
			return err
		}
		return nil
	}, nil
}

func (sm *StateMachine) enterTerminal(ctx context.Context, conn *WorkerConnection, stateMachine *StateMachine) (func() error, error) {
	sm.logger.Debug().
		Str("connectionID", conn.ID).
		Str("queue", conn.Queue.Name).
		Msgf("entering terminal state [conn=%s queue=%s]", conn.ID, conn.Queue.Name)

	// Note: This function is called from Transition() which already holds sm.mu.Lock()
	// So we can access connectionMetadata directly without acquiring another lock
	// Ensure StopPingCheck channel is closed if metadata still exists
	metadata, exists := sm.connectionMetadata[conn]
	if exists && metadata != nil {
		select {
		case <-metadata.StopPingCheck:
			// Already closed
		default:
			close(metadata.StopPingCheck)
		}
	}

	// Terminate the connection (this cancels context and closes websocket)
	conn.Terminate()

	// Clean up all goroutines associated with this connection
	sm.cleanupConnectionGoroutines(conn)

	// Note: Connection metadata will be cleaned up by the caller
	// after this function completes

	// No exit callback needed for terminal state
	return nil, nil
}

func (sm *StateMachine) HandlePong(ctx context.Context, conn *WorkerConnection) {
	sm.mu.RLock()
	metadata, ok := sm.connectionMetadata[conn]
	if !ok {
		sm.mu.RUnlock()
		return
	}

	metadata.WaitingForPong = false
	isConnected := metadata.State == StateConnected
	sm.mu.RUnlock()

	if isConnected {
		now := time.Now().UnixMilli()
		pipe := sm.client.Pipeline()
		key := fmt.Sprintf("scheduler:%s:%s:connected", sm.schedulerID, conn.Queue.Name)
		pipe.ZAdd(ctx, key, goredis.Z{
			Score:  float64(now),
			Member: conn.ID,
		})
		pipe.Exec(ctx)
	}
}

func (sm *StateMachine) startPingCheck(ctx context.Context, conn *WorkerConnection, metadata *ConnectionMetadata) {
	ticker := time.NewTicker(PingCheckInterval)
	defer ticker.Stop()

	// Create a context that cancels when the connection is no longer connected
	pingCtx, cancel := context.WithCancel(ctx)
	defer cancel()

	// Monitor connection state and cancel ping check if connection is no longer connected
	monitorGoroutineID := fmt.Sprintf("ping-monitor-%s", conn.ID)
	sm.goroutineMgr.Spawn(monitorGoroutineID, func() {
		ticker := time.NewTicker(1 * time.Second)
		defer ticker.Stop()

		for {
			select {
			case <-pingCtx.Done():
				return
			case <-ticker.C:
				sm.mu.RLock()
				currentMetadata, ok := sm.connectionMetadata[conn]
				if !ok || currentMetadata.State != StateConnected {
					sm.mu.RUnlock()
					cancel() // Cancel ping check if connection is no longer connected
					return
				}
				sm.mu.RUnlock()
			}
		}
	})

	for {
		select {
		case <-metadata.StopPingCheck:
			return
		case <-pingCtx.Done():
			return
		case <-sm.shutdown:
			return
		case <-ticker.C:
			// Check if we should timeout this connection
			sm.mu.RLock()
			currentMetadata, ok := sm.connectionMetadata[conn]
			if !ok || currentMetadata.State != StateConnected {
				sm.mu.RUnlock()
				return
			}
			shouldTimeout := currentMetadata.WaitingForPong
			if !shouldTimeout {
				currentMetadata.WaitingForPong = true
			}
			sm.mu.RUnlock()

			if shouldTimeout {
				sm.logger.Warn().
					Str("connectionID", conn.ID).
					Str("queue", conn.Queue.Name).
					Msg("no pong received, marking connection as failed")
				sm.Transition(ctx, conn, EventNoPong)
				return
			}
		}
	}
}

func (sm *StateMachine) updateRedisState(ctx context.Context, conn *WorkerConnection, state ConnectionState, score int64) error {
	key := fmt.Sprintf("scheduler:%s:%s:%s", sm.schedulerID, conn.Queue.Name, state)
	return sm.client.ZAdd(ctx, key, goredis.Z{
		Score:  float64(score),
		Member: conn.ID,
	}).Err()
}

func (sm *StateMachine) removeFromRedisState(ctx context.Context, conn *WorkerConnection, state ConnectionState) error {
	key := fmt.Sprintf("scheduler:%s:%s:%s", sm.schedulerID, conn.Queue.Name, state)

	// Retry up to RedisRetryMaxAttempts times with exponential backoff to handle transient Redis failures
	for attempt := 0; attempt < RedisRetryMaxAttempts; attempt++ {
		err := sm.client.ZRem(ctx, key, conn.ID).Err()
		if err == nil {
			return nil
		}

		if attempt < RedisRetryMaxAttempts-1 {
			backoff := RedisRetryBaseBackoff * time.Duration(1<<attempt) // 100ms, 200ms, 400ms
			sm.logger.Warn().
				Err(err).
				Str("connectionID", conn.ID).
				Str("state", string(state)).
				Int("attempt", attempt+1).
				Dur("backoff", backoff).
				Msg("Redis remove failed, retrying")
			time.Sleep(backoff)
		} else {
			return fmt.Errorf("failed to remove from Redis after %d attempts: %w", RedisRetryMaxAttempts, err)
		}
	}

	return nil
}

func (sm *StateMachine) GetConnections(q *queue.Queue, state ConnectionState) []*WorkerConnection {
	sm.mu.RLock()
	defer sm.mu.RUnlock()

	var conns []*WorkerConnection
	for conn, metadata := range sm.connectionMetadata {
		if metadata.State == state {
			if q == nil || conn.Queue.Name == q.Name {
				conns = append(conns, conn)
			}
		}
	}
	return conns
}

func (sm *StateMachine) GetWorkingConnections(q queue.Queue) int {
	sm.mu.RLock()
	defer sm.mu.RUnlock()

	count := 0
	for conn, metadata := range sm.connectionMetadata {
		if conn.Queue.Name == q.Name {
			if metadata.State == StateConnecting || metadata.State == StateConnected {
				count++
			}
		}
	}

	return count
}

func (sm *StateMachine) GetAllConnections(q queue.Queue) int {
	sm.mu.RLock()
	defer sm.mu.RUnlock()

	count := 0
	for conn, metadata := range sm.connectionMetadata {
		if conn.Queue.Name == q.Name {
			// Count all non-terminal connections
			if metadata.State != StateTerminal {
				count++
			}
		}
	}

	return count
}

func (sm *StateMachine) DisconnectOne(ctx context.Context, q queue.Queue) error {
	conns := sm.GetConnections(&q, StateConnected)
	if len(conns) == 0 {
		return fmt.Errorf("no connected connections to disconnect for queue %s", q.Name)
	}

	return sm.Transition(ctx, conns[0], EventDisconnect)
}

// GetAllConnectionMetadata is a test helper to inspect internal state.
func (sm *StateMachine) GetAllConnectionMetadata() map[*WorkerConnection]*ConnectionMetadata {
	sm.mu.RLock()
	defer sm.mu.RUnlock()
	// Return a copy to avoid race conditions on the caller's side
	metadataCopy := make(map[*WorkerConnection]*ConnectionMetadata, len(sm.connectionMetadata))
	for k, v := range sm.connectionMetadata {
		metadataCopy[k] = v
	}
	return metadataCopy
}
