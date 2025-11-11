package adapters

import (
	"context"

	"github.com/editframe/telecine/scheduler/internal/connection"
	"github.com/editframe/telecine/scheduler/internal/queue"
	"github.com/editframe/telecine/scheduler/internal/scheduler/scaling"
)

// StateMachineAdapter implements ConnectionManager using the StateMachine
type StateMachineAdapter struct {
	sm *connection.StateMachine
}

// NewStateMachineAdapter creates a new adapter for the state machine
func NewStateMachineAdapter(sm *connection.StateMachine) *StateMachineAdapter {
	return &StateMachineAdapter{
		sm: sm,
	}
}

// GetConnectionState returns the current connection counts for a queue
func (a *StateMachineAdapter) GetConnectionState(q queue.Queue) scaling.ConnectionState {
	total := a.sm.GetAllConnections(q)
	working := a.sm.GetWorkingConnections(q)

	return scaling.ConnectionState{
		Total:   total,
		Working: working,
	}
}

// CreateConnection creates a new worker connection for a queue
func (a *StateMachineAdapter) CreateConnection(ctx context.Context, q queue.Queue) error {
	_, err := a.sm.CreateConnection(ctx, q)
	return err
}

// DisconnectOne gracefully disconnects one connection from a queue
func (a *StateMachineAdapter) DisconnectOne(ctx context.Context, q queue.Queue) error {
	return a.sm.DisconnectOne(ctx, q)
}

// Shutdown stops all connections and cleans up resources
func (a *StateMachineAdapter) Shutdown() {
	a.sm.Shutdown()
}
