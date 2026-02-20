package stall

import (
	"context"
	"encoding/json"
	"fmt"
	"strconv"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/rs/zerolog"

	"github.com/editframe/telecine/scheduler-go/internal/queue"
)

const (
	tickInterval    = 2 * time.Second
	stallThresholdS = 10
	maxAttempts     = 3
	batchSize       = 20
)

// superJSONJob is the outer SuperJSON envelope: {"json": {...}}
type superJSONJob struct {
	JSON jobData `json:"json"`
}

type jobData struct {
	Queue      string          `json:"queue"`
	WorkflowID string          `json:"workflowId"`
	Workflow   string          `json:"workflow"`
	JobID      string          `json:"jobId"`
	OrgID      string          `json:"orgId"`
	Attempts   int             `json:"attempts"`
	ClaimedAt  json.RawMessage `json:"claimedAt"`
	Payload    json.RawMessage `json:"payload"`
}

// Detector periodically finds and releases stalled jobs.
type Detector struct {
	client *redis.Client
	queues []queue.Queue
	logger zerolog.Logger

	getStalledJobsScript    *redis.Script
	moveBetweenStagesScript *redis.Script
	failWorkflowScript      *redis.Script
}

func NewDetector(client *redis.Client, queues []queue.Queue, logger zerolog.Logger) *Detector {
	return &Detector{
		client: client,
		queues: queues,
		logger: logger.With().Str("component", "stall-detector").Logger(),

		getStalledJobsScript:    redis.NewScript(getStalledJobsLua),
		moveBetweenStagesScript: redis.NewScript(moveBetweenStagesLua),
		failWorkflowScript:      redis.NewScript(failWorkflowLua),
	}
}

func (d *Detector) Run(ctx context.Context) {
	ticker := time.NewTicker(tickInterval)
	defer ticker.Stop()

	d.logger.Info().Int("queues", len(d.queues)).Msg("stall detector started")

	for {
		select {
		case <-ctx.Done():
			d.logger.Info().Msg("stall detector stopping")
			return
		case <-ticker.C:
			d.tick(ctx)
		}
	}
}

func (d *Detector) tick(ctx context.Context) {
	for _, q := range d.queues {
		d.detectAndRelease(ctx, q.Name)
	}
}

func (d *Detector) detectAndRelease(ctx context.Context, queueName string) {
	for i := 0; i < 1000; i++ {
		job, raw, err := d.getOneStalledJob(ctx, queueName)
		if err != nil {
			d.logger.Warn().Err(err).Str("queue", queueName).Msg("failed to get stalled jobs")
			return
		}
		if job == nil {
			return
		}

		if err := d.releaseJob(ctx, job, raw); err != nil {
			d.logger.Warn().Err(err).
				Str("queue", queueName).
				Str("jobId", job.JobID).
				Msg("failed to release stalled job")
			return
		}
	}
}

func (d *Detector) getOneStalledJob(ctx context.Context, queueName string) (*jobData, string, error) {
	cutoffTime := time.Now().UnixMilli() - int64(stallThresholdS*1000)

	result, err := d.getStalledJobsScript.Run(ctx, d.client,
		[]string{fmt.Sprintf("queues:%s:claimed", queueName)},
		cutoffTime, 1,
	).StringSlice()
	if err != nil {
		if err == redis.Nil {
			return nil, "", nil
		}
		return nil, "", fmt.Errorf("getStalledJobs eval: %w", err)
	}

	if len(result) == 0 || result[0] == "" {
		return nil, "", nil
	}

	raw := result[0]
	var envelope superJSONJob
	if err := json.Unmarshal([]byte(raw), &envelope); err != nil {
		return nil, "", fmt.Errorf("unmarshal job: %w", err)
	}

	return &envelope.JSON, raw, nil
}

func (d *Detector) releaseJob(ctx context.Context, job *jobData, raw string) error {
	if job.Attempts >= maxAttempts {
		return d.failJob(ctx, job)
	}
	return d.retryJob(ctx, job, raw)
}

func (d *Detector) retryJob(ctx context.Context, job *jobData, _ string) error {
	d.logger.Info().
		Str("queue", job.Queue).
		Str("jobId", job.JobID).
		Str("workflowId", job.WorkflowID).
		Int("attempts", job.Attempts).
		Msg("retrying stalled job")

	job.Attempts++
	newRaw, err := serializeJob(job)
	if err != nil {
		return fmt.Errorf("serialize job: %w", err)
	}

	// Atomic: SET job data + remove from claimed + re-enqueue with REQUEUE flag
	if err := retryJobScript.Run(ctx, d.client, nil,
		job.Queue, job.OrgID, job.WorkflowID, job.Workflow, job.JobID, newRaw,
	).Err(); err != nil && err != redis.Nil {
		return fmt.Errorf("retryJob: %w", err)
	}
	return nil
}

func (d *Detector) failJob(ctx context.Context, job *jobData) error {
	d.logger.Info().
		Str("queue", job.Queue).
		Str("jobId", job.JobID).
		Str("workflowId", job.WorkflowID).
		Int("attempts", job.Attempts).
		Msg("failing stalled job (retries exhausted)")

	now := strconv.FormatInt(time.Now().UnixMilli(), 10)

	// moveBetweenStages: claimed -> failed
	if err := d.moveBetweenStagesScript.Run(ctx, d.client, nil,
		job.Queue, job.OrgID, job.WorkflowID, job.Workflow, job.JobID, "claimed", "failed", now,
	).Err(); err != nil && err != redis.Nil {
		return fmt.Errorf("moveBetweenStages: %w", err)
	}

	// failWorkflow
	if err := d.failWorkflowScript.Run(ctx, d.client, nil,
		job.WorkflowID, job.Workflow, job.OrgID, now,
	).Err(); err != nil && err != redis.Nil {
		return fmt.Errorf("failWorkflow: %w", err)
	}

	return nil
}

func serializeJob(job *jobData) (string, error) {
	envelope := superJSONJob{JSON: *job}
	b, err := json.Marshal(envelope)
	if err != nil {
		return "", err
	}
	return string(b), nil
}

// Lua scripts — inlined to match the TypeScript Lua scripts exactly.

const getStalledJobsLua = `
local key = KEYS[1]
local cutoffTime = tonumber(ARGV[1])
local batchSize = tonumber(ARGV[2]) or 10
local jobKeys = redis.call("zrangebyscore", key, "-inf", cutoffTime, "LIMIT", 0, batchSize)
if #jobKeys == 0 then
  return {}
end
return redis.call("mget", unpack(jobKeys))
`

const moveBetweenStagesLua = `
local queueName = ARGV[1]
local orgId = ARGV[2]
local workflowId = ARGV[3]
local workflowName = ARGV[4]
local jobId = ARGV[5]
local fromStage = ARGV[6]
local toStage = ARGV[7]
local now = ARGV[8]

local jobKey = "queues:" .. queueName .. ":jobs:" .. jobId
local isInFromStage = redis.call("zscore", "queues:" .. queueName .. ":" .. fromStage, jobKey)

if isInFromStage then
  redis.call("zrem", "queues:" .. queueName .. ":" .. fromStage, jobKey)
  redis.call("zrem", "workflows:" .. workflowId .. ":" .. fromStage, jobKey)
  redis.call("zrem", "queues:" .. queueName .. ":orgs:" .. orgId .. ":workflows:" .. workflowId .. ":" .. fromStage, jobKey)
  redis.call("zadd", "queues:" .. queueName .. ":" .. toStage, now, jobKey)
  redis.call("zadd", "workflows:" .. workflowId .. ":" .. toStage, now, jobKey)
  redis.call("zadd", "queues:" .. queueName .. ":orgs:" .. orgId .. ":workflows:" .. workflowId .. ":" .. toStage, now, jobKey)
end
`

const failWorkflowLua = `
local workflowId = ARGV[1]
local workflowName = ARGV[2]
local orgId = ARGV[3]
local now = ARGV[4]

local queues = {}
local totalMoved = 0

local function failJobsInStage(stage)
  local jobs = redis.call("zrange", "workflows:" .. workflowId .. ":" .. stage, 0, -1)
  for i=1, #jobs do
    local jobKey = jobs[i]
    local raw = redis.call("get", jobKey)
    if raw then
      local jobData = cjson.decode(raw)
      local queue = jobData.json.queue

      queues[queue] = true

      redis.call("zrem", "workflows:" .. workflowId .. ":" .. stage, jobKey)
      redis.call("zadd", "workflows:" .. workflowId .. ":failed", now, jobKey)
      redis.call("zrem", "queues:" .. queue .. ":" .. stage, jobKey)
      redis.call("zadd", "queues:" .. queue .. ":failed", now, jobKey)

      local stageKey = "queues:" .. queue .. ":orgs:" .. orgId .. ":workflows:" .. workflowId .. ":" .. stage
      local failedKey = "queues:" .. queue .. ":orgs:" .. orgId .. ":workflows:" .. workflowId .. ":failed"
      redis.call("zrem", stageKey, jobKey)
      redis.call("zadd", failedKey, now, jobKey)

      totalMoved = totalMoved + 1
    end
  end
end

failJobsInStage("queued")
failJobsInStage("claimed")

for queue, _ in pairs(queues) do
  local workflowKey = "queues:" .. queue .. ":orgs:" .. orgId .. ":workflows:" .. workflowId
  redis.call("zrem", "queues:" .. queue .. ":orgs:" .. orgId .. ":workflows", workflowKey)
  local orgWorkflowCount = tonumber(redis.call("zcard", "queues:" .. queue .. ":orgs:" .. orgId .. ":workflows")) or 0
  if orgWorkflowCount == 0 then
    local orgKey = "queues:" .. queue .. ":orgs:" .. orgId
    redis.call("zrem", "queues:" .. queue .. ":orgs", orgKey)
  end
end

redis.call("set", "workflows:" .. workflowId .. ":status", "failed")
return totalMoved
`

// retryJobScript atomically: updates job data, removes from claimed stage, re-enqueues with fair-scheduling tree.
var retryJobScript = redis.NewScript(`
local queue = ARGV[1]
local orgId = ARGV[2]
local workflowId = ARGV[3]
local workflowName = ARGV[4]
local jobId = ARGV[5]
local payload = ARGV[6]

local jobKey = "queues:" .. queue .. ":jobs:" .. jobId

redis.call("set", jobKey, payload)

redis.call("zrem", "queues:" .. queue .. ":claimed", jobKey)
redis.call("zrem", "workflows:" .. workflowId .. ":claimed", jobKey)
redis.call("zrem", "queues:" .. queue .. ":orgs:" .. orgId .. ":workflows:" .. workflowId .. ":claimed", jobKey)

local scope = "queues:" .. queue
local now = tonumber(redis.call("time")[1]) * 1000

local inputFamilies = {
  "orgs", orgId,
  "workflows", workflowId
}

local stack = {}
for i = 1, 4, 2 do
  local family = inputFamilies[i]
  local id = inputFamilies[i + 1]
  local prefix = stack[#stack] or ""
  local familyKey = (prefix == "" and family or prefix .. ":" .. family)
  redis.call('ZADD', scope .. ":" .. familyKey, 'NX', now, scope .. ":" .. familyKey .. ":" .. id)
  table.insert(stack, familyKey .. ":" .. id)
end

redis.call('ZADD', scope .. ":" .. stack[#stack] .. ":queued", 'NX', now, jobKey)
redis.call('zadd', scope .. ':queued', "NX", now, jobKey)
redis.call('zadd', 'workflows:' .. workflowId .. ':queued', now, jobKey)
return 1
`)
