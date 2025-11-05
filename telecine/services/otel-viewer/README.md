# OTEL Viewer

Chrome DevTools-style performance panel for viewing OpenTelemetry traces from the otel-relay service.

## Features

- Flame chart visualization with timeline
- Hierarchical span display
- Click to view span details
- Real-time updates via Server-Sent Events
- Color-coded by nesting level

## Development

```bash
# Start with docker-compose
./scripts/docker-compose up otel-viewer

# Or run locally
cd services/otel-viewer
npm run dev
```

Access at:

- http://localhost:4320
- http://otel-viewer.localhost:3000 (via Traefik)

## Tech Stack

- React Router v7 (SPA mode)
- TypeScript
- Vite
- Server-Sent Events for real-time trace streaming
