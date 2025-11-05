local queueName = ARGV[1]
local orgId = ARGV[2]
local workflowId = ARGV[3]
local workflowName = ARGV[4]
local payload = ARGV[5]
local now = ARGV[6]

local scope = "queues:" .. queueName
local suffix = "queued"

local jobKey = "queues:" .. queueName .. ":jobs:" .. workflowId .. "-finalizer"

-- Use zcard to get counts from the workflow's sorted sets
local queued = tonumber(redis.call("zcard", "workflows:" .. workflowId .. ":queued")) or 0
local claimed = tonumber(redis.call("zcard", "workflows:" .. workflowId .. ":claimed")) or 0
local failed = tonumber(redis.call("zcard", "workflows:" .. workflowId .. ":failed")) or 0
local completed = tonumber(redis.call("zcard", "workflows:" .. workflowId .. ":completed")) or 0

if (completed > 0 and claimed == 0 and failed == 0 and queued == 0) then
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
end



