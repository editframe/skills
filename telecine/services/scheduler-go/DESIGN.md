# Distributed WebSocket Scheduler — Design

## Problem

Worker Pools scale through the Cloud Run Admin API control plane. A PATCH
to `manualInstanceCount` triggers a cold-path provisioning flow that takes
90–123 seconds per worker before the instance is ready to accept work.
A five-stage render pipeline compounds this: a simple text MP4 render takes
289 seconds, of which ~220 seconds is cold-start wait.

The old WebSocket scheduler exploited a different scaling path: each
outbound WebSocket connection to a Cloud Run **Service** counts as one
concurrent request. Cloud Run's fast-path autoscaler provisions a new
instance in seconds (not minutes) to meet `maxInstanceRequestConcurrency: 1`.
The scheduler controlled fleet size by controlling connection count.

We need that fast scaling path back, but with a simpler, more robust design
that avoids the old system's problems: a 945-line state machine, complex
goroutine lifecycle tracking, ping/pong fragility, and rank-based fair-share
coordination that broke under network partitions.

## Constraints

- **Cloud Run limits**: 700 outbound connections per instance. The scheduler
  must be horizontally scalable (multiple instances).
- **Workers are Cloud Run Services** with `maxInstanceRequestConcurrency: 1`
  and `timeout: 3600s`. One WebSocket = one instance.
- **Workers independently claim jobs from Valkey.** The WebSocket is purely a
  scaling lever and liveness signal — it carries no job data.
- **7 queues** with different concurrency and resource profiles. Max fleet
  sizes range from 10 to 200.
- **Valkey (Redis)** available for coordination between scheduler instances.
- **Go** for the scheduler service (same as before).

## Architecture

```
┌──────────────────────────────────────┐
│         Scheduler Instance           │
│                                      │
│  ┌──────────┐    ┌────────────────┐  │
│  │ Reconciler│───▶│ Connection Pool │  │
│  │  (per Q)  │    │   (per Q)      │  │
│  └──────────┘    └────────────────┘  │
│       │                  │           │
│       │ read stats       │ dial/close│
│       ▼                  ▼           │
│  ┌──────────┐    ┌────────────────┐  │
│  │  Valkey   │    │ Worker Cloud   │  │
│  │  (stats)  │    │ Run Services   │  │
│  └──────────┘    └────────────────┘  │
│       │                              │
│       │ claim lease                  │
│       ▼                              │
│  ┌──────────────────────┐            │
│  │ Distributed Claim     │            │
│  │ (Valkey sorted set)   │            │
│  └──────────────────────┘            │
└──────────────────────────────────────┘
```

### Core Components

**1. Connection Pool** — owns all WebSocket connections for one queue.

A connection is a `net/http` WebSocket dial to
`wss://<worker-service-url>/ws`. The pool tracks connections as a simple
set. No state machine — a connection is either open or it isn't.

- `Grow(n)`: opens n new connections concurrently.
- `Shrink(n)`: closes n connections (LIFO — newest first, so the oldest
  connections keep their warmed-up instances).
- `Size()`: returns current open connection count.
- `Prune()`: removes dead connections detected via failed writes.

On open: start a goroutine that reads from the WebSocket. The read blocks
until the worker sends a close frame or the connection errors. When the
read returns, remove the connection from the pool. That's the entire
lifecycle — no ping/pong state machine, no reconnection attempts. If the
connection dies, the pool shrinks by 1, and the reconciler will grow it
back on the next tick if demand persists.

**2. Reconciler** — one loop per scheduler instance, ticks every 1 second.

Each tick:
1. Batch-read queue stats from Valkey (`mgetQueueStats`).
2. For each queue, compute raw target from queue depth:
   `rawTarget = ceil((queued + claimed - stalled) / workerConcurrency)`
3. Clamp to `[minWorkerCount, maxWorkerCount]`.
4. Apply scaling policy:
   - **Scale up**: immediate (fast attack). Target = max(rawTarget, current).
   - **Scale down**: exponential smoothing (factor 0.9). Prevents flapping
     when work arrives in bursts.
5. Read this instance's **claimed slot count** from the distributed claim
   (see below).
6. Delta = claimed slots − pool.Size(). If positive, Grow. If negative,
   Shrink.

**3. Distributed Claim** — coordinates multiple scheduler instances.

Each scheduler instance claims a number of connection slots per queue via a
Valkey key. This replaces the old rank-based fair-share system.

Key: `scheduler:claims:<queue>` (hash)
Field: `<instance-id>`
Value: claimed slot count

Each tick, after computing the target for the queue, the instance:
1. Writes its desired count: `HSET scheduler:claims:<queue> <id> <desired>`
2. Sets instance liveness: `ZADD scheduler:alive <now_ms> <id>` (heartbeat)
3. Reads all claims: `HGETALL scheduler:claims:<queue>`
4. Sums all live claims. If total > global target, the instance reduces its
   claim proportionally. If total < global target, the instance can claim
   more (up to what it needs).

Stale instance cleanup: the reconciler periodically (every 5s) scans
`scheduler:alive`, removes entries with scores older than 10s, and deletes
their claim fields from all queue hashes.

This is simpler than rank-based fair-share because:
- No ordering dependency (rank). Each instance independently writes its
  claim and adjusts.
- No single point of failure. If an instance dies, its heartbeat expires
  and its slots are reclaimed within 10 seconds.
- Under a network partition from Valkey, the instance stops scaling (can't
  read stats or write claims) — a safe failure mode.

**4. Worker Side** — accept WebSocket, run work loops.

Workers are Cloud Run Services. On startup:
1. Start an HTTP server (eager boot for health checks).
2. Register a WebSocket upgrade handler at `/ws`.
3. On each accepted WebSocket connection: start `workerConcurrency` work
   loops (each independently polling Valkey for jobs).
4. On WebSocket close (or error): abort all work loops for that connection,
   gracefully drain in-flight jobs (respect claim extension), then exit.
   Since `maxInstanceRequestConcurrency: 1`, closing the one WebSocket
   means Cloud Run will recycle the instance.

The worker does NOT initiate pings. The scheduler does not send pings.
There is no ping/pong. If the TCP connection silently dies, the scheduler
detects it on the next write attempt (Prune) and removes it. The worker
detects it on the next read attempt and shuts down. TCP keepalive (which
Cloud Run enables) handles the silent-death detection at the transport
layer.

## Scaling Behavior

**Scale from 0 → N:**
1. Job arrives in queue. Stats show queued > 0.
2. Scheduler reconciler computes rawTarget >= 1.
3. Scheduler claims slots, calls `pool.Grow(N)`.
4. N WebSocket dials hit the worker Cloud Run Service.
5. Cloud Run fast-path autoscaler provisions N instances in ~5–15 seconds
   (vs 90–123 seconds with Worker Pool PATCH).

**Scale from N → 0:**
1. Queue drains. Stats show queued = 0, claimed = 0.
2. Smoothed target decays toward 0 over several ticks.
3. Scheduler calls `pool.Shrink()` to close connections.
4. Worker instances receive close frame, drain work loops, exit.
5. Cloud Run scales down instances after idle timeout.

**Multi-instance coordination example (2 schedulers, target=10):**
1. Scheduler A starts, claims 10 slots, opens 10 connections.
2. Scheduler B starts, claims 10 slots.
3. Both read total claims: 20 > target 10.
4. Each reduces proportionally: A claims 5, B claims 5.
5. A shrinks pool from 10 to 5. B grows pool from 0 to 5.
6. If A dies, its heartbeat expires. B detects stale claims, removes them.
   B sees total claims = 5 < target 10, claims 10, grows pool to 10.

## Queue Configuration

Queues are defined in Valkey / config the same way they are today. The
scheduler reads queue metadata (name, maxWorkerCount, minWorkerCount,
workerConcurrency) from environment variables injected at deploy time
(same `queueEnvVars()` pattern as current Pulumi code).

## Worker Service URLs

The scheduler needs the Cloud Run Service URL for each worker queue to dial
WebSocket connections. These are provided as environment variables:
`WORKER_URL_<SCREAMING_QUEUE_NAME>` (e.g., `WORKER_URL_RENDER_FRAGMENT`).

Pulumi outputs the service URL when creating the Cloud Run Service and
injects it into the scheduler's environment.

## Deploy Changes

1. **Workers**: change from `gcp.cloudrunv2.WorkerPool` (manual scaling) to
   `gcp.cloudrunv2.Service` with:
   - `maxInstanceRequestConcurrency: 1`
   - `timeout: 3600s`
   - `minInstances: 0`, `maxInstances: <maxWorkerCount>`
   - Container runs WebSocket-accepting server instead of direct poll loop.

2. **Scheduler**: deploy as `gcp.cloudrunv2.Service` with:
   - `minInstances: 1` (always on — it's the scaling brain)
   - `maxInstances: 3` (horizontal scaling for connection limit)
   - `cpuIdle: false` (always allocated)

3. **Maintenance service**: remove the scaler loop entirely. It only does
   lifecycle writing and stall detection now. The scheduler owns all
   scaling.

4. **Remove Worker Pool resources** from Pulumi code.

## File Structure

```
telecine/services/scheduler-go/
├── cmd/scheduler/
│   └── main.go              # entry point, config loading, server startup
├── internal/
│   ├── pool/
│   │   └── pool.go          # ConnectionPool: Grow/Shrink/Prune/Size
│   ├── reconciler/
│   │   └── reconciler.go    # per-tick scaling logic
│   ├── claim/
│   │   └── claim.go         # distributed claim via Valkey hash
│   ├── queue/
│   │   └── queue.go         # queue config + stats reading
│   └── health/
│       └── health.go        # HTTP health check + metrics endpoint
├── go.mod
├── go.sum
└── Dockerfile
```

Worker-side changes are in `telecine/lib/queues/`:
- New `createWebSocketWorkerServer.ts` (replaces `createDirectWorkerServer.ts`
  for production; direct mode stays for local dev).

## What We're NOT Building

- **No ping/pong.** TCP keepalive is sufficient. If the connection
  silently dies, transport-layer keepalive detects it.
- **No reconnection logic in the scheduler.** Dead connections are pruned;
  the reconciler opens new ones if demand persists.
- **No state machine.** A connection is open or closed. No intermediate
  states, no transition handlers, no goroutine lifecycle tracking.
- **No job routing over WebSocket.** Workers claim jobs from Valkey
  independently. The WebSocket carries no application data.
- **No rank-based fair share.** Claim-based coordination is simpler and
  more robust under partial failures.

## Migration Path

1. Build scheduler + worker WebSocket server.
2. Deploy new worker Cloud Run Services alongside existing Worker Pools.
3. Switch scheduler to target new Services.
4. Remove Worker Pool resources and scaler loop from maintenance.
5. Delete `defineWorker.ts` (Worker Pool definition).
