package scheduler

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"sync"
	"time"

	goredis "github.com/redis/go-redis/v9"
	"github.com/rs/zerolog"

	"github.com/editframe/telecine/scheduler/internal/redis"
	"github.com/editframe/telecine/scheduler/internal/scheduler/coordination"
	"github.com/editframe/telecine/scheduler/pkg/superjson"
)

const (
	SchedulerTimeoutMS  = 10000
	SchedulerIntervalMS = 2000
)

type SchedulerInfo struct {
	ID         string `json:"id"`
	CreatedAt  int64  `json:"createdAt"`
	Stopped    bool   `json:"stopped"`
	LastUpdate int64  `json:"lastUpdate"`
}

type CoordinatorInterface interface {
	GetRank(ctx context.Context) (int, int, error)
	GetFairShare(rank, total, depth int) int
	ID() string
}

type Coordinator struct {
	client    *redis.Client
	info      *SchedulerInfo
	logger    *zerolog.Logger
	stopCh    chan struct{}
	wg        sync.WaitGroup
	started   bool
	startedMu sync.Mutex
}

func NewCoordinator(client *redis.Client, logger *zerolog.Logger) (*Coordinator, error) {
	id, err := generateID()
	if err != nil {
		return nil, fmt.Errorf("failed to generate scheduler ID: %w", err)
	}

	now := time.Now().UnixMilli()
	info := &SchedulerInfo{
		ID:         id,
		CreatedAt:  now,
		Stopped:    false,
		LastUpdate: now,
	}

	return &Coordinator{
		client: client,
		info:   info,
		logger: logger,
		stopCh: make(chan struct{}),
	}, nil
}

func (c *Coordinator) ID() string {
	return c.info.ID
}

func (c *Coordinator) Start(ctx context.Context) {
	c.startedMu.Lock()
	defer c.startedMu.Unlock()

	if c.started {
		c.logger.Warn().Msg("coordinator already started")
		return
	}

	c.started = true
	c.wg.Add(1)
	c.updatePresence(ctx)
	go c.presenceLoop(ctx)
}

func (c *Coordinator) presenceLoop(ctx context.Context) {
	defer c.wg.Done()

	for {
		select {
		case <-ctx.Done():
			return
		case <-c.stopCh:
			return
		case <-time.After(SchedulerIntervalMS * time.Millisecond):
			if err := c.updatePresence(ctx); err != nil {
				c.logger.Error().Err(err).Msg("failed to update presence")
			}
		}
	}
}

func (c *Coordinator) Stop(ctx context.Context) error {
	c.startedMu.Lock()
	if !c.started {
		c.startedMu.Unlock()
		return nil
	}
	c.startedMu.Unlock()

	close(c.stopCh)
	c.wg.Wait()
	return c.removePresence(ctx)
}

func (c *Coordinator) updatePresence(ctx context.Context) error {
	now := time.Now().UnixMilli()
	c.info.LastUpdate = now

	serialized, err := serializeScheduler(c.info)
	if err != nil {
		return fmt.Errorf("failed to serialize scheduler info: %w", err)
	}

	pipe := c.client.Pipeline()
	pipe.ZAdd(ctx, "schedulers", goredis.Z{
		Score:  float64(now),
		Member: serialized,
	})
	pipe.ZRemRangeByScore(ctx, "schedulers", "0", fmt.Sprintf("%d", now-SchedulerTimeoutMS))

	_, err = pipe.Exec(ctx)
	return err
}

func (c *Coordinator) removePresence(ctx context.Context) error {
	serialized, err := serializeScheduler(c.info)
	if err != nil {
		return fmt.Errorf("failed to serialize scheduler info: %w", err)
	}

	return c.client.ZRem(ctx, "schedulers", serialized).Err()
}

func (c *Coordinator) GetRank(ctx context.Context) (int, int, error) {
	// I/O: Fetch all schedulers from Redis
	now := time.Now().UnixMilli()
	cutoff := now - SchedulerTimeoutMS

	schedulers, err := c.client.ZRangeByScoreWithScores(ctx, "schedulers",
		&goredis.ZRangeBy{
			Min: fmt.Sprintf("%d", cutoff),
			Max: "+inf",
		}).Result()

	if err != nil {
		return -1, 0, fmt.Errorf("failed to get schedulers: %w", err)
	}

	// Convert Redis results to coordination.SchedulerInfo
	schedulerInfos := make([]coordination.SchedulerInfo, 0, len(schedulers))
	for _, scheduler := range schedulers {
		memberStr := scheduler.Member.(string)
		// Parse the scheduler info from the serialized string
		// For now, we'll extract just the ID from the serialized format
		// In a full implementation, we'd deserialize the entire SchedulerInfo
		schedulerInfos = append(schedulerInfos, coordination.SchedulerInfo{
			ID:         memberStr, // Using serialized string as ID for now
			LastUpdate: int64(scheduler.Score),
		})
	}

	// Pure function: Calculate rank
	serialized, err := serializeScheduler(c.info)
	if err != nil {
		return -1, 0, fmt.Errorf("failed to serialize scheduler info: %w", err)
	}

	result := coordination.CalculateRank(serialized, schedulerInfos)

	if !result.Found {
		c.logger.Debug().
			Str("ourSerialized", serialized).
			Int("schedulersFound", result.Total).
			Msg("scheduler not found in presence list")

		if result.Total > 0 {
			c.logger.Debug().
				Str("firstScheduler", schedulerInfos[0].ID).
				Msg("first scheduler in list for comparison")
		}
	}

	return result.Rank, result.Total, nil
}

func (c *Coordinator) GetFairShare(rank, total, quantity int) int {
	// Pure function: delegate to coordination package
	return coordination.CalculateFairShare(rank, total, quantity)
}

func serializeScheduler(info *SchedulerInfo) (string, error) {
	data := map[string]any{
		"id":        info.ID,
		"createdAt": info.CreatedAt,
		"stopped":   info.Stopped,
	}
	return superjson.Stringify(data)
}

// generateID creates a 13-character hex identifier from 8 random bytes
func generateID() (string, error) {
	bytes := make([]byte, 8)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes)[:13], nil
}
