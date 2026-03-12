package claim

import (
	"context"
	"fmt"
	"strconv"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/rs/zerolog"
)

const (
	aliveKey       = "scheduler:alive"
	claimKeyPrefix = "scheduler:claims:"
	staleTTL       = 10 * time.Second
	heartbeatIvl   = 2 * time.Second
)

type Manager struct {
	instanceID string
	client     *redis.Client
	logger     zerolog.Logger
	queueNames []string

	stopCh chan struct{}
}

func NewManager(instanceID string, client *redis.Client, queueNames []string, logger zerolog.Logger) *Manager {
	return &Manager{
		instanceID: instanceID,
		client:     client,
		logger:     logger.With().Str("component", "claim").Logger(),
		queueNames: queueNames,
		stopCh:     make(chan struct{}),
	}
}

// Start begins the heartbeat and stale-cleanup loop.
func (m *Manager) Start(ctx context.Context) {
	go m.heartbeatLoop(ctx)
	go m.cleanupLoop(ctx)
}

// Stop signals the loops to exit and removes this instance's presence + claims.
func (m *Manager) Stop(ctx context.Context) {
	close(m.stopCh)

	pipe := m.client.Pipeline()
	pipe.ZRem(ctx, aliveKey, m.instanceID)
	for _, q := range m.queueNames {
		pipe.HDel(ctx, claimKeyPrefix+q, m.instanceID)
	}
	if _, err := pipe.Exec(ctx); err != nil {
		m.logger.Warn().Err(err).Msg("failed to clean up claims on stop")
	}
	m.logger.Info().Msg("removed presence and claims")
}

// SetClaim writes this instance's desired connection count for a queue.
func (m *Manager) SetClaim(ctx context.Context, queueName string, count int) error {
	return m.client.HSet(ctx, claimKeyPrefix+queueName, m.instanceID, strconv.Itoa(count)).Err()
}

// GetTotalClaimed returns the sum of all live instances' claims for a queue.
func (m *Manager) GetTotalClaimed(ctx context.Context, queueName string) (int, error) {
	liveIDs, err := m.getLiveInstances(ctx)
	if err != nil {
		return 0, err
	}

	all, err := m.client.HGetAll(ctx, claimKeyPrefix+queueName).Result()
	if err != nil {
		return 0, fmt.Errorf("hgetall claims %s: %w", queueName, err)
	}

	total := 0
	for id, valStr := range all {
		if !liveIDs[id] {
			continue
		}
		v, _ := strconv.Atoi(valStr)
		total += v
	}
	return total, nil
}

// GetMyClaim returns this instance's current claim for a queue.
func (m *Manager) GetMyClaim(ctx context.Context, queueName string) (int, error) {
	val, err := m.client.HGet(ctx, claimKeyPrefix+queueName, m.instanceID).Result()
	if err == redis.Nil {
		return 0, nil
	}
	if err != nil {
		return 0, err
	}
	v, _ := strconv.Atoi(val)
	return v, nil
}

func (m *Manager) heartbeatLoop(ctx context.Context) {
	ticker := time.NewTicker(heartbeatIvl)
	defer ticker.Stop()

	// Immediate first heartbeat
	m.writeHeartbeat(ctx)

	for {
		select {
		case <-m.stopCh:
			return
		case <-ctx.Done():
			return
		case <-ticker.C:
			m.writeHeartbeat(ctx)
		}
	}
}

func (m *Manager) writeHeartbeat(ctx context.Context) {
	err := m.client.ZAdd(ctx, aliveKey, redis.Z{
		Score:  float64(time.Now().UnixMilli()),
		Member: m.instanceID,
	}).Err()
	if err != nil {
		m.logger.Warn().Err(err).Msg("failed to write heartbeat")
	}
}

func (m *Manager) cleanupLoop(ctx context.Context) {
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-m.stopCh:
			return
		case <-ctx.Done():
			return
		case <-ticker.C:
			m.cleanupStale(ctx)
		}
	}
}

func (m *Manager) cleanupStale(ctx context.Context) {
	cutoff := float64(time.Now().Add(-staleTTL).UnixMilli())

	// Get stale instance IDs
	stale, err := m.client.ZRangeByScore(ctx, aliveKey, &redis.ZRangeBy{
		Min: "-inf",
		Max: fmt.Sprintf("%f", cutoff),
	}).Result()
	if err != nil {
		m.logger.Warn().Err(err).Msg("failed to query stale instances")
		return
	}

	if len(stale) == 0 {
		return
	}

	m.logger.Info().Strs("staleIDs", stale).Msg("cleaning up stale instances")

	pipe := m.client.Pipeline()
	members := make([]interface{}, len(stale))
	for i, id := range stale {
		members[i] = id
	}
	pipe.ZRem(ctx, aliveKey, members...)

	for _, q := range m.queueNames {
		for _, id := range stale {
			pipe.HDel(ctx, claimKeyPrefix+q, id)
		}
	}

	if _, err := pipe.Exec(ctx); err != nil {
		m.logger.Warn().Err(err).Msg("failed to clean up stale instances")
	}
}

func (m *Manager) getLiveInstances(ctx context.Context) (map[string]bool, error) {
	cutoff := float64(time.Now().Add(-staleTTL).UnixMilli())
	live, err := m.client.ZRangeByScore(ctx, aliveKey, &redis.ZRangeBy{
		Min: fmt.Sprintf("%f", cutoff),
		Max: "+inf",
	}).Result()
	if err != nil {
		return nil, fmt.Errorf("zrangebyscore alive: %w", err)
	}

	set := make(map[string]bool, len(live))
	for _, id := range live {
		set[id] = true
	}
	return set, nil
}
