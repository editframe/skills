---
name: telecine-deployment
description: GCP Cloud Run deployment architecture, CI/CD workflow, and manual deployment procedures for telecine services.
---

# Telecine Deployment

## Architecture

- **Cloud provider:** GCP, project `editframe`, region `us-central1`
- **Compute:** Cloud Run (v2)
- **IaC:** Pulumi (TypeScript), state in `gs://deployment-state`, stack `telecine-dot-dev`
- **Registry:** `us-central1-docker.pkg.dev/editframe/telecine-artifacts`
- **Domain:** `editframe.com` (Cloudflare DNS)
- **Deploy dir:** `telecine/deploy/`

## Services

### Public-facing

| Service | Cloud Run name | Min/Max | CPU | Memory |
|---|---|---|---|---|
| Web (main app) | `telecine-web` | 1/10 | 1 | 1Gi |
| GraphQL Engine (Hasura) | `telecine-graphql-engine` | 1/1 | 1 | 512Mi |
| JIT Transcoding | `telecine-jit-transcoding` | 1/20 | 2 | 4Gi |
| Transcribe (GPU) | `telecine-transcribe` | 0/5 | 4 | 16Gi + 1 GPU |
| Transcribe CTL | `telecine-transcribe-ctl` | via LB | -- | -- |

### Internal workers

| Service | Min/Max | CPU | Memory |
|---|---|---|---|
| worker-ingest-image | 0/10 | 1000m | 1Gi |
| worker-process-html-initializer | 0/20 | 1000m | 1Gi |
| worker-process-html-finalizer | 0/10 | 1000m | 1Gi |
| worker-process-isobmff | 0/20 | 2000m | 4Gi |
| worker-render-initializer | 0/10 | 2000m | 4Gi |
| worker-render-fragment | 0/200 | 2000m | 4Gi |
| worker-render-finalizer | 0/10 | 1000m | 2Gi |
| scheduler-go | 1/1 | 500m | 512Mi |

Worker resource allocations are defined in `telecine/deploy/worker-resources.config.ts`.

### Supporting infrastructure

- **Database:** Cloud SQL PostgreSQL 15 (`telecine-prod`, `db-g1-small`, SSD, point-in-time recovery)
- **Valkey (Redis):** GCP Compute Engine `e2-micro` running `valkey/valkey:8.0-alpine`
- **Storage:** `telecine-dot-dev-data` (private), `editframe-assets` (public with CDN)
- **Load balancer:** HTTPS with URL-map routing:
  - `/v1/graphql` -> Hasura
  - `/hdb/transcribe_audio_track` -> Transcribe CTL
  - `/_/transcribe/*` -> Transcribe
  - `/api/v1/transcode/*` -> JIT Transcoding
  - `assets.editframe.com` -> GCS bucket backend with CDN
  - Everything else -> Web
- **Secrets:** GCP Secret Manager (application, action, app-jwt, jwt, hasura-admin)
- **Auth:** Workload Identity Federation for GitHub Actions (`projects/257055402370/locations/global/workloadIdentityPools/telecine-deployer/providers/github`)

## CI/CD Workflow

Defined in `telecine/.github/workflows/deploy.yaml`. Triggered on push to `main`.

### Step 1: Docker builds (parallel matrix)

All services build in parallel using a GitHub Actions matrix. Each service:

1. Authenticates to GCP via Workload Identity Federation
2. Runs `scripts/build-docker-prod <service>` -- builds `Dockerfile.<service>.prod` with buildx, registry-based caching
3. Runs `scripts/push-docker-prod <service>` -- pushes `us-central1-docker.pkg.dev/editframe/telecine-artifacts/<service>:<GITHUB_SHA>`

Services in the matrix: `web`, `worker-ingest-image`, `worker-process-html-initializer`, `worker-process-html-finalizer`, `worker-process-isobmff`, `worker-render-initializer`, `worker-render-fragment`, `worker-render-finalizer`, `scheduler-go`, `jit-transcoding`.

Note: `transcribe` is currently commented out in the matrix.

### Step 2: Pulumi deploy (after all builds)

1. `pulumi login gs://deployment-state`
2. `pulumi stack select telecine-dot-dev`
3. `pulumi up -y --verbose=9`

Pulumi picks up the new image tags (git SHA) and updates Cloud Run services.

## Manual Deployment

### Deploy specific services

```bash
# Build and push one or more services (from telecine/ directory)
scripts/build-and-push web scheduler-go

# Then run Pulumi to update Cloud Run
cd deploy && pulumi up
```

### Deploy all services

```bash
# Build and push every service
scripts/build-and-push-all

# Then run Pulumi
cd deploy && pulumi up
```

### Build without pushing (local testing)

```bash
scripts/build-docker-prod web
```

Images are tagged with the current git SHA (or `latest` if no SHA available).

## Key Files

| File | Purpose |
|---|---|
| `telecine/deploy/Pulumi.yaml` | Pulumi project config |
| `telecine/deploy/Pulumi.telecine-dot-dev.yaml` | Stack config (Cloudflare tokens, zone IDs) |
| `telecine/deploy/index.ts` | Main Pulumi program (IAM bindings, public invoker setup) |
| `telecine/deploy/worker-resources.config.ts` | Worker CPU/memory allocations |
| `telecine/deploy/resources/` | All Pulumi resource definitions |
| `telecine/deploy/resources/secrets.ts` | Secret Manager token definitions |
| `telecine/deploy/resources/constants.ts` | GCP project, region, domain constants |
| `telecine/.github/workflows/deploy.yaml` | CI/CD deploy workflow |
| `telecine/.github/actions/gcloud-auth/action.yaml` | Reusable GCP auth action |
| `telecine/Dockerfile.<service>.prod` | Production Dockerfiles |
| `telecine/scripts/build-docker-prod` | Build a production Docker image |
| `telecine/scripts/push-docker-prod` | Push a production Docker image |
| `telecine/scripts/build-and-push` | Build + push named services |
| `telecine/scripts/build-and-push-all` | Build + push all services |

## Pulumi Resource Layout

```
telecine/deploy/resources/
  _infra/          # Workload Identity, base infra
  web/             # Web Cloud Run service
  hasura/          # Hasura GraphQL Engine
  jit-transcoding/ # JIT transcoding service
  transcribe/      # Whisper transcription (GPU)
  transcribe-ctl/  # Transcribe controller
  queues/          # All workers + scheduler-go
  database/        # Cloud SQL Postgres
  valkey/          # Valkey (Redis) instance
  storage.ts       # GCS buckets
  storage-backend.ts # CDN bucket backend
  loadbalancer/    # HTTPS LB + URL map
  network.ts       # VPC, VPC connector
  secrets.ts       # Secret Manager tokens
  constants.ts     # Project, region, domain
  cloudflare-dns-com.ts # editframe.com DNS
  cloudflare-dns-dev.ts # editframe.dev DNS
```
