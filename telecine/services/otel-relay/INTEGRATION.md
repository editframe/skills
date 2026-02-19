# OTEL Relay Integration Guide

This document explains how the otel-relay service is integrated into the Telecine project.

## Architecture

```
┌─────────────────┐     OTLP/HTTP      ┌──────────────┐
│  Web Service    ├──────────────────▶ │              │
└─────────────────┘                    │              │
                                       │ otel-relay   │     SSE Stream
┌─────────────────┐     OTLP/HTTP      │  (tracing)   ├──────────────▶  Clients
│ Worker Services ├──────────────────▶ │              │               (Browser, curl)
└─────────────────┘                    │              │
                                       └──────────────┘
┌─────────────────┐     OTLP/HTTP
│    Electron     ├──────────────────▶
└─────────────────┘
```

## Configuration

### 1. Service Definition

The relay runs as the `tracing` service in `services/dev-tracing/docker-compose.yaml`:

- **Ports**:
  - `4317` - gRPC OTLP receiver
  - `4318` - HTTP OTLP receiver
  - `4319` - SSE broadcast server
- **Traefik Integration**: Available at `http://otel.localhost:3000/events` when running via project docker-compose

### 2. Instrumentation

All Node.js services use the shared instrumentation from `lib/tracing/instrumentation.ts`:

```typescript
// Automatically configured for all services:
// - services/web
// - services/maintenance
// - services/worker-*
// - services/jit-transcoding
```

The instrumentation:

- Sends traces to `http://tracing:4318/v1/traces`
- Sends logs to `http://tracing:4318/v1/logs`
- Can be overridden with `OTEL_EXPORTER_OTLP_ENDPOINT` environment variable
- Switches to Google Cloud Trace when `GCLOUD_TRACE_EXPORT=true`

### 3. Electron Process

The Electron subprocess has its own instrumentation at `lib/electron-exec/instrumentation.ts` with identical configuration.

## Development Workflow

### Start Services

```bash
# Start all services including otel-relay
./scripts/docker-compose up

# Or start just the tracing service
./scripts/docker-compose up tracing
```

### View Traces and Logs

**Browser UI:**

```bash
open services/otel-relay/test-client.html
```

**CLI:**

```bash
curl -N http://localhost:4319/events
```

**Via Traefik (when full stack is running):**

```bash
curl -N http://otel.localhost:3000/events
```

### Send Test Data

```bash
cd services/otel-relay
./test-send.sh
```

## Production Behavior

In production (when `GCLOUD_TRACE_EXPORT=true`):

- Traces are sent to Google Cloud Trace
- Logs are not exported via OTLP (undefined logExporter)
- The otel-relay service is not deployed

## Key Features

1. **Ring Buffer**: Maintains last 50,000 events in memory
2. **Instant Replay**: New SSE clients receive all cached events immediately
3. **No Persistence**: Data cleared on restart (by design for dev)
4. **No Auth**: Designed for local development only

## Environment Variables

| Variable                      | Default               | Description                  |
| ----------------------------- | --------------------- | ---------------------------- |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `http://tracing:4318` | Base URL for OTLP exporters  |
| `GCLOUD_TRACE_EXPORT`         | `false`               | Switch to Google Cloud Trace |
| `OTEL_GRPC_PORT`              | `4317`                | gRPC receiver port           |
| `OTEL_HTTP_PORT`              | `4318`                | HTTP receiver port           |
| `SSE_PORT`                    | `4319`                | SSE server port              |
| `BUFFER_SIZE`                 | `50000`               | Number of events to cache    |

## Files Modified

- `services/dev-tracing/docker-compose.yaml` - Changed from Jaeger to otel-relay
- `lib/tracing/instrumentation.ts` - Added OTLP exporters and log support
- `lib/electron-exec/instrumentation.ts` - Added OTLP exporters and log support

## Migration from Jaeger

The previous setup used Jaeger on ports 6831 (UDP) and 16686 (HTTP UI). The new setup:

- Uses standard OTLP ports (4317/4318)
- Provides SSE streaming instead of Jaeger UI
- Supports both traces and logs
- More lightweight (no storage, no UI overhead)
