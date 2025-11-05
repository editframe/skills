package queue

import (
	"fmt"
	"os"
	"strconv"
	"strings"
)

type Queue struct {
	Name              string
	WebSocketHost     string
	MaxWorkerCount    int
	WorkerConcurrency int
}

func LoadQueues() ([]Queue, error) {
	queueNames := os.Getenv("SCHEDULER_QUEUES")
	if queueNames == "" {
		return nil, fmt.Errorf("SCHEDULER_QUEUES environment variable is required")
	}

	names := strings.Split(queueNames, ",")
	queues := make([]Queue, 0, len(names))

	for _, name := range names {
		name = strings.TrimSpace(name)
		if name == "" {
			continue
		}
		queue, err := loadQueue(name)
		if err != nil {
			return nil, fmt.Errorf("failed to load queue %s: %w", name, err)
		}
		queues = append(queues, queue)
	}

	if len(queues) == 0 {
		return nil, fmt.Errorf("no queues configured in SCHEDULER_QUEUES")
	}

	return queues, nil
}

func loadQueue(name string) (Queue, error) {
	envPrefix := toScreamingSnakeCase(name)

	wsHost := os.Getenv(envPrefix + "_WEBSOCKET_HOST")
	if wsHost == "" {
		return Queue{}, fmt.Errorf("missing %s_WEBSOCKET_HOST", envPrefix)
	}

	maxWorkerCount := 1
	if mwc := os.Getenv(envPrefix + "_MAX_WORKER_COUNT"); mwc != "" {
		count, err := strconv.Atoi(mwc)
		if err != nil {
			return Queue{}, fmt.Errorf("invalid %s_MAX_WORKER_COUNT: %w", envPrefix, err)
		}
		maxWorkerCount = count
	}

	workerConcurrency := 1
	if wc := os.Getenv(envPrefix + "_WORKER_CONCURRENCY"); wc != "" {
		concurrency, err := strconv.Atoi(wc)
		if err != nil {
			return Queue{}, fmt.Errorf("invalid %s_WORKER_CONCURRENCY: %w", envPrefix, err)
		}
		workerConcurrency = concurrency
	}

	return Queue{
		Name:              name,
		WebSocketHost:     wsHost,
		MaxWorkerCount:    maxWorkerCount,
		WorkerConcurrency: workerConcurrency,
	}, nil
}

func toScreamingSnakeCase(s string) string {
	s = strings.ToUpper(s)
	s = strings.ReplaceAll(s, "-", "_")
	return s
}
