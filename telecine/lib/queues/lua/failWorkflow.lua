local workflowId = ARGV[1]
local workflowName = ARGV[2]
local orgId = ARGV[3]
local now = ARGV[4]
-- here we need to get all queued jobs in the workflow, and move them to the failed stage
-- as part of that, we'll need to send failure events to the workflow
-- we'll also need to update the workflow's status to failed
-- and we'll need to update the workflow's stats

-- first, we'll get all the queued jobs in the workflow
local queuedJobs = redis.call("zrange", "workflows:" .. workflowId .. ":queued", 0, -1)

-- Keep track of all unique queues seen in these jobs
local queues = {}

-- next, we'll move each job to the failed stage
-- we need to move the job to all the sets its a part of
for i=1, #queuedJobs do
  local jobKey = queuedJobs[i]
  local jobData = cjson.decode(redis.call("get", jobKey))
  local queue = jobData.json.queue
  
  -- Add this queue to our set of observed queues
  queues[queue] = true
  
  redis.call("zrem", "workflows:" .. workflowId .. ":queued", jobKey)
  redis.call("zadd", "workflows:" .. workflowId .. ":failed", now, jobKey)

  -- move the job to the failed stage in the queue
  redis.call("zrem", "queues:" .. queue .. ":queued", jobKey)
  redis.call("zadd", "queues:" .. queue .. ":failed", now, jobKey)

  local queuedKey = "queues:" .. queue .. ":orgs:" .. orgId .. ":workflows:" .. workflowId .. ":queued"
  local failedKey = "queues:" .. queue .. ":orgs:" .. orgId .. ":workflows:" .. workflowId .. ":failed"

  -- move the job to the failed stage in the org's workflow
  redis.call("zrem", queuedKey, jobKey)
  redis.call("zadd", failedKey, now, jobKey)
end

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

return #queuedJobs



