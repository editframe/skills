local queue = ARGV[1]
local jobId = ARGV[2]
local orgId = ARGV[3]
local workflow = ARGV[4]
local workflowId = ARGV[5]
local stage = ARGV[6]

local jobKey = "queues:" .. queue .. ":jobs:" .. jobId

-- Check if job exists and is in the expected stage
local inQueueStage = redis.call("zscore", "queues:" .. queue .. ":" .. stage, jobKey)
local inWorkflowStage = redis.call("zscore", "workflows:" .. workflowId .. ":" .. stage, jobKey)
-- Don't check if in org workflow stage because that only list queued jobs

-- Only proceed if job is in expected stage in all locations
if inQueueStage and inWorkflowStage then
  -- Remove from sorted sets
  redis.call("zrem", "queues:" .. queue .. ":" .. stage, jobKey)
  redis.call("zrem", "workflows:" .. workflowId .. ":" .. stage, jobKey)
  redis.call("zrem", "queues:" .. queue .. ":orgs:" .. orgId .. ":workflows:" .. workflowId .. ":" .. stage, jobKey)
  
  -- Delete the job data
  redis.call("del", jobKey)
  
  return 1 -- Success
else
  return 0 -- Job not found in expected stage
end



