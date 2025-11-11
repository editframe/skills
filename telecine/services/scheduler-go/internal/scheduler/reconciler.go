package scheduler

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"sync"
	"time"

	"github.com/rs/zerolog"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"

	"github.com/editframe/telecine/scheduler/internal/connection"
	"github.com/editframe/telecine/scheduler/internal/queue"
	"github.com/editframe/telecine/scheduler/internal/redis"
	"github.com/editframe/telecine/scheduler/internal/scheduler/scaling"
	"github.com/editframe/telecine/scheduler/pkg/tracing"
)

const (
	// Log reconciliation stats every N cycles when there's no activity
	LogStatsEveryNCycles = 30
)

type QueueStats struct {
	Queued    int `json:"queued"`
	Claimed   int `json:"claimed"`
	Completed int `json:"completed"`
	Failed    int `json:"failed"`
	Stalled   int `json:"stalled"`
}

type QueueScalingInfo struct {
	QueueName          string  `json:"queueName"`
	RawTarget          int     `json:"rawTarget"`
	SmoothedTarget     float64 `json:"smoothedTarget"`
	ActualTarget       int     `json:"actualTarget"`
	WorkingConnections int     `json:"workingConnections"`
	NaturalQueueDepth  int     `json:"naturalQueueDepth"`
}

type QueueScalingState struct {
	smoothedTarget         float64
	lastRawTarget          int
	lastActualTarget       int
	lastWorkingConnections int
	lastNaturalQueueDepth  int
}

type Reconciler struct {
	coordinator              CoordinatorInterface
	stateMachine             *connection.StateMachine
	client                   *redis.Client
	queues                   []queue.Queue
	logger                   *zerolog.Logger
	stopCh                   chan struct{}
	wg                       sync.WaitGroup
	started                  bool
	startedMu                sync.Mutex
	cycleCount               int
	scalingState             map[string]*QueueScalingState
	scalingStateMu           sync.RWMutex
	tickMS                   int
	scaleDownSmoothingFactor float64
}

func NewReconciler(
	coordinator CoordinatorInterface,
	stateMachine *connection.StateMachine,
	client *redis.Client,
	queues []queue.Queue,
	logger *zerolog.Logger,
	tickMS int,
	scaleDownSmoothingFactor float64,
) *Reconciler {
	return &Reconciler{
		coordinator:              coordinator,
		stateMachine:             stateMachine,
		client:                   client,
		queues:                   queues,
		logger:                   logger,
		stopCh:                   make(chan struct{}),
		scalingState:             make(map[string]*QueueScalingState),
		tickMS:                   tickMS,
		scaleDownSmoothingFactor: scaleDownSmoothingFactor,
	}
}

func (r *Reconciler) Start(ctx context.Context) {
	r.startedMu.Lock()
	defer r.startedMu.Unlock()

	if r.started {
		return
	}

	r.log(ctx).Info().Msg("starting reconciler")
	r.started = true

	r.wg.Add(1)
	go r.scheduleReconciliation(ctx)
}

func (r *Reconciler) scheduleReconciliation(ctx context.Context) {
	defer r.wg.Done()

	for {
		select {
		case <-ctx.Done():
			return
		case <-r.stopCh:
			return
		case <-time.After(time.Duration(r.tickMS) * time.Millisecond):
			if err := r.reconcile(ctx); err != nil {
				r.log(ctx).Error().Err(err).Msg("reconciliation error")
			}
		}
	}
}

func (r *Reconciler) Stop() {
	r.startedMu.Lock()
	wasStarted := r.started
	r.startedMu.Unlock()

	if !wasStarted {
		return
	}

	close(r.stopCh)
	r.wg.Wait()
}

// log returns a logger with trace context from ctx
func (r *Reconciler) log(ctx context.Context) *zerolog.Logger {
	logger := tracing.Ctx(ctx, *r.logger)
	return &logger
}

func (r *Reconciler) getOrCreateScalingState(queueName string) *QueueScalingState {
	r.scalingStateMu.Lock()
	defer r.scalingStateMu.Unlock()

	state, ok := r.scalingState[queueName]
	if !ok {
		state = &QueueScalingState{
			smoothedTarget: 0,
		}
		r.scalingState[queueName] = state
	}
	return state
}

func (r *Reconciler) updateSmoothedTarget(ctx context.Context, state *QueueScalingState, currentTarget int) int {
	ctx, span := tracing.StartSpan(ctx, "updateSmoothedTarget")
	defer span.End()

	r.scalingStateMu.Lock()
	defer r.scalingStateMu.Unlock()

	currentTargetFloat := float64(currentTarget)
	previousTarget := state.smoothedTarget

	if state.smoothedTarget == 0 {
		state.smoothedTarget = currentTargetFloat
		span.SetAttributes(
			attribute.String("scaling.action", "initialize"),
			attribute.Float64("scaling.target", currentTargetFloat),
		)
	} else if currentTargetFloat > state.smoothedTarget {
		state.smoothedTarget = currentTargetFloat
		span.SetAttributes(
			attribute.String("scaling.action", "scale_up"),
			attribute.Float64("scaling.previous", previousTarget),
			attribute.Float64("scaling.target", currentTargetFloat),
		)
	} else {
		state.smoothedTarget = state.smoothedTarget*r.scaleDownSmoothingFactor + currentTargetFloat*(1-r.scaleDownSmoothingFactor)
		span.SetAttributes(
			attribute.String("scaling.action", "scale_down"),
			attribute.Float64("scaling.previous", previousTarget),
			attribute.Float64("scaling.raw_target", currentTargetFloat),
			attribute.Float64("scaling.smoothed_target", state.smoothedTarget),
			attribute.Float64("scaling.smoothing_factor", r.scaleDownSmoothingFactor),
		)
	}

	// Allow scaling to zero when raw target is 0 and smoothed target is below threshold
	// This prevents keeping 1 worker alive indefinitely due to Ceil() rounding
	var result int
	if currentTarget == 0 && state.smoothedTarget < 0.5 {
		result = 0
		span.SetAttributes(
			attribute.String("scaling.floor_zero", "true"),
		)
	} else {
		result = int(math.Ceil(state.smoothedTarget))
	}

	span.SetAttributes(
		attribute.Int("scaling.result", result),
	)

	return result
}

func (r *Reconciler) reconcile(ctx context.Context) error {
	ctx, span := tracing.StartSpan(ctx, "reconcile")
	defer span.End()

	r.cycleCount++
	span.SetAttributes(
		attribute.Int("cycle", r.cycleCount),
		attribute.Int("queue_count", len(r.queues)),
	)

	rank, total, err := r.coordinator.GetRank(ctx)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, "failed to get rank")
		return fmt.Errorf("failed to get rank: %w", err)
	}

	if rank == -1 {
		r.log(ctx).Warn().
			Int("rank", rank).
			Int("total", total).
			Msg("scheduler not found in list of present schedulers")
		return nil
	}

	queuesInfo, err := r.getQueuesInfo(ctx)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, "failed to get queues info")
		return fmt.Errorf("failed to get queues info: %w", err)
	}

	for _, q := range r.queues {
		queueCtx, queueSpan := tracing.StartSpan(ctx, "reconcile-queue")
		queueSpan.SetAttributes(attribute.String("queue.name", q.Name))

		stats, ok := queuesInfo[q.Name]
		if !ok {
			stats = QueueStats{
				Queued:    0,
				Claimed:   0,
				Completed: 0,
				Failed:    0,
				Stalled:   0,
			}
		}

		queueSpan.SetAttributes(
			attribute.Int("queue.queued", stats.Queued),
			attribute.Int("queue.claimed", stats.Claimed),
			attribute.Int("queue.stalled", stats.Stalled),
		)

		// Gather immutable state for pure function
		scalingState := r.getOrCreateScalingState(q.Name)
		currentConnections := r.stateMachine.GetAllConnections(q)
		workingConnections := r.stateMachine.GetWorkingConnections(q)

		// Convert to scaling package types
		scalingStats := scaling.QueueStats{
			Queued:    stats.Queued,
			Claimed:   stats.Claimed,
			Completed: stats.Completed,
			Failed:    stats.Failed,
			Stalled:   stats.Stalled,
		}

		connections := scaling.ConnectionState{
			Total:   currentConnections,
			Working: workingConnections,
		}

		history := scaling.ScalingHistory{
			SmoothedTarget: scalingState.smoothedTarget,
			LastRawTarget:  scalingState.lastRawTarget,
		}

		// Call pure function to calculate scaling decision
		decision := scaling.CalculateScalingDecision(q, scalingStats, connections, history, rank, total)

		// Update mutable state based on decision
		r.scalingStateMu.Lock()
		scalingState.smoothedTarget = decision.NewSmoothedTarget
		scalingState.lastRawTarget = decision.RawFairShare
		scalingState.lastActualTarget = decision.TargetConnections
		scalingState.lastWorkingConnections = decision.WorkingConnections
		scalingState.lastNaturalQueueDepth = decision.NaturalQueueDepth
		r.scalingStateMu.Unlock()

		if err := r.storeScalingInfoInRedis(queueCtx, q.Name, scalingState); err != nil {
			r.log(queueCtx).Warn().Err(err).Str("queue", q.Name).Msg("failed to store scaling info in redis")
		}

		queueSpan.SetAttributes(
			attribute.Int("queue.raw_fair_share", decision.RawFairShare),
			attribute.Int("queue.smoothed_fair_share", decision.TargetConnections),
			attribute.Int("queue.current_connections", decision.CurrentConnections),
			attribute.Int("queue.working_connections", decision.WorkingConnections),
			attribute.String("queue.action", decision.Action.String()),
		)

		// Only log reconciliation stats if:
		// 1. There's actual work (queued > 0 or claimed > 0), OR
		// 2. There are working connections, OR
		// 3. Every N cycles for periodic status updates (reduces log noise)
		hasActivity := stats.Queued > 0 || stats.Claimed > 0 || workingConnections > 0
		shouldLogPeriodically := r.cycleCount%LogStatsEveryNCycles == 0

		if hasActivity || shouldLogPeriodically {
			logger := r.log(queueCtx)
			logLevel := logger.Debug()
			if hasActivity {
				// Use Info level when there's actual activity
				logLevel = logger.Info()
			}

			logLevel.
				Str("queue", q.Name).
				Int("queued", stats.Queued).
				Int("claimed", stats.Claimed).
				Int("naturalQueueDepth", decision.NaturalQueueDepth).
				Int("rawFairShare", decision.RawFairShare).
				Int("smoothedFairShare", decision.TargetConnections).
				Int("workingConnections", decision.WorkingConnections).
				Int("rank", rank).
				Int("total", total).
				Str("action", decision.Action.String()).
				Msgf("queue reconciliation stats [queue=%s queued=%d claimed=%d working=%d raw=%d smoothed=%d action=%s]",
					q.Name, stats.Queued, stats.Claimed, decision.WorkingConnections, decision.RawFairShare, decision.TargetConnections, decision.Action.String())
		}

		// Execute scaling decision (imperative shell)
		switch decision.Action {
		case scaling.ActionScaleUp:
			scaleCtx, scaleSpan := tracing.StartSpan(queueCtx, "scale-up")
			needed := decision.TargetConnections - decision.WorkingConnections

			if needed+decision.WorkingConnections > q.MaxWorkerCount {
				needed = q.MaxWorkerCount - decision.WorkingConnections
			}

			scaleSpan.SetAttributes(
				attribute.Int("scale.needed", needed),
				attribute.Int("scale.working", decision.WorkingConnections),
				attribute.Int("scale.target", decision.TargetConnections),
			)

			logger := r.log(scaleCtx)
			logLevel := logger.Debug()
			if needed > 2 {
				logLevel = logger.Info()
			}

			logLevel.
				Str("queue", q.Name).
				Int("needed", needed).
				Int("workingConnections", decision.WorkingConnections).
				Int("smoothedFairShare", decision.TargetConnections).
				Msgf("adding connections to queue [queue=%s needed=%d working=%d target=%d]", q.Name, needed, decision.WorkingConnections, decision.TargetConnections)

			for i := 0; i < needed; i++ {
				if _, err := r.stateMachine.CreateConnection(scaleCtx, q); err != nil {
					scaleSpan.RecordError(err)
					logger.Error().
						Err(err).
						Str("queue", q.Name).
						Int("attempt", i+1).
						Int("needed", needed).
						Msgf("failed to create connection [queue=%s attempt=%d/%d]", q.Name, i+1, needed)
				}
			}
			scaleSpan.End()

		case scaling.ActionScaleDown:
			scaleCtx, scaleSpan := tracing.StartSpan(queueCtx, "scale-down")
			toRemove := decision.CurrentConnections - decision.TargetConnections

			scaleSpan.SetAttributes(
				attribute.Int("scale.to_remove", toRemove),
				attribute.Int("scale.current", decision.CurrentConnections),
				attribute.Int("scale.target", decision.TargetConnections),
			)

			logger := r.log(scaleCtx)
			logger.Info().
				Str("queue", q.Name).
				Int("toRemove", toRemove).
				Int("currentConnections", decision.CurrentConnections).
				Int("rawFairShare", decision.RawFairShare).
				Int("smoothedFairShare", decision.TargetConnections).
				Float64("smoothedTargetFloat", decision.NewSmoothedTarget).
				Msgf("removing connections from queue [queue=%s removing=%d current=%d raw=%d smoothed=%d]",
					q.Name, toRemove, decision.CurrentConnections, decision.RawFairShare, decision.TargetConnections)

			for i := 0; i < toRemove; i++ {
				if err := r.stateMachine.DisconnectOne(scaleCtx, q); err != nil {
					scaleSpan.RecordError(err)
					logger.Debug().
						Err(err).
						Str("queue", q.Name).
						Msg("failed to disconnect connection")
					break
				}
			}
			scaleSpan.End()

		case scaling.ActionCleanupState:
			r.scalingStateMu.Lock()
			delete(r.scalingState, q.Name)
			r.scalingStateMu.Unlock()
			r.log(queueCtx).Debug().Str("queue", q.Name).Msg("cleaned up scaling state for idle queue")
		}

		queueSpan.End()
	}

	return nil
}

func (r *Reconciler) getQueuesInfo(ctx context.Context) (map[string]QueueStats, error) {
	// Get exact queue statistics
	stats := make(map[string]QueueStats)

	for _, q := range r.queues {
		statsJSON, err := r.client.Commands.GetQueueStats(ctx, q.Name)
		if err != nil {
			r.log(ctx).Error().Err(err).Str("queue", q.Name).Msg("failed to get queue stats")
			// Fallback to zero stats for this queue
			stats[q.Name] = QueueStats{
				Queued:    0,
				Claimed:   0,
				Completed: 0,
				Failed:    0,
				Stalled:   0,
			}
			continue
		}

		var queueStats QueueStats
		if err := json.Unmarshal([]byte(statsJSON), &queueStats); err != nil {
			r.log(ctx).Error().Err(err).Str("queue", q.Name).Msg("failed to unmarshal queue stats")
			// Fallback to zero stats for this queue
			stats[q.Name] = QueueStats{
				Queued:    0,
				Claimed:   0,
				Completed: 0,
				Failed:    0,
				Stalled:   0,
			}
			continue
		}

		stats[q.Name] = queueStats
	}

	return stats, nil
}

func (r *Reconciler) GetScalingInfo() []QueueScalingInfo {
	r.scalingStateMu.RLock()
	defer r.scalingStateMu.RUnlock()

	info := make([]QueueScalingInfo, 0, len(r.scalingState))
	for queueName, state := range r.scalingState {
		info = append(info, QueueScalingInfo{
			QueueName:          queueName,
			RawTarget:          state.lastRawTarget,
			SmoothedTarget:     state.smoothedTarget,
			ActualTarget:       state.lastActualTarget,
			WorkingConnections: state.lastWorkingConnections,
			NaturalQueueDepth:  state.lastNaturalQueueDepth,
		})
	}
	return info
}

type QueueConnectionCount struct {
	QueueName          string `json:"queueName"`
	TotalConnections   int    `json:"totalConnections"`
	WorkingConnections int    `json:"workingConnections"`
}

func (r *Reconciler) GetConnectionCounts() []QueueConnectionCount {
	counts := make([]QueueConnectionCount, 0, len(r.queues))
	for _, q := range r.queues {
		counts = append(counts, QueueConnectionCount{
			QueueName:          q.Name,
			TotalConnections:   r.stateMachine.GetAllConnections(q),
			WorkingConnections: r.stateMachine.GetWorkingConnections(q),
		})
	}
	return counts
}

func (r *Reconciler) storeScalingInfoInRedis(ctx context.Context, queueName string, state *QueueScalingState) error {
	scalingData := map[string]interface{}{
		"rawTarget":          state.lastRawTarget,
		"smoothedTarget":     state.smoothedTarget,
		"actualTarget":       state.lastActualTarget,
		"workingConnections": state.lastWorkingConnections,
		"naturalQueueDepth":  state.lastNaturalQueueDepth,
	}

	jsonData, err := json.Marshal(scalingData)
	if err != nil {
		return fmt.Errorf("failed to marshal scaling data: %w", err)
	}

	key := fmt.Sprintf("scheduler:%s:%s:scaling", r.coordinator.ID(), queueName)

	// Store with expiration (10 seconds, since reconciliation runs every 2s)
	if err := r.client.Set(ctx, key, string(jsonData), 10*time.Second).Err(); err != nil {
		return fmt.Errorf("failed to set scaling info in redis: %w", err)
	}

	return nil
}
