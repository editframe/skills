-- Multi-queue stats with exact counts
-- ARGV[1...] = queue names

local now = tonumber(redis.call("time")[1]) * 1000
local cutoffTime = now - (10 * 1000)
local stats = {}

for i=1, #ARGV do
  local queue = ARGV[i]
  local queueStats = {
    queued = redis.call("zcard", "queues:" .. queue .. ":queued") or 0,
    claimed = redis.call("zcard", "queues:" .. queue .. ":claimed") or 0,
    completed = redis.call("zcard", "queues:" .. queue .. ":completed") or 0,
    failed = redis.call("zcard", "queues:" .. queue .. ":failed") or 0,
    stalled = redis.call("zcount", "queues:" .. queue .. ":claimed", "-inf", cutoffTime) or 0
  }
  stats[queue] = queueStats
end
return cjson.encode(stats)
