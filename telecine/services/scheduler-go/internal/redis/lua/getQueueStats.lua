-- Queue stats with exact counts
-- KEYS[1] = queue name

local queue = KEYS[1]
local now = tonumber(redis.call("time")[1]) * 1000
local cutoffTime = now - (10 * 1000)

-- Use exact counts for all queues since zcard is O(1)
local queued = redis.call("zcard", queue .. ":queued") or 0
local claimed = redis.call("zcard", queue .. ":claimed") or 0
local completed = redis.call("zcard", queue .. ":completed") or 0
local failed = redis.call("zcard", queue .. ":failed") or 0
local stalled = redis.call("zcount", queue .. ":claimed", "-inf", cutoffTime) or 0

return cjson.encode({
  queued = queued,
  claimed = claimed,
  completed = completed,
  failed = failed,
  stalled = stalled
})
