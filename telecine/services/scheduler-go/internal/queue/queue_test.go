package queue

import (
	"os"
	"testing"

	"github.com/editframe/telecine/scheduler/internal/testutil"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestToScreamingSnakeCase(t *testing.T) {
	_ = testutil.WithTestSpan(t)
	tests := []struct {
		input    string
		expected string
	}{
		{"process-html-initializer", "PROCESS_HTML_INITIALIZER"},
		{"render-fragment", "RENDER_FRAGMENT"},
		{"ingest-image", "INGEST_IMAGE"},
		{"simple", "SIMPLE"},
		{"already-upper", "ALREADY_UPPER"},
	}

	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			result := toScreamingSnakeCase(tt.input)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestLoadQueue(t *testing.T) {
	_ = testutil.WithTestSpan(t)
	// Save original env vars
	originalEnvVars := make(map[string]string)
	envVars := []string{
		"TEST_QUEUE_WEBSOCKET_HOST",
		"TEST_QUEUE_MAX_WORKER_COUNT",
		"TEST_QUEUE_WORKER_CONCURRENCY",
	}
	for _, key := range envVars {
		originalEnvVars[key] = os.Getenv(key)
	}

	// Clean up after test
	defer func() {
		for key, value := range originalEnvVars {
			if value == "" {
				os.Unsetenv(key)
			} else {
				os.Setenv(key, value)
			}
		}
	}()

	t.Run("successful load with defaults", func(t *testing.T) {
		os.Setenv("TEST_QUEUE_WEBSOCKET_HOST", "http://test-worker:3000")
		os.Unsetenv("TEST_QUEUE_MAX_WORKER_COUNT")
		os.Unsetenv("TEST_QUEUE_WORKER_CONCURRENCY")

		queue, err := loadQueue("test-queue")
		require.NoError(t, err)

		assert.Equal(t, "test-queue", queue.Name)
		assert.Equal(t, "http://test-worker:3000", queue.WebSocketHost)
		assert.Equal(t, 1, queue.MaxWorkerCount)
		assert.Equal(t, 1, queue.WorkerConcurrency)
	})

	t.Run("successful load with custom values", func(t *testing.T) {
		os.Setenv("TEST_QUEUE_WEBSOCKET_HOST", "http://custom-worker:8080")
		os.Setenv("TEST_QUEUE_MAX_WORKER_COUNT", "5")
		os.Setenv("TEST_QUEUE_WORKER_CONCURRENCY", "3")

		queue, err := loadQueue("test-queue")
		require.NoError(t, err)

		assert.Equal(t, "test-queue", queue.Name)
		assert.Equal(t, "http://custom-worker:8080", queue.WebSocketHost)
		assert.Equal(t, 5, queue.MaxWorkerCount)
		assert.Equal(t, 3, queue.WorkerConcurrency)
	})

	t.Run("missing websocket host", func(t *testing.T) {
		os.Unsetenv("TEST_QUEUE_WEBSOCKET_HOST")

		_, err := loadQueue("test-queue")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "missing TEST_QUEUE_WEBSOCKET_HOST")
	})

	t.Run("invalid max worker count", func(t *testing.T) {
		os.Setenv("TEST_QUEUE_WEBSOCKET_HOST", "http://test-worker:3000")
		os.Setenv("TEST_QUEUE_MAX_WORKER_COUNT", "invalid")

		_, err := loadQueue("test-queue")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "invalid TEST_QUEUE_MAX_WORKER_COUNT")
	})

	t.Run("invalid worker concurrency", func(t *testing.T) {
		os.Setenv("TEST_QUEUE_WEBSOCKET_HOST", "http://test-worker:3000")
		os.Unsetenv("TEST_QUEUE_MAX_WORKER_COUNT")
		os.Setenv("TEST_QUEUE_WORKER_CONCURRENCY", "invalid")

		_, err := loadQueue("test-queue")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "invalid TEST_QUEUE_WORKER_CONCURRENCY")
	})
}

func TestLoadQueues(t *testing.T) {
	_ = testutil.WithTestSpan(t)

	testQueueNames := []string{"test-queue-1", "test-queue-2"}

	// Save original env vars
	originalSchedulerQueues := os.Getenv("SCHEDULER_QUEUES")
	originalEnvVars := make(map[string]string)
	for _, queueName := range testQueueNames {
		envPrefix := toScreamingSnakeCase(queueName)
		keys := []string{
			envPrefix + "_WEBSOCKET_HOST",
			envPrefix + "_MAX_WORKER_COUNT",
			envPrefix + "_WORKER_CONCURRENCY",
		}
		for _, key := range keys {
			originalEnvVars[key] = os.Getenv(key)
		}
	}

	// Clean up after test
	defer func() {
		if originalSchedulerQueues == "" {
			os.Unsetenv("SCHEDULER_QUEUES")
		} else {
			os.Setenv("SCHEDULER_QUEUES", originalSchedulerQueues)
		}
		for key, value := range originalEnvVars {
			if value == "" {
				os.Unsetenv(key)
			} else {
				os.Setenv(key, value)
			}
		}
	}()

	t.Run("successful load all queues", func(t *testing.T) {
		os.Setenv("SCHEDULER_QUEUES", "test-queue-1,test-queue-2")
		for _, queueName := range testQueueNames {
			envPrefix := toScreamingSnakeCase(queueName)
			os.Setenv(envPrefix+"_WEBSOCKET_HOST", "http://"+queueName+":3000")
		}

		queues, err := LoadQueues()
		require.NoError(t, err)

		assert.Len(t, queues, len(testQueueNames))
		for i, queue := range queues {
			assert.Equal(t, testQueueNames[i], queue.Name)
			assert.Equal(t, "http://"+testQueueNames[i]+":3000", queue.WebSocketHost)
			assert.Greater(t, queue.MaxWorkerCount, 0)
			assert.Greater(t, queue.WorkerConcurrency, 0)
		}
	})

	t.Run("missing SCHEDULER_QUEUES env var", func(t *testing.T) {
		os.Unsetenv("SCHEDULER_QUEUES")

		_, err := LoadQueues()
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "SCHEDULER_QUEUES environment variable is required")
	})

	t.Run("missing websocket host for queue", func(t *testing.T) {
		os.Setenv("SCHEDULER_QUEUES", "test-queue-1,test-queue-2")
		os.Setenv("TEST_QUEUE_1_WEBSOCKET_HOST", "http://test-queue-1:3000")
		os.Unsetenv("TEST_QUEUE_2_WEBSOCKET_HOST")

		_, err := LoadQueues()
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "failed to load queue test-queue-2")
	})
}
