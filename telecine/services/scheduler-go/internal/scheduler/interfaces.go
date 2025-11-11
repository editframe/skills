package scheduler

import (
	"context"

	"github.com/editframe/telecine/scheduler/internal/queue"
	"github.com/editframe/telecine/scheduler/internal/scheduler/scaling"
)

// StateStore manages persistent scaling state in Redis
type StateStore interface {
	// GetQueueStats retrieves statistics for all queues
	GetQueueStats(ctx context.Context) (map[string]QueueStats, error)

	// GetScalingHistory retrieves the scaling history for a specific queue
	GetScalingHistory(ctx context.Context, queueName string) (scaling.ScalingHistory, error)

	// SaveScalingHistory persists the scaling history for a queue
	SaveScalingHistory(ctx context.Context, queueName string, history scaling.ScalingHistory) error

	// DeleteScalingHistory removes the scaling history for a queue
	DeleteScalingHistory(ctx context.Context, queueName string) error
}

// ConnectionManager manages worker connections
type ConnectionManager interface {
	// GetConnectionState returns the current connection counts for a queue
	GetConnectionState(q queue.Queue) scaling.ConnectionState

	// CreateConnection creates a new worker connection for a queue
	CreateConnection(ctx context.Context, q queue.Queue) error

	// DisconnectOne gracefully disconnects one connection from a queue
	DisconnectOne(ctx context.Context, q queue.Queue) error

	// Shutdown stops all connections and cleans up resources
	Shutdown()
}

// SchedulerRegistry manages scheduler coordination
type SchedulerRegistry interface {
	// GetRank returns the rank of this scheduler among all active schedulers
	GetRank(ctx context.Context) (rank int, total int, err error)

	// ID returns the unique identifier for this scheduler
	ID() string

	// Start begins the heartbeat loop
	Start(ctx context.Context)

	// Stop gracefully stops the heartbeat loop
	Stop(ctx context.Context) error
}
