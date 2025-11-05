import { valkey } from "../valkey/valkey";

declare module "iovalkey" {
  interface RedisCommands {
    allocateSlots(resourceKey: string, slotsKey: string): Promise<string>;
    initSlots(slotsKey: string, slotCount: number): Promise<number>;
    claimSlot(
      slotsKey: string,
      orgId: string,
      now: number,
      expiresAt: number,
    ): Promise<string | null>;
    releaseSlot(slotsKey: string, slotId: string): Promise<number>;
    getUnclaimedSlotCount(slotsKey: string, now: number): Promise<number>;
    getClaimedSlotCount(slotsKey: string, now: number): Promise<number>;
    setLastExecutionTime(
      executionTimeKey: string,
      orgId: string,
    ): Promise<number>;
    getLastExecutionTime(
      executionTimeKey: string,
      orgId: string,
    ): Promise<number>;
    addWorker(
      resourceKey: string,
      slotsKey: string,
      orgId: string,
      workerId: string,
      quota: number,
      currentTime?: number,
    ): Promise<number>;
    rotateOrg(
      resourceKey: string,
      slotsKey: string,
      orgId: string,
      currentTime?: number,
    ): Promise<number>;
    removeWorker(
      resourceKey: string,
      slotsKey: string,
      lastExecutionTimeKey: string,
      orgId: string,
      workerId: string,
    ): Promise<number>;
  }

  interface Redis extends RedisCommands {}
  interface Cluster extends RedisCommands {}
}

valkey.defineCommand("allocateSlots", {
  numberOfKeys: 2,
  lua: /* LUA */ `
    local resourceKey = KEYS[1]
    local slotsKey = KEYS[2]

    redis.log(redis.LOG_NOTICE, 'allocateSlots ' .. resourceKey .. ' ' .. slotsKey)

    -- Use hash tags to ensure keys are in the same slot
    local orgOrderKey = resourceKey .. ':org_order'
    local orgPrefix = resourceKey .. ':org:'
    local allocationsPrefix = resourceKey .. ':allocations:'

    -- availableSlots is the global number of defined slots
    local remainingResources = redis.call('ZCARD', slotsKey)
    local orgIds = redis.call('ZRANGE', orgOrderKey, 0, -1)
    redis.log(redis.LOG_NOTICE, 'orgIds', cjson.encode(orgIds))
    local orgs = {}
    local orgAllocations = {}
    
    for _, orgId in ipairs(orgIds) do
      redis.log(redis.LOG_NOTICE, 'Processing org: ' .. orgId)
      local orgData = redis.call('HGETALL', orgPrefix .. orgId)
      local org = {
        id = orgId,
        quota = 0,
        size = 0
      }
      for i = 1, #orgData, 2 do
        local key = orgData[i]
        local value = tonumber(orgData[i + 1]) or 0
        if key == 'quota' then
          org.quota = value
        elseif key == 'size' then
          org.size = value
        end
      end
      redis.log(redis.LOG_NOTICE, 'Org processed - quota: ' .. org.quota .. ', size: ' .. org.size)
      table.insert(orgs, org)
      table.insert(orgAllocations, 0)
    end

    local activeOrgs = #orgs
    redis.log(redis.LOG_NOTICE, 'Starting resource allocation. Active orgs: ' .. activeOrgs .. ', Remaining resources: ' .. remainingResources)

    -- First pass: assign resources to orgs in order
    while remainingResources > 0 and activeOrgs > 0 do
      redis.log(redis.LOG_NOTICE, 'Allocation pass - Remaining resources: ' .. remainingResources .. ', Active orgs: ' .. activeOrgs)
      local allocatedThisPass = false
      for i, org in ipairs(orgs) do
        -- Skip orgs with size 0
        if org.size > 0 and orgAllocations[i] < org.quota and remainingResources > 0 then
          orgAllocations[i] = orgAllocations[i] + 1
          remainingResources = remainingResources - 1
          allocatedThisPass = true
          if orgAllocations[i] == org.quota then
            activeOrgs = activeOrgs - 1
          end
        end
        if remainingResources == 0 then break end
      end
      -- Break if no allocations were made in this pass
      if not allocatedThisPass then break end
    end

    redis.log(redis.LOG_NOTICE, 'Starting worker allocation calculations')
    -- Calculate and store allocation for each worker in each org
    for i, org in ipairs(orgs) do
      -- Skip orgs with size 0
      if org.size > 0 then
        redis.log(redis.LOG_NOTICE, 'Calculating worker allocations for org: ' .. org.id .. ' - Total allocation: ' .. orgAllocations[i])
        local orgAllocation = orgAllocations[i]
        local workersInOrg = org.size
        local baseAllocation = math.floor(orgAllocation / workersInOrg)
        local extraResources = orgAllocation % workersInOrg

        local workers = redis.call('SMEMBERS', orgPrefix .. org.id .. ':workers')
        local allocations = {}
        for j, workerId in ipairs(workers) do
          local allocation = baseAllocation + (j <= extraResources and 1 or 0)
          table.insert(allocations, workerId)
          table.insert(allocations, allocation)
        end
        
        -- Store allocations for this org
        redis.call('DEL', allocationsPrefix .. org.id)
        if #allocations > 0 then
          redis.log(redis.LOG_NOTICE, 'Storing ' .. (#allocations/2) .. ' worker allocations for org: ' .. org.id)
          redis.call('HMSET', allocationsPrefix .. org.id, unpack(allocations))
        end
      end
    end

    return 'OK'
  `,
});

valkey.defineCommand("addWorker", {
  numberOfKeys: 2,
  lua: /* LUA */ `
    local resourceKey = KEYS[1]
    local slotsKey = KEYS[2]
    local orgId = ARGV[1]
    local workerId = ARGV[2]
    local quota = tonumber(ARGV[3])
    local currentTime = tonumber(ARGV[4])
    redis.log(redis.LOG_NOTICE, 'addWorker', orgId, workerId, quota, currentTime)

    redis.call('HINCRBY', resourceKey .. ':org:' .. orgId, 'size', 1)
    redis.call('HSET', resourceKey .. ':org:' .. orgId, 'quota', quota)
    redis.call('SADD', resourceKey .. ':org:' .. orgId .. ':workers', workerId)

    redis.call('ZADD', resourceKey .. ':org_order', 'NX', currentTime, orgId)

    return 'OK'
`,
});

valkey.defineCommand("rotateOrg", {
  numberOfKeys: 2,
  lua: /* LUA */ `
    local resourceKey = KEYS[1]
    local slotsKey = KEYS[2]
    local orgId = ARGV[1]
    local currentTime = tonumber(ARGV[2])

    redis.log(redis.LOG_NOTICE, 'rotateOrg', orgId, currentTime)

    redis.call('ZADD', resourceKey .. ':org_order', 'XX', currentTime, orgId)

    return 'OK'
`,
});

valkey.defineCommand("removeWorker", {
  numberOfKeys: 3,
  lua: /* LUA */ `
    local resourceKey = KEYS[1]
    local slotsKey = KEYS[2]
    local lastExecutionTimeKey = KEYS[3]
    local orgId = ARGV[1]
    local workerId = ARGV[2]

    redis.log(redis.LOG_NOTICE, 'removeWorker', orgId, workerId)

    redis.call('HINCRBY', resourceKey .. ':org:' .. orgId, 'size', -1)
    redis.call('SREM', resourceKey .. ':org:' .. orgId .. ':workers', workerId)
    redis.call('HDEL', resourceKey .. ':allocations:' .. orgId, workerId)

    -- If the org is empty after removal, remove it from the order
    local size = tonumber(redis.call('HGET', resourceKey .. ':org:' .. orgId, 'size'))
    if size <= 0 then
      redis.log(redis.LOG_NOTICE, 'removing empty org', orgId)
      redis.call('DEL', resourceKey .. ':org:' .. orgId)
      redis.call('ZREM', resourceKey .. ':org_order', orgId)
      redis.call('DEL', resourceKey .. ':allocations:' .. orgId)
      redis.call('HDEL', lastExecutionTimeKey, orgId)
    end

    return 'OK'
`,
});

valkey.defineCommand("initSlots", {
  numberOfKeys: 1,
  lua: /* LUA */ `
    local slots_key = KEYS[1]

    local n = tonumber(ARGV[1])
    
    -- Get current slot count
    local current_count = redis.call('ZCARD', slots_key)
    
    redis.log(redis.LOG_NOTICE, 'initSlots', current_count, n)

    -- Add new slots if needed
    for i = current_count + 1, n do
      redis.call('ZADD', slots_key, 0, 'slot-' .. i)
    end
    
    -- Remove excess slots if any
    if current_count > n then
      local excess_slots = redis.call('ZRANGE', slots_key, n, -1)
      if #excess_slots > 0 then
        redis.call('ZREM', slots_key, unpack(excess_slots))
      end
    end
    
    return redis.call('ZCARD', slots_key)
  `,
});

valkey.defineCommand("claimSlot", {
  numberOfKeys: 1,
  lua: /* LUA */ `
   local slots = KEYS[1]

    local org_id = ARGV[1]
    local now = tonumber(ARGV[2])
    local expires_at = tonumber(ARGV[3])

    redis.log(redis.LOG_NOTICE, 'claimSlot', org_id, now, expires_at)

    local result = redis.call("ZRANGE", slots, 0, expires_at - 1, 'BYSCORE')
    if #result == 0 then
      return nil
    end

    local nextSlot = result[1]
    redis.call('ZADD', slots, expires_at, nextSlot)
    redis.call('HSET', slots .. ':' .. nextSlot, 'claimedBy', org_id)

    return nextSlot
  `,
});

valkey.defineCommand("releaseSlot", {
  numberOfKeys: 1,
  lua: /* LUA */ `
  local slots = KEYS[1]

  local slotId = ARGV[1]

  local exists = redis.call('ZSCORE', slots, slotId)

  redis.log(redis.LOG_NOTICE, 'releaseSlot', slotId, exists)

  if exists then
    redis.call('ZADD', slots, 0, slotId)
    redis.call('DEL', slots .. ':' .. slotId)
  end

  return 0
`,
});

valkey.defineCommand("clearActiveWork", {
  numberOfKeys: 2,
  lua: /* LUA */ `
    local registered_work_key = KEYS[1]
    local last_execution_time_key = KEYS[2]

    local org_id = ARGV[1]
    local work_id = ARGV[2]

    redis.log(redis.LOG_NOTICE, 'clearActiveWork', org_id, work_id)

    -- Remove the org_id from the registered work set
    redis.call('SREM', registered_work_key, work_id)

    -- Check if the set is now empty
    local remaining = redis.call('SCARD', registered_work_key)
    if remaining == 0 then
      -- If it's empty, delete the last execution time for this org
      redis.call('HDEL', last_execution_time_key, org_id)
    end

    return 0
  `,
});

export class ValkeySystemStorage {
  constructor(private readonly prefix: string) {}

  get workSlotsKey() {
    return `${this.prefix}:work_slots`;
  }
  get executionTimeKey() {
    return `${this.prefix}:last_execution_time`;
  }
  get registeredWorkKey() {
    return `${this.prefix}:registered_work`;
  }
  get resourceKey() {
    return `${this.prefix}:resource`;
  }
  async addWorker(
    orgId: string,
    workerId: string,
    quota: number,
    currentTime?: number,
  ) {
    return valkey.addWorker(
      this.resourceKey,
      this.workSlotsKey,
      orgId,
      workerId,
      quota,
      currentTime || Math.floor(Date.now()),
    );
  }
  rotateOrg(orgId: string, currentTime?: number) {
    return valkey.rotateOrg(
      this.resourceKey,
      this.workSlotsKey,
      orgId,
      currentTime || Math.floor(Date.now()),
    );
  }
  async removeWorker(orgId: string, workerId: string) {
    await valkey.removeWorker(
      this.resourceKey,
      this.workSlotsKey,
      this.executionTimeKey,
      orgId,
      workerId,
    );
  }
  async allocateSlots() {
    return await valkey.allocateSlots(this.resourceKey, this.workSlotsKey);
  }
  async initSlots(slotCount: number) {
    return await valkey.initSlots(this.workSlotsKey, slotCount);
  }
  async claimSlot(orgId: string, now: number, expiresAt: number) {
    const result = await valkey.claimSlot(
      this.workSlotsKey,
      orgId,
      now,
      expiresAt,
    );
    if (!result) {
      return null;
    }
    return String(result);
  }
  releaseSlot(slotId: string) {
    return valkey.releaseSlot(this.workSlotsKey, slotId);
  }
  async getUnclaimedSlotCount(now: number) {
    return await valkey.zcount(this.workSlotsKey, 0.0, now);
  }
  getClaimedSlotCount(now: number) {
    return valkey.zcount(this.workSlotsKey, now, Number.MAX_SAFE_INTEGER);
  }
  setLastExecutionTime(orgId: string, now: number) {
    return valkey.hset(this.executionTimeKey, orgId, now);
  }
  async getLastExecutionTime(orgId: string) {
    const lastExecutionTime = await valkey.hget(this.executionTimeKey, orgId);
    return lastExecutionTime ? Number(lastExecutionTime) : 0;
  }
  async getJobAllocation(orgId: string, jobId: string) {
    return Number(
      await valkey.hget(`${this.resourceKey}:allocations:${orgId}`, jobId),
    );
  }
}
