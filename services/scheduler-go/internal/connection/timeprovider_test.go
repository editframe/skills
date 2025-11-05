package connection

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestMockTimeProvider_Now(t *testing.T) {
	startTime := time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)
	provider := NewMockTimeProvider(startTime)

	now := provider.Now()
	assert.Equal(t, startTime, now)
}

func TestMockTimeProvider_Sleep(t *testing.T) {
	startTime := time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)
	provider := NewMockTimeProvider(startTime)

	// Sleep should advance time instantly
	provider.Sleep(5 * time.Second)

	expected := startTime.Add(5 * time.Second)
	assert.Equal(t, expected, provider.Now())
}

func TestMockTimeProvider_After(t *testing.T) {
	startTime := time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)
	provider := NewMockTimeProvider(startTime)

	// After should return a channel that fires immediately
	ch := provider.After(10 * time.Second)

	select {
	case receivedTime := <-ch:
		expected := startTime.Add(10 * time.Second)
		assert.Equal(t, expected, receivedTime)
	case <-time.After(100 * time.Millisecond):
		t.Fatal("After channel should fire immediately in mock")
	}
}

func TestMockTimeProvider_NewTicker(t *testing.T) {
	startTime := time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)
	provider := NewMockTimeProvider(startTime)

	ticker := provider.NewTicker(1 * time.Second)
	assert.NotNil(t, ticker)

	// Mock ticker should tick immediately
	select {
	case <-ticker.C():
		// Success - got a tick
	case <-time.After(100 * time.Millisecond):
		t.Fatal("Mock ticker should tick immediately")
	}

	ticker.Stop()
}

func TestRealTimeProvider_Operations(t *testing.T) {
	provider := NewRealTimeProvider()

	// Test Now
	now := provider.Now()
	assert.WithinDuration(t, time.Now(), now, time.Second)

	// Test After
	start := time.Now()
	ch := provider.After(10 * time.Millisecond)
	<-ch
	elapsed := time.Since(start)
	assert.GreaterOrEqual(t, elapsed, 10*time.Millisecond)

	// Test NewTicker
	ticker := provider.NewTicker(10 * time.Millisecond)
	assert.NotNil(t, ticker)

	// Wait for at least one tick
	select {
	case <-ticker.C():
		// Success
	case <-time.After(100 * time.Millisecond):
		t.Fatal("Ticker should have ticked")
	}

	ticker.Stop()
}

func TestMockTicker_Stop(t *testing.T) {
	startTime := time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)
	provider := NewMockTimeProvider(startTime)

	ticker := provider.NewTicker(1 * time.Second)
	mockTicker := ticker.(*mockTicker)

	assert.False(t, mockTicker.stopped)

	ticker.Stop()
	assert.True(t, mockTicker.stopped)
}

func TestMockTicker_Reset(t *testing.T) {
	startTime := time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)
	provider := NewMockTimeProvider(startTime)

	ticker := provider.NewTicker(1 * time.Second)
	mockTicker := ticker.(*mockTicker)

	assert.Equal(t, 1*time.Second, mockTicker.interval)

	ticker.Reset(2 * time.Second)
	assert.Equal(t, 2*time.Second, mockTicker.interval)
	assert.False(t, mockTicker.stopped)
}
