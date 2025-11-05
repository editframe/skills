package connection

import (
	"context"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

// NetworkDialer abstracts websocket connection establishment
type NetworkDialer interface {
	Dial(ctx context.Context, url string) (NetworkConn, error)
}

// NetworkConn abstracts a websocket connection
type NetworkConn interface {
	ReadMessage() (messageType int, p []byte, err error)
	WriteMessage(messageType int, data []byte) error
	Close() error
	SetPongHandler(h func(appData string) error)
	SetReadDeadline(t time.Time) error
	WriteControl(messageType int, data []byte, deadline time.Time) error
}

// RealNetworkDialer uses actual websocket connections
type RealNetworkDialer struct {
	handshakeTimeout time.Duration
}

// NewRealNetworkDialer creates a new real network dialer
func NewRealNetworkDialer(handshakeTimeout time.Duration) *RealNetworkDialer {
	return &RealNetworkDialer{
		handshakeTimeout: handshakeTimeout,
	}
}

// Dial establishes a real websocket connection
func (d *RealNetworkDialer) Dial(ctx context.Context, url string) (NetworkConn, error) {
	dialer := &websocket.Dialer{
		Proxy:            http.ProxyFromEnvironment,
		HandshakeTimeout: d.handshakeTimeout,
	}
	ws, _, err := dialer.DialContext(ctx, url, nil)
	if err != nil {
		return nil, err
	}
	return &realNetworkConn{ws: ws}, nil
}

// realNetworkConn wraps a real websocket connection
type realNetworkConn struct {
	ws *websocket.Conn
}

func (c *realNetworkConn) ReadMessage() (messageType int, p []byte, err error) {
	return c.ws.ReadMessage()
}

func (c *realNetworkConn) WriteMessage(messageType int, data []byte) error {
	return c.ws.WriteMessage(messageType, data)
}

func (c *realNetworkConn) Close() error {
	return c.ws.Close()
}

func (c *realNetworkConn) SetPongHandler(h func(appData string) error) {
	c.ws.SetPongHandler(h)
}

func (c *realNetworkConn) SetReadDeadline(t time.Time) error {
	return c.ws.SetReadDeadline(t)
}

func (c *realNetworkConn) WriteControl(messageType int, data []byte, deadline time.Time) error {
	return c.ws.WriteControl(messageType, data, deadline)
}

// MockNetworkDialer for tests - completes instantly
type MockNetworkDialer struct {
	shouldFail bool
	failAfter  int
	callCount  int
}

// NewMockNetworkDialer creates a new mock network dialer
func NewMockNetworkDialer(shouldFail bool, failAfter int) *MockNetworkDialer {
	return &MockNetworkDialer{
		shouldFail: shouldFail,
		failAfter:  failAfter,
		callCount:  0,
	}
}

// Dial simulates a connection (instant completion)
func (d *MockNetworkDialer) Dial(ctx context.Context, url string) (NetworkConn, error) {
	d.callCount++
	if d.shouldFail && (d.failAfter == 0 || d.callCount > d.failAfter) {
		// Check if context is already cancelled to fail fast
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		default:
		}
		return nil, &mockNetworkError{msg: "mock connection failed"}
	}
	return &mockNetworkConn{
		blockCh: make(chan struct{}), // Initialize the channel immediately
	}, nil
}

// mockNetworkError simulates a network error
type mockNetworkError struct {
	msg string
}

func (e *mockNetworkError) Error() string {
	return e.msg
}

// mockNetworkConn simulates a websocket connection (no actual network)
type mockNetworkConn struct {
	closed       bool
	pongHandler  func(appData string) error
	readDeadline time.Time
	blockCh      chan struct{} // Used to block ReadMessage until Close is called
	mu           sync.RWMutex  // Protects closed field
}

func (c *mockNetworkConn) ReadMessage() (messageType int, p []byte, err error) {
	c.mu.RLock()
	if c.closed {
		c.mu.RUnlock()
		return 0, nil, &mockNetworkError{msg: "connection closed"}
	}
	blockCh := c.blockCh // Get a local reference while holding the lock
	c.mu.RUnlock()

	// Use a timeout to prevent indefinite blocking in tests
	// This simulates real websocket connections that eventually timeout or fail
	select {
	case <-blockCh:
		return 0, nil, &mockNetworkError{msg: "connection closed"}
	case <-time.After(10 * time.Millisecond):
		// Return a timeout error to allow readLoop to continue checking context
		return 0, nil, &mockNetworkError{msg: "read timeout"}
	}
}

func (c *mockNetworkConn) WriteMessage(messageType int, data []byte) error {
	c.mu.RLock()
	defer c.mu.RUnlock()

	if c.closed {
		return &mockNetworkError{msg: "connection closed"}
	}
	// No-op - instant completion
	return nil
}

func (c *mockNetworkConn) Close() error {
	c.mu.Lock()
	defer c.mu.Unlock()

	if !c.closed {
		c.closed = true
		if c.blockCh != nil {
			close(c.blockCh)
		}
	}
	return nil
}

func (c *mockNetworkConn) SetPongHandler(h func(appData string) error) {
	c.pongHandler = h
}

func (c *mockNetworkConn) SetReadDeadline(t time.Time) error {
	c.readDeadline = t
	return nil
}

func (c *mockNetworkConn) WriteControl(messageType int, data []byte, deadline time.Time) error {
	if c == nil {
		return &mockNetworkError{msg: "connection is nil"}
	}

	c.mu.RLock()
	defer c.mu.RUnlock()

	if c.closed {
		return &mockNetworkError{msg: "connection closed"}
	}
	// No-op - instant completion
	return nil
}
