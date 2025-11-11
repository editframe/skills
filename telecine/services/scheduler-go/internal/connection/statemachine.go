package connection

import (
	"context"
	"fmt"
	"strings"
	"sync"
	"time"

	goredis "github.com/redis/go-redis/v9"
	"github.com/rs/zerolog"

	"github.com/editframe/telecine/scheduler/internal/connection/transitions"
	"github.com/editframe/telecine/scheduler/internal/queue"
	"github.com/editframe/telecine/scheduler/internal/redis"
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

	// Store maps for each connection state (like TypeScript implementation)
	connectingConnections    map[string]*WorkerConnection
	connectedConnections     map[string]*WorkerConnection
	disconnectingConnections map[string]*WorkerConnection

	// Connection metadata
	connectionMetadata map[*WorkerConnection]*ConnectionMetadata

	// State machine definition
	stateMachine map[ConnectionState]*StateHandler

	// Shutdown control
	shutdown     chan struct{}
	shutdownOnce sync.Once

	// Track all active goroutines for deterministic cleanup
	activeGoroutines map[string]chan struct{} // goroutine ID -> stop channel
	goroutineMu      sync.RWMutex

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
		schedulerID:              schedulerID,
		client:                   client,
		logger:                   logger,
		connectingConnections:    make(map[string]*WorkerConnection),
		connectedConnections:     make(map[string]*WorkerConnection),
		disconnectingConnections: make(map[string]*WorkerConnection),
		connectionMetadata:       make(map[*WorkerConnection]*ConnectionMetadata),
		shutdown:                 make(chan struct{}),
		activeGoroutines:         make(map[string]chan struct{}),
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

// trackGoroutine registers a goroutine for deterministic cleanup
func (sm *StateMachine) trackGoroutine(id string) chan struct{} {
	sm.goroutineMu.Lock()
	defer sm.goroutineMu.Unlock()

	stopCh := make(chan struct{})
	sm.activeGoroutines[id] = stopCh
	sm.logger.Debug().Str("goroutineID", id).Msgf("tracking goroutine [id=%s]", id)
	return stopCh
}

// untrackGoroutine removes a goroutine from tracking
func (sm *StateMachine) untrackGoroutine(id string) {
	sm.goroutineMu.Lock()
	defer sm.goroutineMu.Unlock()

	if _, exists := sm.activeGoroutines[id]; exists {
		delete(sm.activeGoroutines, id)
		sm.logger.Debug().Str("goroutineID", id).Msgf("untracked goroutine [id=%s]", id)
	}
}

// stopAllGoroutines deterministically stops all tracked goroutines
func (sm *StateMachine) stopAllGoroutines() {
	sm.goroutineMu.Lock()
	initialCount := len(sm.activeGoroutines)
	sm.logger.Info().Int("count", initialCount).Msg("stopping all tracked goroutines")

	// Send stop signals to all goroutines
	for id, stopCh := range sm.activeGoroutines {
		sm.logger.Debug().Str("goroutineID", id).Msg("stopping goroutine")
		close(stopCh)
	}
	sm.goroutineMu.Unlock()

	// Wait for all goroutines to exit and untrack themselves
	// Use a timeout to prevent hanging indefinitely
	timeout := time.After(5 * time.Second)
	ticker := time.NewTicker(10 * time.Millisecond)
	defer ticker.Stop()

	for {
		sm.goroutineMu.RLock()
		remaining := len(sm.activeGoroutines)
		sm.goroutineMu.RUnlock()

		if remaining == 0 {
			sm.logger.Info().Int("initialCount", initialCount).Msg("all goroutines stopped successfully")
			return
		}

		select {
		case <-timeout:
			sm.goroutineMu.Lock()
			remaining := len(sm.activeGoroutines)
			if remaining > 0 {
				sm.logger.Warn().Int("remaining", remaining).Msg("timeout waiting for goroutines to stop, forcing cleanup")
				// Force clear the map as a last resort
				sm.activeGoroutines = make(map[string]chan struct{})
			}
			sm.goroutineMu.Unlock()
			return
		case <-ticker.C:
			// Continue waiting
		}
	}
}

// cleanupConnectionGoroutines removes all goroutines associated with a connection
func (sm *StateMachine) cleanupConnectionGoroutines(conn *WorkerConnection) {
	connectionGoroutineID := fmt.Sprintf("connection-%s", conn.ID)
	sm.untrackGoroutine(connectionGoroutineID)

	// Also clean up any specific goroutines for this connection
	sm.goroutineMu.Lock()
	defer sm.goroutineMu.Unlock()

	// Remove all goroutines that start with this connection ID
	toRemove := []string{}
	for id := range sm.activeGoroutines {
		if strings.HasPrefix(id, conn.ID+"-") || strings.HasPrefix(id, "connect-"+conn.ID) ||
			strings.HasPrefix(id, "ping-"+conn.ID) || strings.HasPrefix(id, "disconnect-"+conn.ID) ||
			strings.HasPrefix(id, "monitor-"+conn.ID) || strings.HasPrefix(id, "connect-attempt-"+conn.ID) ||
			strings.HasPrefix(id, "wait-"+conn.ID) || strings.HasPrefix(id, "ping-monitor-"+conn.ID) ||
			strings.HasPrefix(id, "ping-start-"+conn.ID) || strings.HasPrefix(id, "disconnect-attempt-"+conn.ID) {
			toRemove = append(toRemove, id)
		}
	}

	for _, id := range toRemove {
		// Stop the goroutine via the manager
		sm.goroutineMgr.Stop(id)

		// Also clean up internal tracking
		if stopCh, exists := sm.activeGoroutines[id]; exists {
			close(stopCh)
			delete(sm.activeGoroutines, id)
		}
	}
}

// WaitForConnectionCleanup waits for all goroutines associated with a connection to finish
func (sm *StateMachine) WaitForConnectionCleanup(conn *WorkerConnection, timeout time.Duration) bool {
	deadline := time.Now().Add(timeout)
	ticker := time.NewTicker(10 * time.Millisecond)
	defer ticker.Stop()

	for time.Now().Before(deadline) {
		sm.goroutineMu.RLock()
		hasGoroutines := false
		for id := range sm.activeGoroutines {
			if strings.HasPrefix(id, conn.ID+"-") || strings.HasPrefix(id, "connect-"+conn.ID) ||
				strings.HasPrefix(id, "ping-"+conn.ID) || strings.HasPrefix(id, "disconnect-"+conn.ID) ||
				strings.HasPrefix(id, "monitor-"+conn.ID) || strings.HasPrefix(id, "connect-attempt-"+conn.ID) ||
				strings.HasPrefix(id, "wait-"+conn.ID) || strings.HasPrefix(id, "ping-monitor-"+conn.ID) ||
				strings.HasPrefix(id, "ping-start-"+conn.ID) || strings.HasPrefix(id, "disconnect-attempt-"+conn.ID) ||
				strings.HasPrefix(id, "connection-"+conn.ID) {
				hasGoroutines = true
				break
			}
		}
		sm.goroutineMu.RUnlock()

		if !hasGoroutines {
			return true
		}

		<-ticker.C
	}

	return false
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

	// Track this connection's goroutines immediately
	connectionGoroutineID := fmt.Sprintf("connection-%s", conn.ID)
	sm.trackGoroutine(connectionGoroutineID)

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
		sm.untrackGoroutine(connectionGoroutineID)
		return nil, err
	}

	return conn, nil
}

func (sm *StateMachine) Transition(ctx context.Context, conn *WorkerConnection, event ConnectionEvent) error {
	sm.mu.Lock()
	defer sm.mu.Unlock()

	// Get or create metadata (matches TypeScript behavior)
	metadata, ok := sm.connectionMetadata[conn]
	if !ok {
		metadata = &ConnectionMetadata{
			State:         "undefined",
			StopPingCheck: make(chan struct{}),
		}
		sm.connectionMetadata[conn] = metadata
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

	// Remove from old state store
	sm.removeFromStateStore(conn, ConnectionState(currentState))

	// Call exit callback for current state
	if metadata.ExitCallback != nil {
		if err := metadata.ExitCallback(); err != nil {
			sm.logger.Error().
				Err(err).
				Str("connectionID", conn.ID).
				Msg("error in exit callback")
		}
		metadata.ExitCallback = nil
	}

	// Add to new state store (if not terminal)
	if newState != StateTerminal {
		sm.addToStateStore(conn, newState)
	}

	// Update metadata
	metadata.State = newState

	// Call enter function for new state and store exit callback
	if newStateHandler, exists := sm.stateMachine[newState]; exists && newStateHandler.Enter != nil {
		// Terminal state cleanup should be synchronous to avoid deadlocks
		if newState == StateTerminal {
			exitCallback, err := newStateHandler.Enter(ctx, conn, sm)
			if err != nil {
				sm.logger.Error().
					Err(err).
					Str("connectionID", conn.ID).
					Str("newState", string(newState)).
					Msg("error in enter function")
			}
			metadata.ExitCallback = exitCallback
		} else {
			// Non-terminal states can be asynchronous
			exitCallback, err := newStateHandler.Enter(ctx, conn, sm)
			if err != nil {
				sm.logger.Error().
					Err(err).
					Str("connectionID", conn.ID).
					Str("newState", string(newState)).
					Msg("error in enter function")
			}
			metadata.ExitCallback = exitCallback
		}
	}

	// Clean up terminal connections after enter function completes
	if newState == StateTerminal {
		delete(sm.connectionMetadata, conn)
	}

	return nil
}

// Helper methods for state store management
func (sm *StateMachine) removeFromStateStore(conn *WorkerConnection, state ConnectionState) {
	switch state {
	case StateConnecting:
		delete(sm.connectingConnections, conn.ID)
	case StateConnected:
		delete(sm.connectedConnections, conn.ID)
	case StateDisconnecting:
		delete(sm.disconnectingConnections, conn.ID)
	}
}

func (sm *StateMachine) addToStateStore(conn *WorkerConnection, state ConnectionState) {
	switch state {
	case StateConnecting:
		sm.connectingConnections[conn.ID] = conn
	case StateConnected:
		sm.connectedConnections[conn.ID] = conn
	case StateDisconnecting:
		sm.disconnectingConnections[conn.ID] = conn
	}
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

		// Create a context that cancels on shutdown or stop signal
		connectCtx, cancel := context.WithCancel(ctx)
		defer cancel()

		// Monitor both shutdown and stop signal
		monitorGoroutineID := fmt.Sprintf("monitor-%s", conn.ID)
		sm.goroutineMgr.Spawn(monitorGoroutineID, func() {
			select {
			case <-sm.shutdown:
				cancel()
			case <-connectCtx.Done():
			}
		})

		// Try to connect with timeout
		connectGoroutineID := fmt.Sprintf("connect-attempt-%s", conn.ID)
		connectDone := make(chan error, 1)
		sm.goroutineMgr.Spawn(connectGoroutineID, func() {
			connectDone <- conn.Connect(connectCtx)
		})

		select {
		case err := <-connectDone:
			if err != nil {
				sm.logger.Error().
					Err(err).
					Str("connectionID", conn.ID).
					Str("queue", conn.Queue.Name).
					Msg("failed to connect")
				sm.Transition(context.Background(), conn, EventTimeout)
				return
			}
		case <-connectCtx.Done():
			sm.logger.Debug().
				Str("connectionID", conn.ID).
				Str("queue", conn.Queue.Name).
				Msg("connection attempt cancelled due to shutdown")
			return
		}

		// Wait for connection with timeout
		waitGoroutineID := fmt.Sprintf("wait-%s", conn.ID)
		waitDone := make(chan error, 1)
		sm.goroutineMgr.Spawn(waitGoroutineID, func() {
			waitDone <- conn.WaitForConnection()
		})

		select {
		case err := <-waitDone:
			if err != nil {
				sm.logger.Error().
					Err(err).
					Str("connectionID", conn.ID).
					Str("queue", conn.Queue.Name).
					Msg("wait for connection failed")
				sm.Transition(context.Background(), conn, EventTimeout)
				return
			}
		case <-connectCtx.Done():
			sm.logger.Debug().
				Str("connectionID", conn.ID).
				Str("queue", conn.Queue.Name).
				Msg("connection wait cancelled due to shutdown")
			return
		}

		sm.logger.Debug().
			Str("connectionID", conn.ID).
			Str("queue", conn.Queue.Name).
			Msg("connection established, transitioning to connected")

		sm.Transition(context.Background(), conn, EventConnectSuccess)
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
	metadata := sm.connectionMetadata[conn]
	if metadata == nil {
		return nil, fmt.Errorf("metadata not found for connection")
	}

	// Start ping check
	pingGoroutineID := fmt.Sprintf("ping-start-%s", conn.ID)
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
		disconnectCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()

		// Use a channel to ensure we don't leak this goroutine
		disconnectGoroutineID := fmt.Sprintf("disconnect-attempt-%s", conn.ID)
		done := make(chan struct{})
		sm.goroutineMgr.Spawn(disconnectGoroutineID, func() {
			defer close(done)
			if err := conn.Disconnect(); err != nil {
				sm.logger.Error().
					Err(err).
					Str("connectionID", conn.ID).
					Msg("failed to disconnect gracefully")
			}
		})

		select {
		case <-done:
			sm.Transition(context.Background(), conn, EventDisconnectSuccess)
		case <-disconnectCtx.Done():
			sm.logger.Warn().
				Str("connectionID", conn.ID).
				Str("queue", conn.Queue.Name).
				Msg("disconnect timeout, forcing transition")
			sm.Transition(context.Background(), conn, EventDisconnectSuccess)
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

	// Terminate the connection
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
	ticker := time.NewTicker(5 * time.Second)
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
	return sm.client.ZRem(ctx, key, conn.ID).Err()
}

func (sm *StateMachine) GetConnections(q *queue.Queue, state ConnectionState) []*WorkerConnection {
	sm.mu.RLock()
	defer sm.mu.RUnlock()

	var storeMap map[string]*WorkerConnection
	switch state {
	case StateConnecting:
		storeMap = sm.connectingConnections
	case StateConnected:
		storeMap = sm.connectedConnections
	case StateDisconnecting:
		storeMap = sm.disconnectingConnections
	default:
		return []*WorkerConnection{}
	}

	var conns []*WorkerConnection
	for _, conn := range storeMap {
		if q == nil || conn.Queue.Name == q.Name {
			conns = append(conns, conn)
		}
	}
	return conns
}

func (sm *StateMachine) GetWorkingConnections(q queue.Queue) int {
	sm.mu.RLock()
	defer sm.mu.RUnlock()

	count := 0

	// Count connecting connections
	for _, conn := range sm.connectingConnections {
		if conn.Queue.Name == q.Name {
			count++
		}
	}

	// Count connected connections
	for _, conn := range sm.connectedConnections {
		if conn.Queue.Name == q.Name {
			count++
		}
	}

	return count
}

func (sm *StateMachine) GetAllConnections(q queue.Queue) int {
	sm.mu.RLock()
	defer sm.mu.RUnlock()

	count := 0

	// Count all non-terminal connections
	for _, conn := range sm.connectingConnections {
		if conn.Queue.Name == q.Name {
			count++
		}
	}

	for _, conn := range sm.connectedConnections {
		if conn.Queue.Name == q.Name {
			count++
		}
	}

	for _, conn := range sm.disconnectingConnections {
		if conn.Queue.Name == q.Name {
			count++
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
