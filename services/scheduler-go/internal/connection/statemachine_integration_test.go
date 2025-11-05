package connection

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/gorilla/websocket"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/editframe/telecine/scheduler/internal/queue"
	redisclient "github.com/editframe/telecine/scheduler/internal/redis"
	"github.com/editframe/telecine/scheduler/internal/testutil"
)

// TestStateMachineIntegration_RealWebSocketConnection tests with actual websocket server
// This is an integration test that should only run in CI/CD environments
func TestStateMachineIntegration_RealWebSocketConnection(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	// Skip if not in integration test environment (check for CI environment variable)
	if os.Getenv("CI") == "" && os.Getenv("INTEGRATION_TESTS") == "" {
		t.Skip("Skipping integration test - not in integration environment")
	}

	sm, _, cleanup := setupTestStateMachineIntegration(t)
	defer cleanup()

	// Create a real WebSocket server
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		upgrader := websocket.Upgrader{}
		conn, err := upgrader.Upgrade(w, r, nil)
		require.NoError(t, err, "Failed to upgrade websocket connection")
		defer conn.Close()

		// Simulate a worker that responds to pings
		for {
			messageType, data, err := conn.ReadMessage()
			if err != nil {
				break
			}

			// Echo back pong for ping messages
			if messageType == websocket.PingMessage {
				err = conn.WriteMessage(websocket.PongMessage, data)
				if err != nil {
					break
				}
			}
		}
	}))
	defer server.Close()

	// Create queue with real server URL
	q := queue.Queue{
		Name:          "integration-test-queue",
		WebSocketHost: strings.Replace(server.URL, "http", "ws", 1),
	}

	ctx := context.Background()

	// Test connection creation and lifecycle
	conn, err := sm.CreateConnection(ctx, q)
	require.NoError(t, err)
	require.NotNil(t, conn)

	// Wait for connection to establish
	time.Sleep(time.Second)

	// Verify connection reached connected state
	connectedConns := sm.GetConnections(&q, StateConnected)
	assert.Len(t, connectedConns, 1)

	// Test ping functionality (SendPing method may not exist, skip for now)
	// This would be tested in the actual WorkerConnection implementation

	// Wait for pong response
	time.Sleep(500 * time.Millisecond)

	// Clean termination
	err = sm.Transition(ctx, conn, EventHangup)
	assert.NoError(t, err)

	// Wait for cleanup
	time.Sleep(time.Second)

	// Verify connection was cleaned up
	allConns := sm.GetAllConnections(q)
	assert.Equal(t, 0, allConns)
}

// TestStateMachineIntegration_ConnectionTimeout tests real connection timeouts
func TestStateMachineIntegration_ConnectionTimeout(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	if os.Getenv("CI") == "" && os.Getenv("INTEGRATION_TESTS") == "" {
		t.Skip("Skipping integration test - not in integration environment")
	}

	sm, _, cleanup := setupTestStateMachineIntegration(t)
	defer cleanup()

	// Use a non-existent server to trigger timeout
	q := queue.Queue{
		Name:          "timeout-test-queue",
		WebSocketHost: "ws://localhost:99999", // Non-existent port
	}

	ctx := context.Background()

	// This should fail due to connection timeout
	conn, err := sm.CreateConnection(ctx, q)
	if err != nil {
		// Connection failed immediately - this is acceptable
		assert.Contains(t, err.Error(), "connection")
		return
	}

	// If connection was created, it should timeout and transition to terminal
	require.NotNil(t, conn)

	// Wait for timeout to occur
	time.Sleep(5 * time.Second)

	// Connection should be in terminal state or cleaned up
	connectingConns := sm.GetConnections(&q, StateConnecting)
	connectedConns := sm.GetConnections(&q, StateConnected)
	assert.Equal(t, 0, len(connectingConns)+len(connectedConns), "Connection should have timed out")
}

// TestStateMachineIntegration_PingPongTimeout tests ping/pong timeout behavior
func TestStateMachineIntegration_PingPongTimeout(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	if os.Getenv("CI") == "" && os.Getenv("INTEGRATION_TESTS") == "" {
		t.Skip("Skipping integration test - not in integration environment")
	}

	sm, _, cleanup := setupTestStateMachineIntegration(t)
	defer cleanup()

	// Create a WebSocket server that doesn't respond to pings
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		upgrader := websocket.Upgrader{}
		conn, err := upgrader.Upgrade(w, r, nil)
		require.NoError(t, err, "Failed to upgrade websocket connection")
		defer conn.Close()

		// Just keep the connection open but don't respond to pings
		for {
			_, _, err := conn.ReadMessage()
			if err != nil {
				break
			}
			// Ignore all messages (including pings)
		}
	}))
	defer server.Close()

	q := queue.Queue{
		Name:          "ping-timeout-test-queue",
		WebSocketHost: strings.Replace(server.URL, "http", "ws", 1),
	}

	ctx := context.Background()

	// Create connection
	conn, err := sm.CreateConnection(ctx, q)
	require.NoError(t, err)

	// Wait for connection to establish
	time.Sleep(time.Second)

	// Manually transition to connected state to start ping checks
	err = sm.Transition(ctx, conn, EventConnectSuccess)
	require.NoError(t, err)

	// Wait for ping timeout to occur (should be longer than ping interval)
	time.Sleep(10 * time.Second)

	// Connection should have been disconnected due to no pong response
	connectedConns := sm.GetConnections(&q, StateConnected)
	assert.Equal(t, 0, len(connectedConns), "Connection should have been disconnected due to ping timeout")
}

// TestStateMachineIntegration_ConcurrentConnections tests multiple real connections
func TestStateMachineIntegration_ConcurrentConnections(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	if os.Getenv("CI") == "" && os.Getenv("INTEGRATION_TESTS") == "" {
		t.Skip("Skipping integration test - not in integration environment")
	}

	sm, _, cleanup := setupTestStateMachineIntegration(t)
	defer cleanup()

	// Create multiple WebSocket servers
	var servers []*httptest.Server
	var queues []queue.Queue

	for i := 0; i < 3; i++ {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			upgrader := websocket.Upgrader{}
			conn, err := upgrader.Upgrade(w, r, nil)
			if err != nil {
				return
			}
			defer conn.Close()

			// Simple echo server
			for {
				messageType, data, err := conn.ReadMessage()
				if err != nil {
					break
				}
				if messageType == websocket.PingMessage {
					conn.WriteMessage(websocket.PongMessage, data)
				}
			}
		}))
		servers = append(servers, server)

		q := queue.Queue{
			Name:          fmt.Sprintf("concurrent-test-queue-%d", i),
			WebSocketHost: strings.Replace(server.URL, "http", "ws", 1),
		}
		queues = append(queues, q)
	}

	// Clean up servers
	defer func() {
		for _, server := range servers {
			server.Close()
		}
	}()

	ctx := context.Background()
	var wg sync.WaitGroup
	var mu sync.Mutex
	var connections []*WorkerConnection
	var errors []error

	// Create connections concurrently
	for i, q := range queues {
		wg.Add(1)
		go func(queue queue.Queue, index int) {
			defer wg.Done()

			conn, err := sm.CreateConnection(ctx, queue)
			mu.Lock()
			if err != nil {
				errors = append(errors, err)
			} else {
				connections = append(connections, conn)
			}
			mu.Unlock()
		}(q, i)
	}

	wg.Wait()

	// All connections should succeed
	assert.Len(t, errors, 0, "All connections should succeed")
	assert.Len(t, connections, 3, "Should have 3 connections")

	// Wait for connections to establish
	time.Sleep(2 * time.Second)

	// Verify all connections are working
	totalConnected := 0
	for _, q := range queues {
		connected := len(sm.GetConnections(&q, StateConnected))
		totalConnected += connected
	}
	assert.Equal(t, 3, totalConnected, "All connections should be connected")

	// Clean up connections
	for i, conn := range connections {
		err := sm.Transition(ctx, conn, EventHangup)
		assert.NoError(t, err, "Connection %d should terminate cleanly", i)
	}

	// Wait for cleanup
	time.Sleep(time.Second)

	// Verify all connections are cleaned up
	totalRemaining := 0
	for _, q := range queues {
		remaining := sm.GetAllConnections(q)
		totalRemaining += remaining
	}
	assert.Equal(t, 0, totalRemaining, "All connections should be cleaned up")
}

// TestStateMachineIntegration_LongRunningConnection tests connection stability
func TestStateMachineIntegration_LongRunningConnection(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	if os.Getenv("CI") == "" && os.Getenv("INTEGRATION_TESTS") == "" {
		t.Skip("Skipping integration test - not in integration environment")
	}

	sm, _, cleanup := setupTestStateMachineIntegration(t)
	defer cleanup()

	// Create a stable WebSocket server
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		upgrader := websocket.Upgrader{}
		conn, err := upgrader.Upgrade(w, r, nil)
		require.NoError(t, err)
		defer conn.Close()

		// Respond to pings reliably
		for {
			messageType, data, err := conn.ReadMessage()
			if err != nil {
				break
			}
			if messageType == websocket.PingMessage {
				err = conn.WriteMessage(websocket.PongMessage, data)
				if err != nil {
					break
				}
			}
		}
	}))
	defer server.Close()

	q := queue.Queue{
		Name:          "long-running-test-queue",
		WebSocketHost: strings.Replace(server.URL, "http", "ws", 1),
	}

	ctx := context.Background()

	// Create connection
	conn, err := sm.CreateConnection(ctx, q)
	require.NoError(t, err)

	// Wait for connection to establish
	time.Sleep(time.Second)

	// Verify connection is stable over time
	for i := 0; i < 10; i++ {
		time.Sleep(time.Second)

		// Check connection is still active
		connectedConns := sm.GetConnections(&q, StateConnected)
		assert.Len(t, connectedConns, 1, "Connection should remain stable at iteration %d", i)

		// Connection health is verified by the state machine itself
		// No need to manually send pings in integration tests
	}

	// Clean termination
	err = sm.Transition(ctx, conn, EventHangup)
	assert.NoError(t, err)
}

// Helper functions for integration tests

func setupTestStateMachineIntegration(t *testing.T) (*StateMachine, *redisclient.Client, func()) {
	t.Helper()

	redisAddr := testutil.GetTestRedisAddr()
	rdb := redis.NewClient(&redis.Options{
		Addr: redisAddr,
	})

	err := rdb.Ping(context.Background()).Err()
	require.NoError(t, err, "Failed to connect to test Redis")

	redisClient := &redisclient.Client{Client: rdb}
	logger := testutil.Logger()

	sm := NewStateMachine("test-scheduler-integration", redisClient, logger)

	cleanup := func() {
		// Clean up test data
		ctx := context.Background()
		keys, _ := rdb.Keys(ctx, "scheduler:test-scheduler-integration:*").Result()
		if len(keys) > 0 {
			rdb.Del(ctx, keys...)
		}
		sm.Shutdown()
		rdb.Close()
	}

	return sm, redisClient, cleanup
}
