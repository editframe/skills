# OTEL Relay Service

A minimal OpenTelemetry trace and log collector that re-broadcasts data over Server-Sent Events (SSE) for local development.

## Features

- Accepts OTLP traces and logs via both gRPC and HTTP
- Maintains an LRU cache of 50,000 events
- Broadcasts events to connected clients via SSE
- New clients receive all cached events on connection
- Designed for local development only (no persistence, no authentication)

## Endpoints

- **gRPC**: `:4317` - OTLP gRPC receiver
- **HTTP**: `:4318` - OTLP HTTP receiver
  - `POST /v1/traces` - Trace endpoint
  - `POST /v1/logs` - Logs endpoint
- **SSE**: `:4319` - Server-Sent Events
  - `GET /events` - Connect to event stream
  - `GET /health` - Health check

## Configuration

Environment variables:

- `OTEL_GRPC_PORT` - gRPC receiver port (default: 4317)
- `OTEL_HTTP_PORT` - HTTP receiver port (default: 4318)
- `SSE_PORT` - SSE server port (default: 4319)
- `BUFFER_SIZE` - Number of events to cache (default: 50000)

## Usage

### Start with Project Docker Compose

The service is integrated as the `tracing` service in docker-compose:

```bash
./scripts/docker-compose up tracing
```

This will start the otel-relay and make it available to all other services at `http://tracing:4318`.

### View Test Client

Open `test-client.html` in a browser to see a simple web-based viewer for the SSE stream.

### Send Test Data

```bash
./test-send.sh
```

### Connect to SSE Stream

```bash
curl -N http://localhost:4319/events
```

Or from JavaScript:

```javascript
const eventSource = new EventSource("http://localhost:4319/events");
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log(data.type, data.data);
};
```

### Configure Your Services

All services in the project are automatically configured to send traces and logs to the relay in development mode. The configuration uses the `OTEL_EXPORTER_OTLP_ENDPOINT` environment variable, which defaults to `http://tracing:4318` when running in docker-compose.

For custom configurations, see `example-config.js`.

## Event Format

Events are sent as JSON over SSE:

```json
{
  "type": "trace",
  "data": {
    /* OTLP trace data */
  },
  "timestamp": 1234567890123
}
```

Event types: `trace`, `log`

## Architecture

- **Ring Buffer**: Maintains last 50k events in memory
- **SSE Replay**: New clients receive all cached events immediately
- **No Persistence**: Data is lost on restart (by design)
- **No Authentication**: Local development only
