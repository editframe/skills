local queueName = ARGV[1]
local orgId = ARGV[2]
local workflowId = ARGV[3]
local workflowName = ARGV[4]
local jobId = ARGV[5]
local stage = ARGV[6]

local jobKey = "queues:" .. queueName .. ":jobs:" .. jobId

redis.call("zrem", "queues:" .. queueName .. ":" ..stage, jobKey)
redis.call("zrem", "workflows:" .. workflowId .. ":" .. stage, jobKey)
redis.call("zrem", "queues:" .. queueName .. ":orgs:" .. orgId .. ":workflows:" .. workflowId .. ":" .. stage, jobKey)



