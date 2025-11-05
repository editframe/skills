local familyCount = #ARGV - 4 
local families = {}
local scope = ARGV[familyCount + 1]
local suffix = ARGV[familyCount + 2]
local score = ARGV[familyCount + 3]
local value = ARGV[familyCount + 4]
local stack = {}
for i = 1, familyCount, 2 do
  local family = ARGV[i]
  local id = ARGV[i + 1]
  local prefix = stack[#stack] or ""
  local familyKey = (prefix == "" and family or prefix .. ":" .. family)
  redis.call('ZADD', scope .. ":" .. familyKey, 'NX', 0,  scope .. ":" .. familyKey .. ":" .. id)
  table.insert(stack, familyKey .. ":" .. id)
end
redis.call('ZADD', scope .. ":" .. stack[#stack] .. ":" .. suffix, 'NX', score, value)



