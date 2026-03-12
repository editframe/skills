package reconciler

import (
	"context"
	"math"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/rs/zerolog"

	"github.com/editframe/telecine/scheduler-go/internal/claim"
	"github.com/editframe/telecine/scheduler-go/internal/pool"
	"github.com/editframe/telecine/scheduler-go/internal/queue"
)

const (
	tickInterval             = 1 * time.Second
	scaleDownSmoothingFactor = 0.9
	stalledThresholdMs       = 10_000
)

type scalingState struct {
	smoothedTarget float64
}

type Reconciler struct {
	client       *redis.Client
	claimMgr     *claim.Manager
	queues       []queue.Queue
	pools        map[string]*pool.Pool
	logger       zerolog.Logger
	scalingState map[string]*scalingState
	mu           sync.Mutex
}

func New(
	client *redis.Client,
	claimMgr *claim.Manager,
	queues []queue.Queue,
	pools map[string]*pool.Pool,
	logger zerolog.Logger,
) *Reconciler {
	return &Reconciler{
		client:       client,
		claimMgr:     claimMgr,
		queues:       queues,
		pools:        pools,
		logger:       logger.With().Str("component", "reconciler").Logger(),
		scalingState: make(map[string]*scalingState),
	}
}

func (r *Reconciler) Run(ctx context.Context) {
	ticker := time.NewTicker(tickInterval)
	defer ticker.Stop()

	r.logger.Info().Int("queues", len(r.queues)).Msg("reconciler started")

	for {
		select {
		case <-ctx.Done():
			r.logger.Info().Msg("reconciler stopping")
			return
		case <-ticker.C:
			r.tick(ctx)
		}
	}
}

func (r *Reconciler) tick(ctx context.Context) {
	allStats, err := queue.GetAllStats(ctx, r.client, r.queues, stalledThresholdMs)
	if err != nil {
		r.logger.Warn().Err(err).Msg("failed to get queue stats")
		return
	}

	for _, q := range r.queues {
		stats, ok := allStats[q.Name]
		if !ok {
			continue
		}
		r.reconcileQueue(ctx, q, stats)
	}
}

func (r *Reconciler) reconcileQueue(ctx context.Context, q queue.Queue, stats queue.Stats) {
	r.mu.Lock()
	state, ok := r.scalingState[q.Name]
	if !ok {
		state = &scalingState{}
		r.scalingState[q.Name] = state
	}
	r.mu.Unlock()

	// Compute raw target from queue depth
	naturalDepth := stats.Queued + stats.Claimed - stats.Stalled
	if naturalDepth < 0 {
		naturalDepth = 0
	}
	concurrentDepth := int(math.Ceil(float64(naturalDepth) / float64(q.WorkerConcurrency)))
	rawTarget := concurrentDepth
	if rawTarget > q.MaxWorkerCount {
		rawTarget = q.MaxWorkerCount
	}

	// Apply scaling policy
	var target float64
	if float64(rawTarget) > state.smoothedTarget {
		// Fast attack
		target = float64(rawTarget)
	} else {
		// Slow decay
		target = scaleDownSmoothingFactor*state.smoothedTarget + (1-scaleDownSmoothingFactor)*float64(rawTarget)
	}
	state.smoothedTarget = target

	instanceTarget := int(math.Round(target))
	if instanceTarget < q.MinWorkerCount {
		instanceTarget = q.MinWorkerCount
	}

	// Write our claim
	if err := r.claimMgr.SetClaim(ctx, q.Name, instanceTarget); err != nil {
		r.logger.Warn().Err(err).Str("queue", q.Name).Msg("failed to set claim")
		return
	}

	// Read our own claim (which may have been adjusted by coordination)
	myClaim, err := r.claimMgr.GetMyClaim(ctx, q.Name)
	if err != nil {
		r.logger.Warn().Err(err).Str("queue", q.Name).Msg("failed to get my claim")
		return
	}

	p := r.pools[q.Name]
	if p == nil {
		return
	}

	currentSize := p.Size()
	delta := myClaim - currentSize

	if delta > 0 {
		r.logger.Info().
			Str("event", "scalingUp").
			Str("queue", q.Name).
			Int("delta", delta).
			Int("currentConnections", currentSize).
			Int("targetConnections", myClaim).
			Int("rawTarget", rawTarget).
			Float64("smoothed", state.smoothedTarget).
			Int("queueDepth", stats.Queued).
			Int("claimed", stats.Claimed).
			Int("stalled", stats.Stalled).
			Msg("scaling up")
		p.Grow(ctx, delta)
	} else if delta < 0 {
		r.logger.Info().
			Str("event", "scalingDown").
			Str("queue", q.Name).
			Int("delta", delta).
			Int("currentConnections", currentSize).
			Int("targetConnections", myClaim).
			Int("rawTarget", rawTarget).
			Float64("smoothed", state.smoothedTarget).
			Int("queueDepth", stats.Queued).
			Int("claimed", stats.Claimed).
			Int("stalled", stats.Stalled).
			Msg("scaling down")
		p.Shrink(-delta)
	} else {
		r.logger.Debug().
			Str("event", "scalingSteady").
			Str("queue", q.Name).
			Int("currentConnections", currentSize).
			Int("targetConnections", myClaim).
			Int("rawTarget", rawTarget).
			Float64("smoothed", state.smoothedTarget).
			Int("queueDepth", stats.Queued).
			Msg("pool at target")
	}
}

// CloseAll closes all pools.
func (r *Reconciler) CloseAll() {
	for _, p := range r.pools {
		p.CloseAll()
	}
}
