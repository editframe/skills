---
name: deployments
description: Deploy telecine services to GCP Cloud Run via Pulumi, publish elements packages to npm, publish skills docs, rollback, scale resources, manage secrets, and debug failed deployments.
---

# Deployments

This monorepo has three deployment paths:

- **telecine** -- GCP Cloud Run services deployed via Pulumi, triggered by push to `main`
- **elements** -- npm packages published by pushing a git tag
- **skills** -- public documentation published to the `skills` remote via `scripts/push-skills`

## Scripts

**Never run `git push <remote>` directly.** Always use the wrapper scripts below. The scripts handle subtree extraction, no-op detection, and remote fetching internally -- running git push directly will fail with "non-fast-forward" errors because the remote history is synthetic.

| Script | Purpose |
|---|---|
| `scripts/push-telecine` | Push telecine to remote |
| `scripts/push-telecine --wait` | Push + poll CI until deploy completes |
| `scripts/push-elements` | Push elements to remote |
| `scripts/push-elements --wait` | Push + poll CI until release completes |
| `scripts/push-skills` | Generate + push skills to remote |
| `scripts/wait-for-telecine-action` | Poll telecine deploy CI (30s interval) |
| `scripts/wait-for-elements-action` | Poll elements release CI (30s interval) |
| `scripts/wait-for-github-action <repo>` | Generic CI poller for any repo |
| `scripts/gh-logs <repo> [run-id]` | Get failed job logs for a CI run |
| `scripts/deploy-info telecine` | Services, resources, routes, secrets |
| `scripts/deploy-info elements` | Packages, release pipeline |

## Quick Reference

| Action | Command |
|---|---|
| Push telecine to remote | `scripts/push-telecine` (or `--wait`) |
| Push telecine to branch | `scripts/push-telecine --branch feature` |
| Deploy specific services manually | `telecine/scripts/build-and-push web scheduler-go` |
| Deploy all services manually | `telecine/scripts/build-and-push-all` |
| Run Pulumi directly | `cd telecine/deploy && pulumi up` |
| Prepare elements release | `elements/scripts/prepare-release <version>` |
| Push elements to remote | `scripts/push-elements` (or `--wait`) |
| Bump elements to beta | `elements/scripts/prerelease` |
| Publish elements manually | `elements/scripts/publish` |
| Publish skills docs | `scripts/push-skills` |
| Tag skills release | `git push skills $(git rev-parse skills/main):refs/tags/v<version>` |
| Check CI status | `scripts/gh-logs editframe/telecine` |
| Poll CI until done | `scripts/wait-for-telecine-action` |

## Telecine (GCP Cloud Run)

Telecine runs on GCP Cloud Run, managed by Pulumi (TypeScript) from `telecine/deploy/`. Docker images are tagged with the git SHA and pushed to GCP Artifact Registry. A push to `main` triggers parallel Docker builds for all services, followed by a Pulumi deployment.

Supporting infrastructure includes Cloud SQL Postgres, Valkey (Redis) on Compute Engine, GCS storage buckets, an HTTPS load balancer with URL-map routing, and Cloudflare DNS.

Skills source files are embedded in the telecine subtree at `telecine/skills/skills/` for the web Docker build (Tailwind class scanning + runtime docs serving).

Run `scripts/deploy-info telecine` for the current list of services, their resource allocations, load balancer routes, and secrets.

See [references/telecine.md](references/telecine.md) for deployment architecture and procedures.

## Elements (npm)

Elements publishes `@editframe` packages to npm via Trusted Publishing (OIDC). Pushing any git tag triggers the release workflow. Tags containing "beta" publish with the `beta` npm dist-tag; all others use `latest`.

Run `scripts/deploy-info elements` for the current package list and release pipeline steps.

See [references/elements.md](references/elements.md) for the release workflow and versioning.

## Skills (Public Docs)

Skills are public-facing documentation generated from source files in `skills/skills/` and published to the `editframe/skills` GitHub repo. The generation strips human-only metadata (nav, track, sections, api) and keeps only LLM-essential frontmatter.

```bash
scripts/push-skills

# Tag with the same version as elements
git fetch skills main
git push skills $(git rev-parse skills/main):refs/tags/v<version>
```

There is no CI -- the push is the deployment. Tag skills with the same version used for elements releases.

See [references/skills.md](references/skills.md) for the build process and source file conventions.

## Troubleshooting & Operations

When investigating production errors, start with the **error triage workflow** in [references/troubleshooting.md](references/troubleshooting.md): query Error Reporting API for grouped errors first, then drill into Cloud Run logs, then correlate with revisions to determine whether a deploy introduced the issue.

Rollback procedures, CI failure debugging, scaling resources, and secret management are also covered in [references/troubleshooting.md](references/troubleshooting.md).

## When to Use This Skill

Use this skill when:
- Investigating production errors or service health issues
- Deploying services or packages
- Investigating a failed deployment
- Rolling back a bad release
- Adjusting service resource limits (CPU, memory, instance counts)
- Adding or rotating secrets
- Understanding how services are routed (load balancer, DNS)
- Preparing or publishing an elements release
