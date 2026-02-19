package pool

import (
	"context"
	"fmt"
	"net/http"
	"sync"
	"time"

	"github.com/coder/websocket"
	"github.com/rs/zerolog"
)

type conn struct {
	ws     *websocket.Conn
	cancel context.CancelFunc
	id     int
}

type Pool struct {
	queueName string
	url       string
	logger    zerolog.Logger

	mu     sync.Mutex
	conns  []*conn
	nextID int
}

func New(queueName, url string, logger zerolog.Logger) *Pool {
	return &Pool{
		queueName: queueName,
		url:       url,
		logger:    logger.With().Str("queue", queueName).Logger(),
	}
}

func (p *Pool) Size() int {
	p.mu.Lock()
	defer p.mu.Unlock()
	return len(p.conns)
}

// Grow opens n new WebSocket connections concurrently.
// Returns the number successfully opened.
func (p *Pool) Grow(ctx context.Context, n int) int {
	type result struct {
		c   *conn
		err error
	}
	results := make(chan result, n)

	for i := 0; i < n; i++ {
		go func() {
			c, err := p.dial(ctx)
			results <- result{c, err}
		}()
	}

	opened := 0
	for i := 0; i < n; i++ {
		r := <-results
		if r.err != nil {
			p.logger.Warn().Err(r.err).Msg("failed to dial worker")
			continue
		}
		p.mu.Lock()
		p.conns = append(p.conns, r.c)
		p.mu.Unlock()
		opened++
	}

	if opened > 0 {
		p.logger.Info().Int("opened", opened).Int("requested", n).Int("poolSize", p.Size()).Msg("grew pool")
	}
	return opened
}

// Shrink closes n connections (newest first — LIFO).
// Returns the number actually closed.
func (p *Pool) Shrink(n int) int {
	p.mu.Lock()
	if n > len(p.conns) {
		n = len(p.conns)
	}
	// Take from the end (newest)
	toClose := make([]*conn, n)
	copy(toClose, p.conns[len(p.conns)-n:])
	p.conns = p.conns[:len(p.conns)-n]
	p.mu.Unlock()

	for _, c := range toClose {
		c.cancel()
	}

	if n > 0 {
		p.logger.Info().Int("closed", n).Int("poolSize", p.Size()).Msg("shrunk pool")
	}
	return n
}

// CloseAll closes every connection in the pool.
func (p *Pool) CloseAll() {
	p.mu.Lock()
	all := p.conns
	p.conns = nil
	p.mu.Unlock()

	for _, c := range all {
		c.cancel()
	}
	p.logger.Info().Int("closed", len(all)).Msg("closed all connections")
}

func (p *Pool) dial(ctx context.Context) (*conn, error) {
	wsURL := p.wsURL()

	dialCtx, dialCancel := context.WithTimeout(ctx, 30*time.Second)
	defer dialCancel()

	ws, _, err := websocket.Dial(dialCtx, wsURL, &websocket.DialOptions{
		HTTPHeader: http.Header{
			"X-Queue-Name": []string{p.queueName},
		},
	})
	if err != nil {
		return nil, fmt.Errorf("dial %s: %w", wsURL, err)
	}

	connCtx, connCancel := context.WithCancel(ctx)

	p.mu.Lock()
	id := p.nextID
	p.nextID++
	p.mu.Unlock()

	c := &conn{
		ws:     ws,
		cancel: connCancel,
		id:     id,
	}

	p.logger.Debug().Int("connID", id).Msg("connected")

	// Read goroutine: blocks until the worker closes or errors.
	// When it returns, the connection is dead — remove it from pool.
	go p.readLoop(connCtx, c)

	return c, nil
}

func (p *Pool) readLoop(ctx context.Context, c *conn) {
	defer func() {
		c.ws.CloseNow()
		p.remove(c)
		p.logger.Debug().Int("connID", c.id).Msg("connection closed")
	}()

	for {
		// Block on read. We don't expect application messages — this just
		// detects close frames and errors.
		_, _, err := c.ws.Read(ctx)
		if err != nil {
			return
		}
	}
}

func (p *Pool) remove(c *conn) {
	p.mu.Lock()
	defer p.mu.Unlock()
	for i, existing := range p.conns {
		if existing == c {
			p.conns = append(p.conns[:i], p.conns[i+1:]...)
			return
		}
	}
}

func (p *Pool) wsURL() string {
	// Convert http(s) URL to ws(s)
	url := p.url
	if len(url) > 0 && url[len(url)-1] == '/' {
		url = url[:len(url)-1]
	}
	if len(url) >= 5 && url[:5] == "https" {
		return "wss" + url[5:] + "/ws"
	}
	if len(url) >= 4 && url[:4] == "http" {
		return "ws" + url[4:] + "/ws"
	}
	return url + "/ws"
}
