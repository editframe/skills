local key = KEYS[1]
local offset = tonumber(ARGV[1]) or 0
local limit = tonumber(ARGV[2]) or -1

-- Calculate the end index based on offset and limit
local endIndex
if limit == -1 then
  endIndex = -1  -- Get all elements from offset to the end
else
  endIndex = offset + limit - 1  -- Get 'limit' number of elements starting from offset
end

local jobKeys = redis.call("zrange", key, offset, endIndex)

-- If no job IDs found, return an empty array
if #jobKeys == 0 then
  return {}
end

-- Get the job data for each ID
return redis.call("mget", unpack(jobKeys))



