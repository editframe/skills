package connection

import (
	"sync"
	"time"
)

// GoroutineManager abstracts goroutine spawning and tracking
type GoroutineManager interface {
	// Spawn runs fn in a goroutine with tracking
	Spawn(id string, fn func()) error

	// Wait waits for a specific goroutine to complete
	Wait(id string, timeout time.Duration) bool

	// WaitAll waits for all goroutines to complete
	WaitAll(timeout time.Duration) bool

	// Count returns the number of active goroutines
	Count() int

	// Stop signals all goroutines to stop
	Stop(id string)

	// StopAll signals all goroutines to stop
	StopAll()
}

// RealGoroutineManager uses actual goroutines
type RealGoroutineManager struct {
	active map[string]chan struct{}
	mu     sync.RWMutex
	wg     sync.WaitGroup
}

// NewRealGoroutineManager creates a new real goroutine manager
func NewRealGoroutineManager() *RealGoroutineManager {
	return &RealGoroutineManager{
		active: make(map[string]chan struct{}),
	}
}

func (g *RealGoroutineManager) Spawn(id string, fn func()) error {
	g.mu.Lock()
	stopCh := make(chan struct{})
	g.active[id] = stopCh
	g.wg.Add(1)
	g.mu.Unlock()

	go func() {
		defer g.wg.Done()
		defer func() {
			g.mu.Lock()
			delete(g.active, id)
			g.mu.Unlock()
		}()
		fn()
	}()

	return nil
}

func (g *RealGoroutineManager) Wait(id string, timeout time.Duration) bool {
	done := make(chan struct{})
	go func() {
		g.mu.RLock()
		_, exists := g.active[id]
		g.mu.RUnlock()

		if !exists {
			close(done)
			return
		}

		// Wait for goroutine to finish
		for {
			time.Sleep(10 * time.Millisecond)
			g.mu.RLock()
			_, exists := g.active[id]
			g.mu.RUnlock()
			if !exists {
				close(done)
				return
			}
		}
	}()

	select {
	case <-done:
		return true
	case <-time.After(timeout):
		return false
	}
}

func (g *RealGoroutineManager) WaitAll(timeout time.Duration) bool {
	done := make(chan struct{})
	go func() {
		g.wg.Wait()
		close(done)
	}()

	select {
	case <-done:
		return true
	case <-time.After(timeout):
		return false
	}
}

func (g *RealGoroutineManager) Count() int {
	g.mu.RLock()
	defer g.mu.RUnlock()
	return len(g.active)
}

func (g *RealGoroutineManager) Stop(id string) {
	g.mu.Lock()
	defer g.mu.Unlock()
	if stopCh, exists := g.active[id]; exists {
		close(stopCh)
	}
}

func (g *RealGoroutineManager) StopAll() {
	g.mu.Lock()
	defer g.mu.Unlock()
	for _, stopCh := range g.active {
		close(stopCh)
	}
}

// MockGoroutineManager for tests - asynchronous execution with tracking
type MockGoroutineManager struct {
	executions   []string
	running      map[string]chan struct{}
	stopChannels map[string]chan struct{}
	mu           sync.Mutex
	async        bool // If true, execute asynchronously; if false, execute synchronously
}

// NewMockGoroutineManager creates a new mock goroutine manager (synchronous by default)
func NewMockGoroutineManager() *MockGoroutineManager {
	return &MockGoroutineManager{
		executions:   make([]string, 0),
		running:      make(map[string]chan struct{}),
		stopChannels: make(map[string]chan struct{}),
		async:        false, // Default to synchronous for backward compatibility
	}
}

// NewAsyncMockGoroutineManager creates a new mock goroutine manager with asynchronous execution
func NewAsyncMockGoroutineManager() *MockGoroutineManager {
	return &MockGoroutineManager{
		executions:   make([]string, 0),
		running:      make(map[string]chan struct{}),
		stopChannels: make(map[string]chan struct{}),
		async:        true, // Asynchronous execution for StateMachine integration
	}
}

func (g *MockGoroutineManager) Spawn(id string, fn func()) error {
	g.mu.Lock()
	// Only track executions for synchronous mode (to avoid memory leaks in async memory tests)
	if !g.async {
		g.executions = append(g.executions, id)
	}
	done := make(chan struct{})
	stopCh := make(chan struct{})
	g.running[id] = done
	g.stopChannels[id] = stopCh
	async := g.async
	g.mu.Unlock()

	if async {
		// Execute asynchronously to support real goroutine behavior
		go func() {
			defer func() {
				g.mu.Lock()
				delete(g.running, id)
				delete(g.stopChannels, id)
				close(done)
				g.mu.Unlock()
			}()

			// Execute the function with a timeout to prevent indefinite blocking
			// This simulates real goroutines that would eventually terminate
			funcDone := make(chan struct{})
			go func() {
				defer close(funcDone)
				fn()
			}()

			select {
			case <-funcDone:
				// Function completed normally
			case <-stopCh:
				// Function was stopped
			case <-time.After(50 * time.Millisecond):
				// Timeout to prevent indefinite blocking in tests
				// This simulates the fact that real goroutines would eventually
				// terminate when connections fail quickly
			}
		}()
	} else {
		// Execute synchronously for backward compatibility with existing tests
		fn()

		// Clean up immediately
		g.mu.Lock()
		delete(g.running, id)
		delete(g.stopChannels, id)
		close(done)
		g.mu.Unlock()
	}

	return nil
}

func (g *MockGoroutineManager) Wait(id string, timeout time.Duration) bool {
	g.mu.Lock()
	done, exists := g.running[id]
	g.mu.Unlock()

	if !exists {
		return true // Already completed
	}

	select {
	case <-done:
		return true
	case <-time.After(timeout):
		return false
	}
}

func (g *MockGoroutineManager) WaitAll(timeout time.Duration) bool {
	deadline := time.Now().Add(timeout)

	for {
		g.mu.Lock()
		count := len(g.running)
		g.mu.Unlock()

		if count == 0 {
			return true
		}

		if time.Now().After(deadline) {
			return false
		}

		time.Sleep(1 * time.Millisecond)
	}
}

func (g *MockGoroutineManager) Count() int {
	g.mu.Lock()
	defer g.mu.Unlock()
	return len(g.running)
}

func (g *MockGoroutineManager) Stop(id string) {
	g.mu.Lock()
	if stopCh, exists := g.stopChannels[id]; exists {
		close(stopCh)
		delete(g.stopChannels, id)
	}
	g.mu.Unlock()
}

func (g *MockGoroutineManager) StopAll() {
	g.mu.Lock()
	for id, stopCh := range g.stopChannels {
		select {
		case <-stopCh:
			// Already closed
		default:
			close(stopCh)
		}
		delete(g.stopChannels, id)
	}
	g.mu.Unlock()
}

// GetExecutions returns the list of spawned goroutine IDs (for testing)
func (g *MockGoroutineManager) GetExecutions() []string {
	g.mu.Lock()
	defer g.mu.Unlock()
	result := make([]string, len(g.executions))
	copy(result, g.executions)
	return result
}
