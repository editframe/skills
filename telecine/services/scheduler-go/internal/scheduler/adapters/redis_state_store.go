package adapters

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/editframe/telecine/scheduler/internal/redis"
	"github.com/editframe/telecine/scheduler/internal/scheduler"
	"github.com/editframe/telecine/scheduler/internal/scheduler/scaling"
)

// RedisStateStore implements StateStore using Redis
type RedisStateStore struct {
	client *redis.Client
}

// NewRedisStateStore creates a new Redis-backed state store
func NewRedisStateStore(client *redis.Client) *RedisStateStore {
	return &RedisStateStore{
		client: client,
	}
}

// GetQueueStats retrieves statistics for all queues
func (s *RedisStateStore) GetQueueStats(ctx context.Context) (map[string]scheduler.QueueStats, error) {
	// This would call the existing Lua script or Redis commands
	// For now, return empty map as this is a placeholder
	return make(map[string]scheduler.QueueStats), nil
}

// GetScalingHistory retrieves the scaling history for a specific queue
func (s *RedisStateStore) GetScalingHistory(ctx context.Context, queueName string) (scaling.ScalingHistory, error) {
	key := fmt.Sprintf("scheduler:scaling:%s", queueName)

	data, err := s.client.Get(ctx, key).Result()
	if err != nil {
		if err.Error() == "redis: nil" {
			// No history exists yet, return zero values
			return scaling.ScalingHistory{
				SmoothedTarget: 0,
				LastRawTarget:  0,
			}, nil
		}
		return scaling.ScalingHistory{}, fmt.Errorf("failed to get scaling history: %w", err)
	}

	var history struct {
		SmoothedTarget float64 `json:"smoothedTarget"`
		LastRawTarget  int     `json:"lastRawTarget"`
	}

	if err := json.Unmarshal([]byte(data), &history); err != nil {
		return scaling.ScalingHistory{}, fmt.Errorf("failed to unmarshal scaling history: %w", err)
	}

	return scaling.ScalingHistory{
		SmoothedTarget: history.SmoothedTarget,
		LastRawTarget:  history.LastRawTarget,
	}, nil
}

// SaveScalingHistory persists the scaling history for a queue
func (s *RedisStateStore) SaveScalingHistory(ctx context.Context, queueName string, history scaling.ScalingHistory) error {
	key := fmt.Sprintf("scheduler:scaling:%s", queueName)

	data := struct {
		SmoothedTarget float64 `json:"smoothedTarget"`
		LastRawTarget  int     `json:"lastRawTarget"`
	}{
		SmoothedTarget: history.SmoothedTarget,
		LastRawTarget:  history.LastRawTarget,
	}

	jsonData, err := json.Marshal(data)
	if err != nil {
		return fmt.Errorf("failed to marshal scaling history: %w", err)
	}

	if err := s.client.Set(ctx, key, jsonData, 0).Err(); err != nil {
		return fmt.Errorf("failed to save scaling history: %w", err)
	}

	return nil
}

// DeleteScalingHistory removes the scaling history for a queue
func (s *RedisStateStore) DeleteScalingHistory(ctx context.Context, queueName string) error {
	key := fmt.Sprintf("scheduler:scaling:%s", queueName)

	if err := s.client.Del(ctx, key).Err(); err != nil {
		return fmt.Errorf("failed to delete scaling history: %w", err)
	}

	return nil
}
