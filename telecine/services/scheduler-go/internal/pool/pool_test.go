package pool

import (
	"context"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"
	"time"

	"github.com/coder/websocket"
	"github.com/rs/zerolog"
)

func startTestWSServer(t *testing.T, onConnect func(conn *websocket.Conn)) *httptest.Server {
	t.Helper()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		conn, err := websocket.Accept(w, r, nil)
		if err != nil {
			t.Logf("accept error: %v", err)
			return
		}
		if onConnect != nil {
			onConnect(conn)
		} else {
			// Default: hold the connection open until it's closed by the client
			<-r.Context().Done()
			conn.CloseNow()
		}
	}))
	t.Cleanup(srv.Close)
	return srv
}

func TestPoolGrowAndSize(t *testing.T) {
	var connected atomic.Int32
	srv := startTestWSServer(t, func(conn *websocket.Conn) {
		connected.Add(1)
		// Hold connection open
		ctx := context.Background()
		for {
			_, _, err := conn.Read(ctx)
			if err != nil {
				return
			}
		}
	})

	logger := zerolog.Nop()
	p := New("test-queue", srv.URL, logger)

	ctx := context.Background()
	p.Grow(ctx, 3)

	// Wait for all dials to complete and server connections to be registered
	deadline := time.Now().Add(3 * time.Second)
	for time.Now().Before(deadline) {
		if connected.Load() == 3 {
			break
		}
		time.Sleep(10 * time.Millisecond)
	}
	if connected.Load() != 3 {
		t.Fatalf("expected 3 server connections, got %d", connected.Load())
	}
	if p.Size() != 3 {
		t.Fatalf("expected pool size 3, got %d", p.Size())
	}

	p.CloseAll()
	waitForSize(t, p, 0)
}

// waitForEstablished polls until the pool has exactly want established
// (non-pending) connections, or the deadline passes.
func waitForEstablished(t *testing.T, p *Pool, want int) {
	t.Helper()
	deadline := time.Now().Add(3 * time.Second)
	for time.Now().Before(deadline) {
		p.mu.Lock()
		established := len(p.conns)
		p.mu.Unlock()
		if established == want {
			return
		}
		time.Sleep(10 * time.Millisecond)
	}
	p.mu.Lock()
	established := len(p.conns)
	p.mu.Unlock()
	t.Fatalf("timed out waiting for %d established connections, got %d", want, established)
}

// waitForSize polls until p.Size() == want or the deadline passes.
func waitForSize(t *testing.T, p *Pool, want int) {
	t.Helper()
	deadline := time.Now().Add(3 * time.Second)
	for time.Now().Before(deadline) {
		if p.Size() == want {
			return
		}
		time.Sleep(10 * time.Millisecond)
	}
	t.Fatalf("timed out waiting for pool size %d, got %d", want, p.Size())
}

func TestPoolShrink(t *testing.T) {
	srv := startTestWSServer(t, func(conn *websocket.Conn) {
		ctx := context.Background()
		for {
			_, _, err := conn.Read(ctx)
			if err != nil {
				return
			}
		}
	})

	logger := zerolog.Nop()
	p := New("test-queue", srv.URL, logger)

	ctx := context.Background()
	p.Grow(ctx, 5)
	waitForEstablished(t, p, 5)

	closed := p.Shrink(2)
	if closed != 2 {
		t.Fatalf("expected 2 closed, got %d", closed)
	}

	// Pool reports 3 immediately (connections removed from slice in Shrink)
	if p.Size() != 3 {
		t.Fatalf("expected 3 after shrink, got %d", p.Size())
	}

	p.CloseAll()
}

func TestPoolShrinkMoreThanSize(t *testing.T) {
	srv := startTestWSServer(t, func(conn *websocket.Conn) {
		ctx := context.Background()
		for {
			_, _, err := conn.Read(ctx)
			if err != nil {
				return
			}
		}
	})

	logger := zerolog.Nop()
	p := New("test-queue", srv.URL, logger)

	ctx := context.Background()
	p.Grow(ctx, 2)
	waitForEstablished(t, p, 2)

	closed := p.Shrink(10)
	if closed != 2 {
		t.Fatalf("expected 2 closed (clamped), got %d", closed)
	}
	if p.Size() != 0 {
		t.Fatalf("expected 0 after overshrink, got %d", p.Size())
	}
}

func TestPoolAutoRemoveOnServerClose(t *testing.T) {
	var serverConns []*websocket.Conn
	srv := startTestWSServer(t, func(conn *websocket.Conn) {
		serverConns = append(serverConns, conn)
		ctx := context.Background()
		for {
			_, _, err := conn.Read(ctx)
			if err != nil {
				return
			}
		}
	})

	logger := zerolog.Nop()
	p := New("test-queue", srv.URL, logger)

	ctx := context.Background()
	p.Grow(ctx, 2)

	time.Sleep(50 * time.Millisecond)

	if p.Size() != 2 {
		t.Fatalf("expected 2, got %d", p.Size())
	}

	// Server closes one connection — pool should auto-remove it
	if len(serverConns) > 0 {
		serverConns[0].Close(websocket.StatusNormalClosure, "bye")
	}

	time.Sleep(200 * time.Millisecond)

	if p.Size() != 1 {
		t.Fatalf("expected 1 after server close, got %d", p.Size())
	}

	p.CloseAll()
}

func TestPoolGrowDialFailure(t *testing.T) {
	logger := zerolog.Nop()
	// Point at a URL that won't accept connections
	p := New("test-queue", "http://127.0.0.1:1", logger)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	p.Grow(ctx, 3)

	// Wait for all dials to fail (context timeout drives the deadline)
	<-ctx.Done()
	if p.Size() != 0 {
		t.Fatalf("expected pool size 0 after dial failures, got %d", p.Size())
	}
}

// TestGrowDoesNotBlock verifies that Grow returns immediately without waiting
// for slow dials to complete. If Grow blocks, the ticker-based reconciler loop
// would stall for the full dial latency on every scale-up event.
func TestGrowDoesNotBlock(t *testing.T) {
	// Server that holds each connection open for 2 seconds before accepting
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(2 * time.Second)
		conn, err := websocket.Accept(w, r, nil)
		if err != nil {
			return
		}
		defer conn.CloseNow()
		<-r.Context().Done()
	}))
	t.Cleanup(srv.Close)

	logger := zerolog.Nop()
	p := New("test-queue", srv.URL, logger)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	start := time.Now()
	p.Grow(ctx, 3)
	elapsed := time.Since(start)

	// Grow must return within 100ms — it should not block waiting for dials
	if elapsed > 100*time.Millisecond {
		t.Fatalf("Grow blocked for %v; must return immediately without waiting for dials", elapsed)
	}

	// Eventually the connections should arrive (give them time to dial)
	deadline := time.Now().Add(5 * time.Second)
	for time.Now().Before(deadline) {
		if p.Size() == 3 {
			break
		}
		time.Sleep(50 * time.Millisecond)
	}
	if p.Size() != 3 {
		t.Fatalf("expected 3 connections after dials complete, got %d", p.Size())
	}

	p.CloseAll()
}

func TestWsURL(t *testing.T) {
	p := &Pool{url: "http://worker:3000"}
	if got := p.wsURL(); got != "ws://worker:3000/ws" {
		t.Fatalf("expected ws://worker:3000/ws, got %s", got)
	}

	p.url = "https://worker.example.com"
	if got := p.wsURL(); got != "wss://worker.example.com/ws" {
		t.Fatalf("expected wss://worker.example.com/ws, got %s", got)
	}

	p.url = "http://worker:3000/"
	if got := p.wsURL(); got != "ws://worker:3000/ws" {
		t.Fatalf("expected ws://worker:3000/ws (trailing slash), got %s", got)
	}
}
