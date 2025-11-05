#!/bin/bash

# Demo script to show Redis cleanup functionality
# This script demonstrates the cleanup system and shows before/after Redis memory usage

set -e

echo "🧹 Redis Cleanup Demo"
echo "===================="

# Check if Redis is available
if ! redis-cli ping > /dev/null 2>&1; then
    echo "❌ Redis is not available. Please start Redis first."
    exit 1
fi

echo "✅ Redis is available"

# Get initial memory usage
echo ""
echo "📊 Initial Redis Memory Usage:"
redis-cli info memory | grep used_memory_human

# Create some test data
echo ""
echo "📝 Creating test data..."

# Add some old completed jobs (2 hours ago)
OLD_TIME=$(($(date +%s) * 1000 - 2 * 60 * 60 * 1000))
for i in {1..1000}; do
    redis-cli zadd "queues:demo-queue:completed" $OLD_TIME "queues:demo-queue:jobs:old-job-$i" > /dev/null
    redis-cli set "queues:demo-queue:jobs:old-job-$i" "{\"json\":{\"jobId\":\"old-job-$i\",\"payload\":\"test-data-$i\"}}" > /dev/null
done

# Add some recent completed jobs (now)
NOW_TIME=$(($(date +%s) * 1000))
for i in {1..100}; do
    redis-cli zadd "queues:demo-queue:completed" $NOW_TIME "queues:demo-queue:jobs:recent-job-$i" > /dev/null
    redis-cli set "queues:demo-queue:jobs:recent-job-$i" "{\"json\":{\"jobId\":\"recent-job-$i\",\"payload\":\"test-data-$i\"}}" > /dev/null
done

echo "✅ Created 1000 old jobs and 100 recent jobs"

# Show memory usage after creating data
echo ""
echo "📊 Memory Usage After Creating Test Data:"
redis-cli info memory | grep used_memory_human

# Show job counts
echo ""
echo "📈 Job Counts:"
echo "Old completed jobs: $(redis-cli zcount "queues:demo-queue:completed" -inf $OLD_TIME)"
echo "Recent completed jobs: $(redis-cli zcount "queues:demo-queue:completed" $OLD_TIME +inf)"
echo "Total completed jobs: $(redis-cli zcard "queues:demo-queue:completed")"

# Run cleanup using the Lua script
echo ""
echo "🧹 Running cleanup..."

# Calculate cutoff time (1 hour ago)
CUTOFF_TIME=$(($(date +%s) * 1000 - 60 * 60 * 1000))

# Use the cleanup Lua script
redis-cli eval "
local stage = 'completed'
local cutoffTime = $CUTOFF_TIME
local batchSize = 100

local totalRemoved = 0
local processed = 0

-- Cleanup queue stages
local queueKeys = redis.call('keys', 'queues:*:' .. stage)
for i = 1, #queueKeys do
  local oldJobs = redis.call('zrangebyscore', queueKeys[i], '-inf', cutoffTime, 'LIMIT', 0, batchSize)
  
  if #oldJobs > 0 then
    local queueName = string.match(queueKeys[i], 'queues:([^:]+):' .. stage)
    
    if queueName then
      -- Remove from queue stage
      redis.call('zrem', 'queues:' .. queueName .. ':' .. stage, unpack(oldJobs))
      
      -- Delete job data
      for j = 1, #oldJobs do
        redis.call('del', oldJobs[j])
      end
      
      totalRemoved = totalRemoved + #oldJobs
    end
  end
  
  processed = processed + 1
  if processed >= batchSize then
    break
  end
end

return totalRemoved
" 0

echo "✅ Cleanup completed"

# Show memory usage after cleanup
echo ""
echo "📊 Memory Usage After Cleanup:"
redis-cli info memory | grep used_memory_human

# Show job counts after cleanup
echo ""
echo "📈 Job Counts After Cleanup:"
echo "Old completed jobs: $(redis-cli zcount "queues:demo-queue:completed" -inf $OLD_TIME)"
echo "Recent completed jobs: $(redis-cli zcount "queues:demo-queue:completed" $OLD_TIME +inf)"
echo "Total completed jobs: $(redis-cli zcard "queues:demo-queue:completed")"

# Clean up demo data
echo ""
echo "🧹 Cleaning up demo data..."
redis-cli del "queues:demo-queue:completed" > /dev/null
redis-cli eval "
local keys = redis.call('keys', 'queues:demo-queue:jobs:*')
if #keys > 0 then
  redis.call('del', unpack(keys))
end
return #keys
" 0 > /dev/null

echo "✅ Demo completed"
echo ""
echo "💡 Key Benefits:"
echo "   - Automated cleanup prevents data accumulation"
echo "   - Memory usage is controlled and predictable"
echo "   - No manual intervention required"
echo "   - Performance remains consistent over time"
