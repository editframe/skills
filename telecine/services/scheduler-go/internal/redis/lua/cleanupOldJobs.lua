-- Cleanup old jobs from a specific stage
-- ARGV[1] = stage (completed, failed)
-- ARGV[2] = cutoffTime (timestamp in milliseconds)
-- ARGV[3] = batchSize (max jobs to process)
-- ARGV[4] = queueName (optional, if provided only clean this queue)

local stage = ARGV[1]
local cutoffTime = tonumber(ARGV[2])
local batchSize = tonumber(ARGV[3])
local targetQueue = ARGV[4]

local totalRemoved = 0
local processed = 0

-- Function to cleanup jobs from a specific key
local function cleanupJobsFromKey(key, isWorkflow)
  local oldJobs = redis.call("zrangebyscore", key, "-inf", cutoffTime, "LIMIT", 0, batchSize)
  
  if #oldJobs == 0 then
    return 0
  end
  
  local removed = 0
  for i = 1, #oldJobs do
    local jobKey = oldJobs[i]
    
    if isWorkflow then
      -- For workflow keys, just remove from the workflow stage
      redis.call("zrem", key, jobKey)
      removed = removed + 1
    else
      -- For queue keys, remove from all related structures
      -- Extract queue name from key (queues:{queueName}:{stage})
      local queueName = string.match(key, "queues:([^:]+):" .. stage)
      
      if queueName then
        -- Remove from queue stage
        redis.call("zrem", "queues:" .. queueName .. ":" .. stage, jobKey)
        
        -- Try to remove from workflow stages (we don't have workflow info here)
        -- This is a best-effort cleanup
        redis.call("del", jobKey)
        
        removed = removed + 1
      end
    end
  end
  
  return removed
end

-- Cleanup queue stages
if targetQueue then
  -- Clean specific queue
  local queueKey = "queues:" .. targetQueue .. ":" .. stage
  local removed = cleanupJobsFromKey(queueKey, false)
  totalRemoved = totalRemoved + removed
else
  -- Clean all queues
  local queueKeys = redis.call("keys", "queues:*:" .. stage)
  for i = 1, #queueKeys do
    local removed = cleanupJobsFromKey(queueKeys[i], false)
    totalRemoved = totalRemoved + removed
    processed = processed + 1
    
    if processed >= batchSize then
      break
    end
  end
end

-- Cleanup workflow stages
local workflowKeys = redis.call("keys", "workflows:*:" .. stage)
for i = 1, #workflowKeys do
  local removed = cleanupJobsFromKey(workflowKeys[i], true)
  totalRemoved = totalRemoved + removed
  processed = processed + 1
  
  if processed >= batchSize then
    break
  end
end

return totalRemoved
