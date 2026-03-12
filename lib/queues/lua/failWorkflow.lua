local workflowId = ARGV[1]
local workflowName = ARGV[2]
local orgId = ARGV[3]
local now = ARGV[4]
-- here we need to get all queued AND claimed jobs in the workflow, and move them to the failed stage
-- as part of that, we'll need to send failure events to the workflow
-- we'll also need to update the workflow's status to failed
-- and we'll need to update the workflow's stats

-- Keep track of all unique queues seen in these jobs
local queues = {}
local totalMoved = 0

-- Helper: move jobs from a given stage to "failed" across all relevant sets
local function failJobsInStage(stage)
  local jobs = redis.call("zrange", "workflows:" .. workflowId .. ":" .. stage, 0, -1)
  for i=1, #jobs do
    local jobKey = jobs[i]
    local raw = redis.call("get", jobKey)
    if raw then
      local jobData = cjson.decode(raw)
      local queue = jobData.json.queue

      -- Add this queue to our set of observed queues
      queues[queue] = true

      redis.call("zrem", "workflows:" .. workflowId .. ":" .. stage, jobKey)
      redis.call("zadd", "workflows:" .. workflowId .. ":failed", now, jobKey)

      -- move the job to the failed stage in the queue
      redis.call("zrem", "queues:" .. queue .. ":" .. stage, jobKey)
      redis.call("zadd", "queues:" .. queue .. ":failed", now, jobKey)

      local stageKey = "queues:" .. queue .. ":orgs:" .. orgId .. ":workflows:" .. workflowId .. ":" .. stage
      local failedKey = "queues:" .. queue .. ":orgs:" .. orgId .. ":workflows:" .. workflowId .. ":failed"

      -- move the job to the failed stage in the org's workflow
      redis.call("zrem", stageKey, jobKey)
      redis.call("zadd", failedKey, now, jobKey)

      totalMoved = totalMoved + 1
    end
  end
end

-- Move both queued and claimed jobs to the failed stage
failJobsInStage("queued")
failJobsInStage("claimed")

-- Now iterate through all queues we observed and perform cleanup for each
for queue, _ in pairs(queues) do
  local workflowKey = "queues:" .. queue .. ":orgs:" .. orgId .. ":workflows:" .. workflowId
  -- Remove workflow from the org's workflows in this queue
  redis.call("zrem", "queues:" .. queue .. ":orgs:" .. orgId .. ":workflows", workflowKey)

  -- Check if there are no more workflows for the org in this queue
  local orgWorkflowCount = tonumber(redis.call("zcard", "queues:" .. queue .. ":orgs:" .. orgId .. ":workflows")) or 0
  if orgWorkflowCount == 0 then
    local orgKey = "queues:" .. queue .. ":orgs:" .. orgId
    redis.call("zrem", "queues:" .. queue .. ":orgs", orgKey)
  end
end

-- finally, we'll update the workflow's status to failed
redis.call("set", "workflows:" .. workflowId .. ":status", "failed")

return totalMoved



