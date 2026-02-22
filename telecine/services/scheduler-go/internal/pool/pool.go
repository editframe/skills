package pool

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"net/url"
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

	mu         sync.Mutex
	conns      []*conn
	nextID     int
	pending    int // dials in flight, counted toward effective size
	shrinkable int // completed dials to discard when they land (absorbs Shrink calls against pending)
}

func New(queueName, url string, logger zerolog.Logger) *Pool {
	return &Pool{
		queueName: queueName,
		url:       url,
		logger:    logger.With().Str("queue", queueName).Logger(),
	}
}

// Size returns the number of established connections plus in-flight dials
// (minus any dials reserved for discard by Shrink). This gives the reconciler
// an accurate view of the effective pool size without waiting for dials.
func (p *Pool) Size() int {
	p.mu.Lock()
	defer p.mu.Unlock()
	return len(p.conns) + p.pending - p.shrinkable
}

// Grow starts n new WebSocket dials in background goroutines and returns
// immediately. Each successful dial adds a connection to the pool; failures
// are logged and decremented from the pending count.
func (p *Pool) Grow(ctx context.Context, n int) {
	p.mu.Lock()
	p.pending += n
	p.mu.Unlock()

	for i := 0; i < n; i++ {
		go func() {
			c, err := p.dial(ctx)
			p.mu.Lock()
			p.pending--
			if err == nil {
				if p.shrinkable > 0 {
					// A Shrink was called while this dial was in-flight; discard it.
					p.shrinkable--
					p.mu.Unlock()
					c.cancel()
					p.logger.Info().
						Str("event", "poolShrunk").
						Int("closed", 1).
						Int("poolSize", p.Size()).
						Msg("shrunk pool")
					return
				}
				p.conns = append(p.conns, c)
			}
			opened := len(p.conns)
			p.mu.Unlock()

			if err != nil {
				p.logger.Warn().Err(err).Msg("failed to dial worker")
				return
			}
			p.logger.Info().
				Str("event", "poolGrew").
				Int("opened", 1).
				Int("poolSize", opened).
				Msg("grew pool")
		}()
	}
}

// Shrink closes n connections (newest first — LIFO), absorbing pending dials
// as needed. Returns the number actually closed or reserved to close.
func (p *Pool) Shrink(n int) int {
	p.mu.Lock()

	// Absorb from pending dials first (they will be discarded when they land).
	fromPending := n
	if fromPending > p.pending {
		fromPending = p.pending
	}
	p.shrinkable += fromPending
	n -= fromPending

	// Close established connections for the remainder.
	if n > len(p.conns) {
		n = len(p.conns)
	}
	toClose := make([]*conn, n)
	copy(toClose, p.conns[len(p.conns)-n:])
	p.conns = p.conns[:len(p.conns)-n]
	total := fromPending + n
	p.mu.Unlock()

	for _, c := range toClose {
		c.cancel()
	}

	if total > 0 {
		p.logger.Info().
			Str("event", "poolShrunk").
			Int("closed", total).
			Int("poolSize", p.Size()).
			Msg("shrunk pool")
	}
	return total
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

	headers := http.Header{
		"X-Queue-Name": []string{p.queueName},
	}

	// On GCP, fetch an identity token for the worker's audience (base URL).
	if token, err := fetchIDToken(dialCtx, p.url); err == nil && token != "" {
		headers.Set("Authorization", "Bearer "+token)
	}

	ws, _, err := websocket.Dial(dialCtx, wsURL, &websocket.DialOptions{
		HTTPHeader: headers,
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

	p.logger.Info().
		Str("event", "workerConnected").
		Int("connID", id).
		Str("url", wsURL).
		Msg("worker connected")

	// Read goroutine: blocks until the worker closes or errors.
	// When it returns, the connection is dead — remove it from pool.
	go p.readLoop(connCtx, c)

	return c, nil
}

func (p *Pool) readLoop(ctx context.Context, c *conn) {
	defer func() {
		c.ws.CloseNow()
		p.remove(c)
		p.logger.Info().
			Str("event", "workerDisconnected").
			Int("connID", c.id).
			Int("poolSize", p.Size()).
			Msg("worker disconnected")
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

// fetchIDToken gets a GCP identity token from the metadata server for
// service-to-service auth. Returns empty string when not running on GCP.
func fetchIDToken(ctx context.Context, audience string) (string, error) {
	metadataURL := "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity?audience=" + url.QueryEscape(audience)
	req, err := http.NewRequestWithContext(ctx, "GET", metadataURL, nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("Metadata-Flavor", "Google")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return "", fmt.Errorf("metadata server returned %d", resp.StatusCode)
	}

	token, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}
	return string(token), nil
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
