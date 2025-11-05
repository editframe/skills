local queueName = ARGV[1]
local orgId = ARGV[2]
local workflowId = ARGV[3]
local workflowName = ARGV[4]
local jobId = ARGV[5]
local fromStage = ARGV[6]
local toStage = ARGV[7]
local now = ARGV[8]

local jobKey = "queues:" .. queueName .. ":jobs:" .. jobId

local isInFromStage = redis.call("zscore", "queues:" .. queueName .. ":" .. fromStage, jobKey)

if isInFromStage then
  redis.call("zrem", "queues:" .. queueName .. ":" .. fromStage, jobKey)
  redis.call("zrem", "workflows:" .. workflowId .. ":" .. fromStage, jobKey)
  redis.call("zrem", "queues:" .. queueName .. ":orgs:" .. orgId .. ":workflows:" .. workflowId .. ":" .. fromStage, jobKey) 

  redis.call("zadd", "queues:" .. queueName .. ":" .. toStage, now, jobKey)
  redis.call("zadd", "workflows:" .. workflowId .. ":" .. toStage, now, jobKey)
  redis.call("zadd", "queues:" .. queueName .. ":orgs:" .. orgId .. ":workflows:" .. workflowId .. ":" .. toStage, now, jobKey)
end



