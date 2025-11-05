local schedulerId = ARGV[1]

local now = tonumber(redis.call("time")[1]) * 1000
local cutoffTime = now - (10 * 1000)
local presentSchedulers = redis.call("zrangebyscore", "schedulers", cutoffTime, "+inf", "WITHSCORES")

-- Get overall scheduler stats
local overall = {
  connecting = 0,
  connected = 0,
  disconnecting = 0,
  terminal = 0
}

-- Get per-queue stats
local queues = {}
for i=2, #ARGV do
  local queueName = ARGV[i]
  queues[queueName] = {
    connecting = redis.call("scard", "scheduler:" .. schedulerId .. ":" .. queueName .. ":connecting"),
    connected = redis.call("scard", "scheduler:" .. schedulerId .. ":" .. queueName .. ":connected"),
    disconnecting = redis.call("scard", "scheduler:" .. schedulerId .. ":" .. queueName .. ":disconnecting"),
    terminal = redis.call("scard", "scheduler:" .. schedulerId .. ":" .. queueName .. ":terminal")
  }
  overall.connecting = overall.connecting + queues[queueName].connecting
  overall.connected = overall.connected + queues[queueName].connected
  overall.disconnecting = overall.disconnecting + queues[queueName].disconnecting
  overall.terminal = overall.terminal + queues[queueName].terminal
end

return cjson.encode({
  overall = overall,
  queues = queues
})



