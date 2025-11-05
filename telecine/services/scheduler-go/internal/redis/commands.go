package redis

import (
	"context"
	_ "embed"
	"fmt"

	"github.com/redis/go-redis/v9"
)

//go:embed lua/enqueueJob.lua
var enqueueJobScript string

//go:embed lua/claimJob.lua
var claimJobScript string

//go:embed lua/deleteJob.lua
var deleteJobScript string

//go:embed lua/failWorkflow.lua
var failWorkflowScript string

//go:embed lua/moveBetweenStages.lua
var moveBetweenStagesScript string

//go:embed lua/maybeEnqueueFinalizer.lua
var maybeEnqueueFinalizerScript string

//go:embed lua/removeJobFromStage.lua
var removeJobFromStageScript string

//go:embed lua/getJobs.lua
var getJobsScript string

//go:embed lua/getStalledJobs.lua
var getStalledJobsScript string

//go:embed lua/getQueueStats.lua
var getQueueStatsScript string

//go:embed lua/mgetQueueStats.lua
var mgetQueueStatsScript string

//go:embed lua/getSchedulerStats.lua
var getSchedulerStatsScript string

//go:embed lua/cleanupOldJobs.lua
var cleanupOldJobsScript string

type Commands struct {
	client *redis.Client

	enqueueJob            *redis.Script
	claimJob              *redis.Script
	deleteJob             *redis.Script
	failWorkflow          *redis.Script
	moveBetweenStages     *redis.Script
	maybeEnqueueFinalizer *redis.Script
	removeJobFromStage    *redis.Script
	getJobs               *redis.Script
	getStalledJobs        *redis.Script
	getQueueStats         *redis.Script
	mgetQueueStats        *redis.Script
	getSchedulerStats     *redis.Script
	cleanupOldJobs        *redis.Script
}

func NewCommands(client *redis.Client) *Commands {
	return &Commands{
		client:                client,
		enqueueJob:            redis.NewScript(enqueueJobScript),
		claimJob:              redis.NewScript(claimJobScript),
		deleteJob:             redis.NewScript(deleteJobScript),
		failWorkflow:          redis.NewScript(failWorkflowScript),
		moveBetweenStages:     redis.NewScript(moveBetweenStagesScript),
		maybeEnqueueFinalizer: redis.NewScript(maybeEnqueueFinalizerScript),
		removeJobFromStage:    redis.NewScript(removeJobFromStageScript),
		getJobs:               redis.NewScript(getJobsScript),
		getStalledJobs:        redis.NewScript(getStalledJobsScript),
		getQueueStats:         redis.NewScript(getQueueStatsScript),
		mgetQueueStats:        redis.NewScript(mgetQueueStatsScript),
		getSchedulerStats:     redis.NewScript(getSchedulerStatsScript),
		cleanupOldJobs:        redis.NewScript(cleanupOldJobsScript),
	}
}

func (c *Commands) EnqueueJob(ctx context.Context, queue, workflowID, jobID, orgID, payload string, requeue ...string) error {
	args := []interface{}{queue, workflowID, jobID, orgID, payload}
	if len(requeue) > 0 {
		args = append(args, requeue[0])
	}

	_, err := c.enqueueJob.Run(ctx, c.client, []string{}, args...).Result()
	return err
}

func (c *Commands) ClaimJob(ctx context.Context, queue string, timestamp int64) (string, error) {
	result, err := c.claimJob.Run(ctx, c.client, []string{}, queue, timestamp).Result()
	if err != nil {
		return "", err
	}

	if result == nil {
		return "", nil
	}

	str, ok := result.(string)
	if !ok {
		return "", fmt.Errorf("unexpected result type: %T", result)
	}

	return str, nil
}

func (c *Commands) DeleteJob(ctx context.Context, queue, jobID, orgID, workflow, workflowID, stage string) error {
	_, err := c.deleteJob.Run(ctx, c.client, []string{}, queue, jobID, orgID, workflow, workflowID, stage).Result()
	return err
}

func (c *Commands) FailWorkflow(ctx context.Context, workflowID, workflowName, orgID string, now int64) (int64, error) {
	result, err := c.failWorkflow.Run(ctx, c.client, []string{}, workflowID, workflowName, orgID, now).Result()
	if err != nil {
		return 0, err
	}

	count, ok := result.(int64)
	if !ok {
		return 0, fmt.Errorf("unexpected result type: %T", result)
	}

	return count, nil
}

func (c *Commands) MoveBetweenStages(ctx context.Context, queue, orgID, workflowID, workflowName, jobID, fromStage, toStage string, now int64) error {
	_, err := c.moveBetweenStages.Run(ctx, c.client, []string{}, queue, orgID, workflowID, workflowName, jobID, fromStage, toStage, now).Result()
	return err
}

func (c *Commands) MaybeEnqueueFinalizer(ctx context.Context, queue, orgID, workflowID, workflowName, payload string, now int64) error {
	_, err := c.maybeEnqueueFinalizer.Run(ctx, c.client, []string{}, queue, orgID, workflowID, workflowName, payload, now).Result()
	return err
}

func (c *Commands) RemoveJobFromStage(ctx context.Context, queue, orgID, workflowID, workflowName, jobID, stage string) error {
	_, err := c.removeJobFromStage.Run(ctx, c.client, []string{}, queue, orgID, workflowID, workflowName, jobID, stage).Result()
	return err
}

func (c *Commands) GetJobs(ctx context.Context, key string, offset, limit int) ([]string, error) {
	result, err := c.getJobs.Run(ctx, c.client, []string{key}, offset, limit).Result()
	if err != nil {
		return nil, err
	}

	jobs, ok := result.([]interface{})
	if !ok {
		return nil, fmt.Errorf("unexpected result type: %T", result)
	}

	strs := make([]string, 0, len(jobs))
	for _, job := range jobs {
		if s, ok := job.(string); ok {
			strs = append(strs, s)
		}
	}

	return strs, nil
}

func (c *Commands) CleanupOldJobs(ctx context.Context, stage string, cutoffTime int64, batchSize int, queueName ...string) (int64, error) {
	args := []interface{}{stage, cutoffTime, batchSize}
	if len(queueName) > 0 {
		args = append(args, queueName[0])
	}

	result, err := c.cleanupOldJobs.Run(ctx, c.client, []string{}, args...).Result()
	if err != nil {
		return 0, err
	}

	count, ok := result.(int64)
	if !ok {
		return 0, fmt.Errorf("unexpected result type: %T", result)
	}

	return count, nil
}

func (c *Commands) GetStalledJobs(ctx context.Context, key string, cutoffTime int64, batchSize int) ([]string, error) {
	result, err := c.getStalledJobs.Run(ctx, c.client, []string{key}, cutoffTime, batchSize).Result()
	if err != nil {
		return nil, err
	}

	jobs, ok := result.([]interface{})
	if !ok {
		return nil, fmt.Errorf("unexpected result type: %T", result)
	}

	strs := make([]string, 0, len(jobs))
	for _, job := range jobs {
		if s, ok := job.(string); ok {
			strs = append(strs, s)
		}
	}

	return strs, nil
}

func (c *Commands) GetQueueStats(ctx context.Context, queue string) (string, error) {
	result, err := c.getQueueStats.Run(ctx, c.client, []string{queue}).Result()
	if err != nil {
		return "", err
	}

	str, ok := result.(string)
	if !ok {
		return "", fmt.Errorf("unexpected result type: %T", result)
	}

	return str, nil
}

func (c *Commands) MGetQueueStats(ctx context.Context, queues ...string) (string, error) {
	args := make([]any, len(queues))
	for i, q := range queues {
		args[i] = q
	}

	result, err := c.mgetQueueStats.Run(ctx, c.client, []string{}, args...).Result()
	if err != nil {
		return "", err
	}

	str, ok := result.(string)
	if !ok {
		return "", fmt.Errorf("unexpected result type: %T", result)
	}

	return str, nil
}

func (c *Commands) GetSchedulerStats(ctx context.Context, schedulerID string, queueNames []string) (string, error) {
	args := make([]any, 1+len(queueNames))
	args[0] = schedulerID
	for i, q := range queueNames {
		args[i+1] = q
	}

	result, err := c.getSchedulerStats.Run(ctx, c.client, []string{}, args...).Result()
	if err != nil {
		return "", err
	}

	str, ok := result.(string)
	if !ok {
		return "", fmt.Errorf("unexpected result type: %T", result)
	}

	return str, nil
}
