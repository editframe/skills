local queue = ARGV[1]
local workflowId = ARGV[2]
local jobId = ARGV[3]
local orgId = ARGV[4]
local payload = ARGV[5]
local maybeRequeue = ARGV[6]
local suffix = "queued"

local scope = "queues:" .. queue
local jobKey = "queues:" .. queue .. ":jobs:" .. jobId

local jobExists = redis.call("exists", jobKey)
if jobExists == 1 and maybeRequeue ~= "REQUEUE" then
  return 0
end

local now = tonumber(redis.call("time")[1]) * 1000

local inputFamilies = {
  "orgs", orgId,
  "workflows", workflowId
}

local stack = {}
for i = 1, 4, 2 do
  local family = inputFamilies[i]
  local id = inputFamilies[i + 1]
  local prefix = stack[#stack] or ""
  local familyKey = (prefix == "" and family or prefix .. ":" .. family)
  redis.call('ZADD', scope .. ":" .. familyKey, 'NX', now,  scope .. ":" .. familyKey .. ":" .. id)
  table.insert(stack, familyKey .. ":" .. id)
end

redis.call('ZADD', scope .. ":" .. stack[#stack] .. ":" .. suffix, 'NX', now, jobKey)

-- Adds the job data to it's own key as the "single source of truth"
redis.call("set", jobKey, payload)
-- Adds the job to the data structure that allows for loading all jobs as a "table"
redis.call('zadd', scope .. ':queued', "NX", now, jobKey)
-- Adds the job to the workflow
redis.call('zadd', 'workflows' .. ':' .. workflowId .. ":" .. 'queued', now, jobKey)

return 1



