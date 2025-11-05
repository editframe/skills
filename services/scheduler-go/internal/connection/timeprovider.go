package connection

import "time"

// TimeProvider abstracts time operations
type TimeProvider interface {
	Now() time.Time
	Sleep(d time.Duration)
	After(d time.Duration) <-chan time.Time
	NewTicker(d time.Duration) Ticker
}

// Ticker abstracts time.Ticker
type Ticker interface {
	C() <-chan time.Time
	Stop()
	Reset(d time.Duration)
}

// RealTimeProvider uses actual time operations
type RealTimeProvider struct{}

// NewRealTimeProvider creates a new real time provider
func NewRealTimeProvider() *RealTimeProvider {
	return &RealTimeProvider{}
}

func (t *RealTimeProvider) Now() time.Time {
	return time.Now()
}

func (t *RealTimeProvider) Sleep(d time.Duration) {
	time.Sleep(d)
}

func (t *RealTimeProvider) After(d time.Duration) <-chan time.Time {
	return time.After(d)
}

func (t *RealTimeProvider) NewTicker(d time.Duration) Ticker {
	return &realTicker{ticker: time.NewTicker(d)}
}

// realTicker wraps time.Ticker
type realTicker struct {
	ticker *time.Ticker
}

func (t *realTicker) C() <-chan time.Time {
	return t.ticker.C
}

func (t *realTicker) Stop() {
	t.ticker.Stop()
}

func (t *realTicker) Reset(d time.Duration) {
	t.ticker.Reset(d)
}

// MockTimeProvider for tests - instant completion
type MockTimeProvider struct {
	currentTime time.Time
}

// NewMockTimeProvider creates a new mock time provider
func NewMockTimeProvider(startTime time.Time) *MockTimeProvider {
	return &MockTimeProvider{
		currentTime: startTime,
	}
}

func (t *MockTimeProvider) Now() time.Time {
	return t.currentTime
}

func (t *MockTimeProvider) Sleep(d time.Duration) {
	// No-op in tests - instant completion
	t.currentTime = t.currentTime.Add(d)
}

func (t *MockTimeProvider) After(d time.Duration) <-chan time.Time {
	ch := make(chan time.Time, 1)
	t.currentTime = t.currentTime.Add(d)
	ch <- t.currentTime // Instant completion
	return ch
}

func (t *MockTimeProvider) NewTicker(d time.Duration) Ticker {
	return &mockTicker{
		ch:       make(chan time.Time, 1),
		interval: d,
		provider: t,
	}
}

// mockTicker simulates a ticker (instant ticks)
type mockTicker struct {
	ch       chan time.Time
	interval time.Duration
	provider *MockTimeProvider
	stopped  bool
}

func (t *mockTicker) C() <-chan time.Time {
	if !t.stopped {
		// Send one tick immediately for testing
		select {
		case t.ch <- t.provider.Now():
		default:
		}
	}
	return t.ch
}

func (t *mockTicker) Stop() {
	t.stopped = true
	close(t.ch)
}

func (t *mockTicker) Reset(d time.Duration) {
	t.interval = d
	t.stopped = false
}
