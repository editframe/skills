---
name: deployments
description: Deploy telecine services to GCP Cloud Run via Pulumi, publish elements packages to npm, rollback, scale resources, manage secrets, and debug failed deployments.
---

# Deployments

This monorepo has two deployment paths:

- **telecine** -- GCP Cloud Run services deployed via Pulumi, triggered by push to `main`
- **elements** -- npm packages published by pushing a git tag

## Getting Current Infrastructure Data

Run `scripts/deploy-info` to query local config files for current service lists, resource allocations, routes, secrets, packages, and release pipeline steps. This is always more accurate than any prose description.

```bash
scripts/deploy-info telecine    # Services, resources, routes, secrets
scripts/deploy-info elements    # Packages, release pipeline
```

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
| Query current infrastructure | `scripts/deploy-info telecine` or `scripts/deploy-info elements` |

## Telecine (GCP Cloud Run)

Telecine runs on GCP Cloud Run, managed by Pulumi (TypeScript) from `telecine/deploy/`. Docker images are tagged with the git SHA and pushed to GCP Artifact Registry. A push to `main` triggers parallel Docker builds for all services, followed by a Pulumi deployment.

Supporting infrastructure includes Cloud SQL Postgres, Valkey (Redis) on Compute Engine, GCS storage buckets, an HTTPS load balancer with URL-map routing, and Cloudflare DNS.

Run `scripts/deploy-info telecine` for the current list of services, their resource allocations, load balancer routes, and secrets.

See [references/telecine.md](references/telecine.md) for deployment architecture and procedures.

## Elements (npm)

Elements publishes `@editframe` packages to npm. Pushing any git tag triggers the release workflow. Tags containing "beta" publish with the `beta` npm dist-tag; all others use `latest`.

Run `scripts/deploy-info elements` for the current package list and release pipeline steps.

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
