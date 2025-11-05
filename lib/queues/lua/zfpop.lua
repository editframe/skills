local familyCount = #ARGV - 2
local inputFamilies = ARGV
local scope = ARGV[familyCount + 1]
local suffix = ARGV[familyCount + 2]
local sets = {}
local keys = {}
local families = {}

local key = nil
for i = 1, familyCount do
  local family = inputFamilies[i]
  table.insert(families, family)

  key = key == nil and scope .. ":" .. family or key .. ":" .. family
  local nextKey = redis.call("ZRANGE", key, 0, 0)[1]
  if (nextKey == nil) then
    -- no-op
  else
    table.insert(sets, key)
    table.insert(keys, nextKey)
    local maxScore = redis.call("ZREVRANGEBYSCORE", key, "+inf", "-inf", "WITHSCORES", "LIMIT", 0, 1)[2]
    redis.call("ZADD", key, tonumber(maxScore) + 1, nextKey)
    key = nextKey
  end
  key = nextKey == nil and key or nextKey
end

local keyWithSuffix = key .. ":" .. suffix

local claimed = redis.call("ZPOPMIN", keyWithSuffix);

if (claimed[1] == nil) then return nil end

for i = #families, 1, -1 do
  local cardKey = nil
  if i == #families then
    cardKey = keys[i] .. ":" .. suffix
  else 
    cardKey = keys[i] .. ":" .. families[i+1]
  end

  local card = redis.call("ZCARD", cardKey)
  if (card > 0) then break end
  redis.call("ZREM", sets[i], keys[i])
end

return claimed



