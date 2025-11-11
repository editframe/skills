package connection

import (
	"context"
	"fmt"
	"net"
	"strings"
	"time"

	"github.com/gorilla/websocket"
	"github.com/rs/zerolog"

	"github.com/editframe/telecine/scheduler/internal/queue"
	"github.com/editframe/telecine/scheduler/pkg/superjson"
)

var (
	DisconnectTimeoutMS = 30000
	PingIntervalMS      = 5000
)

func SetTimeouts(pingIntervalMS, disconnectTimeoutMS int) {
	PingIntervalMS = pingIntervalMS
	DisconnectTimeoutMS = disconnectTimeoutMS
}

type shutdownMessage struct {
	Type string `json:"type"`
}

type WorkerConnection struct {
	ID             string
	Queue          queue.Queue
	URL            string
	conn           NetworkConn
	logger         *zerolog.Logger
	onHangup       func()
	onPong         func()
	ctx            context.Context
	cancel         context.CancelFunc
	connectedCh    chan struct{}
	disconnectedCh chan struct{}
	connectedAt    time.Time

	// Injected dependencies
	dialer       NetworkDialer
	timeProvider TimeProvider
	goroutineMgr GoroutineManager
}

func NewWorkerConnection(
	q queue.Queue,
	logger *zerolog.Logger,
	onHangup, onPong func(),
	dialer NetworkDialer,
	timeProvider TimeProvider,
	goroutineMgr GoroutineManager,
) (*WorkerConnection, error) {
	url := q.WebSocketHost
	if after, ok := strings.CutPrefix(url, "http://"); ok {
		url = "ws://" + after
	} else if after_s, ok_s := strings.CutPrefix(url, "https://"); ok_s {
		url = "wss://" + after_s
	}

	ctx, cancel := context.WithCancel(context.Background())

	return &WorkerConnection{
		ID:             generateConnectionID(),
		Queue:          q,
		URL:            url,
		logger:         logger,
		onHangup:       onHangup,
		onPong:         onPong,
		ctx:            ctx,
		cancel:         cancel,
		connectedCh:    make(chan struct{}),
		disconnectedCh: make(chan struct{}),
		dialer:         dialer,
		timeProvider:   timeProvider,
		goroutineMgr:   goroutineMgr,
	}, nil
}

// Connect dials the websocket and establishes a connection
func (w *WorkerConnection) Connect(ctx context.Context) error {
	// Prevent multiple concurrent calls to Connect
	select {
	case <-w.connectedCh:
		// Already connected
		return nil
	default:
		// Continue with connection attempt
	}

	w.logger.Debug().
		Str("url", w.URL).
		Str("queue", w.Queue.Name).
		Msg("attempting to connect to worker")

	// Use injected dialer
	conn, err := w.dialer.Dial(ctx, w.URL)
	if err != nil {
		w.logger.Error().
			Err(err).
			Str("connectionID", w.ID).
			Str("url", w.URL).
			Str("queue", w.Queue.Name).
			Msgf("failed to dial websocket [conn=%s queue=%s url=%s]", w.ID, w.Queue.Name, w.URL)
		return fmt.Errorf("failed to dial websocket: %w", err)
	}

	w.conn = conn
	w.connectedAt = w.timeProvider.Now()

	// Use goroutine manager instead of raw go statements
	w.goroutineMgr.Spawn(fmt.Sprintf("read-%s", w.ID), w.readLoop)
	w.goroutineMgr.Spawn(fmt.Sprintf("ping-%s", w.ID), w.pingLoop)

	w.logger.Info().
		Str("connectionID", w.ID).
		Str("url", w.URL).
		Str("queue", w.Queue.Name).
		Msgf("worker connection established [conn=%s queue=%s url=%s]", w.ID, w.Queue.Name, w.URL)

	// Close connectedCh only if not already closed
	select {
	case <-w.connectedCh:
		// Already closed
	default:
		close(w.connectedCh)
	}

	return nil
}

func (w *WorkerConnection) readLoop() {
	defer func() {
		w.onHangup()
		select {
		case <-w.disconnectedCh:
		default:
			close(w.disconnectedCh)
		}
	}()

	if w.conn == nil {
		w.logger.Debug().
			Str("connectionID", w.ID).
			Str("queue", w.Queue.Name).
			Str("url", w.URL).
			Msg("websocket connection is nil at readLoop start, exiting")
		return
	}

	// Safely set pong handler with proper synchronization
	func() {
		// Use a local variable to avoid race conditions
		conn := w.conn
		if conn == nil {
			w.logger.Debug().
				Str("connectionID", w.ID).
				Str("queue", w.Queue.Name).
				Str("url", w.URL).
				Msg("websocket connection became nil before setting pong handler, exiting")
			return
		}

		conn.SetPongHandler(func(appData string) error {
			w.onPong()
			return nil
		})
	}()

	// Double-check after setting handler
	if w.conn == nil {
		w.logger.Debug().
			Str("connectionID", w.ID).
			Str("queue", w.Queue.Name).
			Str("url", w.URL).
			Msg("websocket connection became nil after setting pong handler, exiting")
		return
	}

	for {
		select {
		case <-w.ctx.Done():
			return
		default:
			if w.conn == nil {
				w.logger.Debug().
					Str("connectionID", w.ID).
					Str("queue", w.Queue.Name).
					Str("url", w.URL).
					Msg("websocket connection is nil, exiting read loop")
				return
			}

			var msgType int
			var data []byte
			var err error

			func() {
				defer func() {
					if r := recover(); r != nil {
						if errStr, ok := r.(string); ok && errStr == "repeated read on failed websocket connection" {
							duration := w.timeProvider.Now().Sub(w.connectedAt)
							w.logger.Warn().
								Str("connectionID", w.ID).
								Str("queue", w.Queue.Name).
								Str("url", w.URL).
								Str("panicMessage", errStr).
								Dur("connectionDuration", duration).
								Msgf("websocket connection failed (panic), exiting read loop [conn=%s queue=%s url=%s duration=%v]", w.ID, w.Queue.Name, w.URL, duration)
							err = fmt.Errorf("websocket connection failed: %s", errStr)
						} else {
							w.logger.Error().
								Str("connectionID", w.ID).
								Str("queue", w.Queue.Name).
								Str("url", w.URL).
								Interface("panic", r).
								Msgf("unexpected websocket panic [conn=%s queue=%s url=%s]", w.ID, w.Queue.Name, w.URL)
							panic(r)
						}
					}
				}()
				msgType, data, err = w.conn.ReadMessage()
			}()

			if err != nil {
				if netErr, ok := err.(net.Error); ok && netErr.Timeout() {
					continue
				}
				if err.Error() == "repeated read on failed websocket connection" ||
					strings.Contains(err.Error(), "websocket connection failed") {
					duration := w.timeProvider.Now().Sub(w.connectedAt)
					w.logger.Warn().
						Str("connectionID", w.ID).
						Str("queue", w.Queue.Name).
						Str("url", w.URL).
						Dur("connectionDuration", duration).
						Err(err).
						Msgf("websocket connection failed, exiting read loop [conn=%s queue=%s url=%s duration=%v]", w.ID, w.Queue.Name, w.URL, duration)
					return
				}
				w.logger.Warn().
					Str("connectionID", w.ID).
					Str("queue", w.Queue.Name).
					Str("url", w.URL).
					Err(err).
					Msgf("websocket read error [conn=%s queue=%s url=%s]", w.ID, w.Queue.Name, w.URL)
				return
			}

			if msgType == websocket.TextMessage || msgType == websocket.BinaryMessage {
				w.logger.Debug().
					Int("messageType", int(msgType)).
					Int("dataLen", len(data)).
					Str("data", string(data)).
					Msg("received unexpected message from worker")
			}
		}
	}
}

func (w *WorkerConnection) pingLoop() {
	ticker := w.timeProvider.NewTicker(time.Duration(PingIntervalMS) * time.Millisecond)
	defer ticker.Stop()

	for {
		select {
		case <-w.ctx.Done():
			return
		case <-ticker.C():
			// Check if connection is still valid before attempting to use it
			if w.conn == nil {
				w.logger.Debug().
					Str("connectionID", w.ID).
					Str("queue", w.Queue.Name).
					Str("url", w.URL).
					Msg("websocket connection is nil, exiting ping loop")
				return
			}

			w.logger.Trace().
				Str("connectionID", w.ID).
				Str("queue", w.Queue.Name).
				Msg("sending ping to worker")

			// Double-check conn is not nil before calling WriteControl (race condition protection)
			conn := w.conn
			if conn == nil {
				w.logger.Debug().
					Str("connectionID", w.ID).
					Str("queue", w.Queue.Name).
					Msg("connection became nil during ping, exiting")
				return
			}

			if err := conn.WriteControl(websocket.PingMessage, []byte{}, w.timeProvider.Now().Add(time.Second)); err != nil {
				w.logger.Warn().
					Str("connectionID", w.ID).
					Str("queue", w.Queue.Name).
					Str("url", w.URL).
					Err(err).
					Msgf("failed to send ping [conn=%s queue=%s]", w.ID, w.Queue.Name)
				return
			}
		}
	}
}

func (w *WorkerConnection) Disconnect() error {
	deadline := w.timeProvider.Now().Add(time.Duration(DisconnectTimeoutMS) * time.Millisecond)

	if w.conn == nil {
		w.logger.Debug().
			Str("connectionID", w.ID).
			Str("queue", w.Queue.Name).
			Str("url", w.URL).
			Msg("websocket connection is already closed")
		w.Terminate()
		return nil
	}

	shutdownMsg := shutdownMessage{Type: "shutdown"}
	msgBytes, err := superjson.Marshal(shutdownMsg)
	if err != nil {
		return fmt.Errorf("failed to marshal shutdown message: %w", err)
	}

	if err := w.conn.WriteMessage(websocket.TextMessage, msgBytes); err != nil {
		w.logger.Warn().
			Str("connectionID", w.ID).
			Str("queue", w.Queue.Name).
			Str("url", w.URL).
			Err(err).
			Msgf("failed to send shutdown message [conn=%s queue=%s]", w.ID, w.Queue.Name)
	}

	select {
	case <-w.disconnectedCh:
		w.logger.Info().
			Str("connectionID", w.ID).
			Str("queue", w.Queue.Name).
			Str("url", w.URL).
			Msgf("worker connection closed gracefully [conn=%s queue=%s]", w.ID, w.Queue.Name)
	case <-w.timeProvider.After(deadline.Sub(w.timeProvider.Now())):
		w.logger.Warn().
			Str("connectionID", w.ID).
			Str("queue", w.Queue.Name).
			Str("url", w.URL).
			Dur("timeout", time.Duration(DisconnectTimeoutMS)*time.Millisecond).
			Msgf("graceful shutdown timeout, forcefully closing [conn=%s queue=%s timeout=%dms]", w.ID, w.Queue.Name, DisconnectTimeoutMS)
		w.Terminate()
	}

	return nil
}

func (w *WorkerConnection) Terminate() {
	w.logger.Debug().Str("connectionID", w.ID).Msg("terminating worker connection")
	w.cancel()
	if w.conn != nil {
		w.conn.Close()
		w.conn = nil // Set to nil to prevent further reads
	}
	select {
	case <-w.disconnectedCh:
	default:
		close(w.disconnectedCh)
	}
}

func (w *WorkerConnection) WaitForConnection() error {
	select {
	case <-w.connectedCh:
		return nil
	case <-time.After(20 * time.Second):
		return fmt.Errorf("connection timeout")
	}
}

func generateConnectionID() string {
	return fmt.Sprintf("%d", time.Now().UnixNano())
}
