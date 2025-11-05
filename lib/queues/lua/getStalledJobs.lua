-- Efficient stalled job detection with time-based filtering
-- KEYS[1] = claimed queue key (e.g., "queues:queue-name:claimed")
-- ARGV[1] = cutoffTime (milliseconds since epoch)
-- ARGV[2] = batchSize (maximum number of jobs to return)

local key = KEYS[1]
local cutoffTime = tonumber(ARGV[1])
local batchSize = tonumber(ARGV[2]) or 10

-- Use ZRANGEBYSCORE with time-based filtering for O(log n + k) performance
-- This is much more efficient than scanning all jobs
local jobKeys = redis.call("zrangebyscore", key, "-inf", cutoffTime, "LIMIT", 0, batchSize)

-- If no job IDs found, return an empty array
if #jobKeys == 0 then
  return {}
end

-- Get the job data for each key
return redis.call("mget", unpack(jobKeys))



