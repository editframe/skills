-- Efficient multi-queue stats that uses approximate counts for large sets
-- ARGV[1] = maxCount (maximum count before switching to approximation)
-- ARGV[2...] = queue names

local maxCount = tonumber(ARGV[1]) or 10000
local now = tonumber(redis.call("time")[1]) * 1000
local cutoffTime = now - (10 * 1000)
local stats = {}

-- Helper function for approximate counts on large sets
local function getApproximateCount(key, maxCount)
  local total = redis.call("zcard", key)
  if total <= maxCount then
    return total
  end
  return maxCount
end

for i=2, #ARGV do
  local queue = ARGV[i]
  local queueStats = {
    queued = redis.call("zcard", "queues:" .. queue .. ":queued") or 0,
    claimed = redis.call("zcard", "queues:" .. queue .. ":claimed") or 0,
    completed = getApproximateCount("queues:" .. queue .. ":completed", maxCount),
    failed = getApproximateCount("queues:" .. queue .. ":failed", maxCount),
    stalled = redis.call("zcount", "queues:" .. queue .. ":claimed", "-inf", cutoffTime) or 0
  }
  stats[queue] = queueStats
end
return cjson.encode(stats)



