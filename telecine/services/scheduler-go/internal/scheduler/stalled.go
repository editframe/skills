package scheduler

import (
	"context"
	"time"

	"github.com/rs/zerolog"

	"github.com/editframe/telecine/scheduler/internal/queue"
	"github.com/editframe/telecine/scheduler/internal/redis"
	"github.com/editframe/telecine/scheduler/pkg/superjson"
)

const (
	RestartIntervalMS = 2000
	MaxRetries        = 3
)

type StalledJobCleanup struct {
	client *redis.Client
	queues []queue.Queue
	logger *zerolog.Logger
	stopCh chan struct{}
}

type Job struct {
	Queue      string     `json:"queue"`
	WorkflowID string     `json:"workflowId"`
	Workflow   string     `json:"workflow"`
	JobID      string     `json:"jobId"`
	OrgID      string     `json:"orgId"`
	Attempts   int        `json:"attempts"`
	ClaimedAt  *time.Time `json:"claimedAt"`
	Payload    any        `json:"payload"`
}

func NewStalledJobCleanup(client *redis.Client, queues []queue.Queue, logger *zerolog.Logger) *StalledJobCleanup {
	return &StalledJobCleanup{
		client: client,
		queues: queues,
		logger: logger,
		stopCh: make(chan struct{}),
	}
}

func (s *StalledJobCleanup) Start(ctx context.Context) {
	go s.scheduleCleanup(ctx)
}

func (s *StalledJobCleanup) scheduleCleanup(ctx context.Context) {
	select {
	case <-ctx.Done():
		return
	case <-s.stopCh:
		return
	case <-time.After(RestartIntervalMS * time.Millisecond):
		if err := s.cleanup(ctx); err != nil {
			s.logger.Error().Err(err).Msg("stalled job cleanup error")
		}
		s.scheduleCleanup(ctx)
	}
}

func (s *StalledJobCleanup) Stop() {
	close(s.stopCh)
}

func (s *StalledJobCleanup) cleanup(ctx context.Context) error {
	for _, q := range s.queues {
		if err := s.releaseAllStalledJobs(ctx, q); err != nil {
			s.logger.Error().Err(err).Str("queue", q.Name).Msg("failed to release stalled jobs")
		}
	}
	return nil
}

func (s *StalledJobCleanup) releaseAllStalledJobs(ctx context.Context, q queue.Queue) error {
	// Use efficient stalled job detection with time-based filtering
	cutoffTime := time.Now().Add(-10 * time.Second).UnixMilli() // 10 seconds ago
	key := "queues:" + q.Name + ":claimed"

	// Process stalled jobs in batches
	batchSize := 10
	processed := 0
	maxProcessed := 100 // Limit to prevent blocking

	for processed < maxProcessed {
		jobs, err := s.client.Commands.GetStalledJobs(ctx, key, cutoffTime, batchSize)
		if err != nil {
			return err
		}

		if len(jobs) == 0 {
			break
		}

		for _, jobJSON := range jobs {
			var job Job
			if err := superjson.Unmarshal([]byte(jobJSON), &job); err != nil {
				s.logger.Error().Err(err).Msg("failed to unmarshal job")
				continue
			}

			if err := s.releaseJob(ctx, job); err != nil {
				s.logger.Error().Err(err).Str("jobID", job.JobID).Msg("failed to release job")
			}

			processed++
		}
	}

	return nil
}

func (s *StalledJobCleanup) releaseJob(ctx context.Context, job Job) error {
	if job.Attempts >= MaxRetries {
		return s.failJob(ctx, job)
	}

	job.Attempts++
	jobJSON, err := superjson.Stringify(job)
	if err != nil {
		return err
	}

	if err := s.client.Commands.RemoveJobFromStage(ctx, job.Queue, job.OrgID, job.WorkflowID, job.Workflow, job.JobID, "claimed"); err != nil {
		return err
	}

	return s.client.Commands.EnqueueJob(ctx, job.Queue, job.WorkflowID, job.JobID, job.OrgID, jobJSON, "REQUEUE")
}

func (s *StalledJobCleanup) failJob(ctx context.Context, job Job) error {
	now := time.Now().UnixMilli()

	pipe := s.client.Pipeline()

	s.client.Commands.MoveBetweenStages(ctx, job.Queue, job.OrgID, job.WorkflowID, job.Workflow, job.JobID, "claimed", "failed", now)

	s.client.Commands.FailWorkflow(ctx, job.WorkflowID, job.Workflow, job.OrgID, now)

	_, err := pipe.Exec(ctx)
	return err
}
