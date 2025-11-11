package adapters

import (
	"context"

	"github.com/editframe/telecine/scheduler/internal/scheduler"
)

// CoordinatorAdapter implements SchedulerRegistry using the Coordinator
type CoordinatorAdapter struct {
	coordinator scheduler.CoordinatorInterface
}

// NewCoordinatorAdapter creates a new adapter for the coordinator
func NewCoordinatorAdapter(coordinator scheduler.CoordinatorInterface) *CoordinatorAdapter {
	return &CoordinatorAdapter{
		coordinator: coordinator,
	}
}

// GetRank returns the rank of this scheduler among all active schedulers
func (a *CoordinatorAdapter) GetRank(ctx context.Context) (int, int, error) {
	return a.coordinator.GetRank(ctx)
}

// ID returns the unique identifier for this scheduler
func (a *CoordinatorAdapter) ID() string {
	return a.coordinator.ID()
}

// Start begins the heartbeat loop
func (a *CoordinatorAdapter) Start(ctx context.Context) {
	// The Coordinator interface doesn't expose Start/Stop yet
	// This would need to be added to the interface or handled differently
	// For now, this is a placeholder
}

// Stop gracefully stops the heartbeat loop
func (a *CoordinatorAdapter) Stop(ctx context.Context) error {
	// The Coordinator interface doesn't expose Start/Stop yet
	// This would need to be added to the interface or handled differently
	// For now, this is a placeholder
	return nil
}
