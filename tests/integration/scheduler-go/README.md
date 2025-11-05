# Scheduler-Go Integration Tests

Integration tests for the scheduler-go service that validate throughput, scaling behavior, and connection management.

## Prerequisites

Before running the tests, start the required services:

```bash
# Start core services
./scripts/docker-compose up -d scheduler-go valkey

# Start test workers
./scripts/docker-compose up -d \
  worker-test-fast-initializer \
  worker-test-fast-main \
  worker-test-fast-finalizer

# Verify services are running
./scripts/docker-compose ps
```

Required services:

- `scheduler-go` - The scheduler service being tested
- `valkey` - Redis-compatible key-value store
- `worker-test-fast-initializer` - Test workflow initializer
- `worker-test-fast-main` - Main job processor
- `worker-test-fast-finalizer` - Workflow finalizer

## Running the Tests

From the project root:

```bash
./scripts/test-scheduler-go
```

The script will verify scheduler-go is accessible before running tests.

Or run tests directly with vitest:

```bash
./scripts/run npx vitest --run tests/integration/scheduler-go/*.test.ts
```

## Test Suites

### status-endpoint.test.ts

Validates the `/api/status` endpoint structure and data types:

- Memory metrics (heap allocation, GC stats)
- Goroutine count
- Per-queue connection counts
- Scaling information

### throughput-and-scale.test.ts

Tests high-throughput job processing and scaling behavior:

- Enqueues thousands of jobs (default: 2000)
- Validates scale-up when work arrives
- Confirms all jobs complete successfully
- Verifies scale-down after work drains
- Checks memory stabilization (< 50% growth)

### disconnect-behavior.test.ts

Validates connection lifecycle management:

- Tests fast disconnect during scale-down
- Verifies connection counts remain accurate
- Ensures disconnects complete within configured timeouts

## Configuration

Environment variables:

- `SCHEDULER_GO_URL` - Scheduler URL (default: `http://scheduler-go:3000`)
- `SCHEDULER_TEST_JOB_COUNT` - Number of jobs to enqueue (default: `2000`)

## Test Workflow

The tests use a simple three-stage workflow:

1. **Initializer** - Enqueues N main jobs
2. **Main** - Performs minimal work (10ms busy wait)
3. **Finalizer** - Runs after all main jobs complete

This workflow is designed to complete quickly while generating enough load to trigger scaling.

## Development Environment Configuration

The `.env-example` file includes accelerated timing settings for development:

- `SCHEDULER_TICK_MS=500` (prod: 2000)
- `SCHEDULER_PING_INTERVAL_MS=2000` (prod: 5000)
- `SCHEDULER_DISCONNECT_TIMEOUT_MS=5000` (prod: 30000)
- `SCHEDULER_SCALE_DOWN_SMOOTHING=0.7` (prod: 0.9)

These settings allow tests to complete in minutes rather than hours while still validating the core behavior.
