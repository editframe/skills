---
name: deployments
description: Deploy telecine services to GCP Cloud Run via Pulumi, publish elements packages to npm, rollback, scale resources, manage secrets, and debug failed deployments.
---

# Deployments

This monorepo has two deployment paths:

- **telecine** -- GCP Cloud Run services deployed via Pulumi, triggered by push to `main`
- **elements** -- npm packages published by pushing a git tag

## Quick Reference

| Action | Command |
|---|---|
| Deploy telecine to production | Push to `main` (automated) |
| Deploy specific telecine services manually | `telecine/scripts/build-and-push web scheduler-go` |
| Deploy all telecine services manually | `telecine/scripts/build-and-push-all` |
| Run Pulumi directly | `cd telecine/deploy && pulumi up` |
| Prepare elements release | `elements/scripts/prepare-release <version>` |
| Bump elements to beta | `elements/scripts/prerelease` |
| Publish elements manually | `elements/scripts/publish` |

## Telecine (GCP Cloud Run)

Telecine runs on GCP Cloud Run in `us-central1`, project `editframe`, domain `editframe.com`. Pulumi manages all infrastructure from `telecine/deploy/`. Docker images are pushed to `us-central1-docker.pkg.dev/editframe/telecine-artifacts/`. Images are tagged with the git SHA.

**Services deployed:** web, hasura (graphql-engine), jit-transcoding, transcribe, transcribe-ctl, scheduler-go, and seven workers (ingest-image, process-html-initializer, process-html-finalizer, process-isobmff, render-initializer, render-fragment, render-finalizer).

**Supporting infrastructure:** Cloud SQL Postgres 15, Valkey (Redis) on Compute Engine, two GCS buckets, HTTPS load balancer with URL-map routing, Cloudflare DNS, GCP Secret Manager.

See [references/telecine.md](references/telecine.md) for full architecture, service details, and CI/CD workflow.

## Elements (npm)

Elements publishes `@editframe/api`, `@editframe/react`, `@editframe/elements`, `@editframe/assets`, `@editframe/cli`, `@editframe/vite-plugin`, and `@editframe/create` to npm. Pushing any git tag triggers the release workflow. Tags containing "beta" publish with the `beta` npm dist-tag; all others use `latest`.

See [references/elements.md](references/elements.md) for the release workflow and versioning.

## Troubleshooting & Operations

Rollback procedures, debugging failed deploys, scaling resources, and managing secrets are covered in [references/troubleshooting.md](references/troubleshooting.md).

## When to Use This Skill

Use this skill when:
- Deploying services or packages
- Investigating a failed deployment
- Rolling back a bad release
- Adjusting service resource limits (CPU, memory, instance counts)
- Adding or rotating secrets
- Understanding how services are routed (load balancer, DNS)
- Preparing or publishing an elements release
