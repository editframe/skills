package scheduler

import (
	"context"
)

// mockCoordinator simulates the coordinator for testing purposes.
type mockCoordinator struct {
	rank  int
	total int
}

func (m *mockCoordinator) GetRank(_ context.Context) (int, int, error) {
	return m.rank, m.total, nil
}

func (m *mockCoordinator) GetFairShare(_, _, depth int) int {
	// Simplified fair share for single-instance testing
	return depth
}

func (m *mockCoordinator) ID() string {
	return "mock-coordinator"
}
