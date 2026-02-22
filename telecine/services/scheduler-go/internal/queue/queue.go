package queue

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"strconv"
	"strings"

	"github.com/redis/go-redis/v9"
	"github.com/rs/zerolog"
)

type Stats struct {
	Queued    int `json:"queued"`
	Claimed   int `json:"claimed"`
	Completed int `json:"completed"`
	Failed    int `json:"failed"`
	Stalled   int `json:"stalled"`
}

type Queue struct {
	Name              string
	URL               string
	MaxWorkerCount    int
	MinWorkerCount    int
	WorkerConcurrency int
}

func LoadQueues(logger *zerolog.Logger) []Queue {
	type queueDef struct {
		name      string
		envPrefix string
	}

	defs := []queueDef{
		{"process-html-initializer", "PROCESS_HTML_INITIALIZER"},
		{"process-html-finalizer", "PROCESS_HTML_FINALIZER"},
		{"render-initializer", "RENDER_INITIALIZER"},
		{"render-fragment", "RENDER_FRAGMENT"},
		{"render-fragment-gpu", "RENDER_FRAGMENT_GPU"},
		{"render-finalizer", "RENDER_FINALIZER"},
		{"process-isobmff", "PROCESS_ISOBMFF"},
		{"ingest-image", "INGEST_IMAGE"},
	}

	var queues []Queue
	for _, d := range defs {
		url := os.Getenv(fmt.Sprintf("WORKER_URL_%s", d.envPrefix))
		if url == "" {
			logger.Warn().Str("queue", d.name).Msg("no WORKER_URL configured, skipping")
			continue
		}

		q := Queue{
			Name:              d.name,
			URL:               url,
			MaxWorkerCount:    envInt(fmt.Sprintf("%s_MAX_WORKER_COUNT", d.envPrefix), 1),
			MinWorkerCount:    envInt(fmt.Sprintf("%s_MIN_WORKER_COUNT", d.envPrefix), 0),
			WorkerConcurrency: envInt(fmt.Sprintf("%s_WORKER_CONCURRENCY", d.envPrefix), 1),
		}
		queues = append(queues, q)
		logger.Info().
			Str("queue", q.Name).
			Str("url", q.URL).
			Int("maxWorkers", q.MaxWorkerCount).
			Int("minWorkers", q.MinWorkerCount).
			Int("concurrency", q.WorkerConcurrency).
			Msg("loaded queue")
	}
	return queues
}

// mgetQueueStatsLua is the Lua script that fetches stats for multiple queues
// in a single atomic Valkey call. Matches telecine/lib/queues/lua/mgetQueueStats.lua.
const mgetQueueStatsLua = `
local maxCount = tonumber(ARGV[1]) or 10000
local now = tonumber(redis.call("time")[1]) * 1000
local cutoffTime = now - (10 * 1000)
local stats = {}

local function getApproximateCount(key, maxCount)
  local total = redis.call("zcard", key)
  if total <= maxCount then
    return total
  end
  return maxCount
end

for i=2, #ARGV do
  local queue = ARGV[i]
  local queueStats = {
    queued = redis.call("zcard", "queues:" .. queue .. ":queued") or 0,
    claimed = redis.call("zcard", "queues:" .. queue .. ":claimed") or 0,
    completed = getApproximateCount("queues:" .. queue .. ":completed", maxCount),
    failed = getApproximateCount("queues:" .. queue .. ":failed", maxCount),
    stalled = redis.call("zcount", "queues:" .. queue .. ":claimed", "-inf", cutoffTime) or 0
  }
  stats[queue] = queueStats
end
return cjson.encode(stats)
`

var mgetQueueStatsScript = redis.NewScript(mgetQueueStatsLua)

// GetAllStats fetches stats for all queue names in a single Valkey round-trip
// using EVAL/EVALSHA with the mgetQueueStats Lua script.
func GetAllStats(ctx context.Context, client *redis.Client, queues []Queue, stalledThresholdMs int) (map[string]Stats, error) {
	args := make([]interface{}, 0, 1+len(queues))
	args = append(args, stalledThresholdMs)
	for _, q := range queues {
		args = append(args, q.Name)
	}

	// NewScript uses EVALSHA first (cached by SHA), falls back to EVAL.
	// keys=[] (no KEYS), args=[maxCount, queue1, queue2, ...]
	result, err := mgetQueueStatsScript.Run(ctx, client, nil, args...).Text()
	if err != nil {
		return nil, fmt.Errorf("mgetQueueStats eval: %w", err)
	}

	var allStats map[string]Stats
	if err := json.Unmarshal([]byte(result), &allStats); err != nil {
		return nil, fmt.Errorf("unmarshal mgetQueueStats: %w", err)
	}
	return allStats, nil
}

func envInt(key string, defaultVal int) int {
	s := os.Getenv(key)
	s = strings.TrimSpace(s)
	if s == "" {
		return defaultVal
	}
	v, err := strconv.Atoi(s)
	if err != nil {
		return defaultVal
	}
	return v
}
