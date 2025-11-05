-- Efficient queue stats that uses approximate counts for large sets
-- KEYS[1] = queue name
-- ARGV[1] = maxCount (maximum count before switching to approximation)

local queue = KEYS[1]
local maxCount = tonumber(ARGV[1]) or 10000
local now = tonumber(redis.call("time")[1]) * 1000
local cutoffTime = now - (10 * 1000)

-- Add the queues: prefix to match the actual Redis key structure
local queueKey = "queues:" .. queue

-- Always use exact counts for queued and claimed (these are typically small)
local queued = redis.call("zcard", queueKey .. ":queued") or 0
local claimed = redis.call("zcard", queueKey .. ":claimed") or 0

-- For completed and failed sets, use approximation if they're too large
local function getApproximateCount(key, maxCount)
  local total = redis.call("zcard", key)
  if total <= maxCount then
    return total
  end
  
  -- For large sets, return a capped estimate to prevent O(n) operations
  -- This prevents the scheduler from being overwhelmed by massive completed job counts
  return maxCount
end

local completed = getApproximateCount(queueKey .. ":completed", maxCount)
local failed = getApproximateCount(queueKey .. ":failed", maxCount)
local stalled = redis.call("zcount", queueKey .. ":claimed", "-inf", cutoffTime) or 0

return cjson.encode({
  queued = queued,
  claimed = claimed,
  completed = completed,
  failed = failed,
  stalled = stalled
})



