---
name: deployment-troubleshooting
description: Rollback procedures, debugging failed deployments, scaling resources, and managing secrets.
---

# Deployment Troubleshooting & Operations

## Rollback Procedures

### Telecine: Roll back a Cloud Run service

Cloud Run keeps previous revisions. To roll back to the last known-good revision:

```bash
# List recent revisions for a service
gcloud run revisions list --service telecine-web --region us-central1 --project editframe

# Route 100% traffic to a specific revision
gcloud run services update-traffic telecine-web \
  --to-revisions=<revision-name>=100 \
  --region us-central1 \
  --project editframe
```

To roll back via Pulumi (redeploy a previous image):

```bash
# Find the previous good commit SHA
git log --oneline -10

# Build and push that specific version
cd telecine
git stash  # if needed
scripts/build-and-push web  # builds with current HEAD SHA

# Or: manually tag and push an older image
docker tag us-central1-docker.pkg.dev/editframe/telecine-artifacts/web:<old-sha> \
           us-central1-docker.pkg.dev/editframe/telecine-artifacts/web:<new-sha>
docker push us-central1-docker.pkg.dev/editframe/telecine-artifacts/web:<new-sha>
```

Then run `pulumi up` in `telecine/deploy/`.

### Telecine: Full infrastructure rollback

If Pulumi state is corrupted or a resource change broke things:

```bash
cd telecine/deploy
# Preview what Pulumi wants to change
pulumi preview

# If needed, revert the deploy code and re-run
git checkout <good-commit> -- deploy/
pulumi up -y
```

### Elements: Roll back an npm release

npm does not support true unpublish for packages older than 72 hours. Instead:

```bash
# Publish a patch with the fix, or republish the previous version
# First, check what's currently published:
npm view @editframe/elements versions --json

# Tag a previous version as latest:
npm dist-tag add @editframe/elements@<good-version> latest
```

For a full rollback, revert the commit, bump to a new patch version, and run `elements/scripts/prepare-release <new-version>`.

## Debugging Failed Deployments

### Telecine CI/CD failures

**Docker build failures:**
- Check the GitHub Actions log for the specific matrix job that failed
- Common causes: dependency install failures, Dockerfile syntax errors, out of disk (especially `transcribe`)
- The `transcribe` image gets special handling: disk space is freed before build, and the whisper builder cache is pulled separately

**Pulumi failures:**
- Run `pulumi preview` locally to see what Pulumi wants to change
- Check for IAM permission issues (the deployer uses Workload Identity Federation)
- Check for resource quota limits in GCP Console
- Pulumi state is in `gs://deployment-state` -- if state is out of sync, use `pulumi refresh`

**Cloud Run deployment failures:**
- Check Cloud Run logs in GCP Console: `https://console.cloud.google.com/run?project=editframe`
- Check if the container starts successfully: health check failures prevent traffic routing
- Check environment variables and secret bindings in the Pulumi resource definition

### Elements CI/CD failures

**Common failure points:**
1. Type check failed -- fix type errors, beta tags skip this check
2. Tests failed -- fix tests, beta tags skip this check
3. npm publish auth failure -- check `NPM_TOKEN` secret in GitHub
4. Subtree push failure -- check that `elements` git remote is configured and accessible

**Local debugging:**
```bash
# Run the same checks locally
elements/scripts/docker-compose run --rm runner npm run typecheck --workspaces
elements/scripts/docker-compose run --rm runner npm run lint
elements/scripts/docker-compose run --rm runner npm run format
```

## Scaling Resources

### Adjust worker CPU/memory

Edit `telecine/deploy/worker-resources.config.ts`:

```typescript
export const workerResources = {
  renderFragment: {
    cpu: "2000m",    // millicores (2000m = 2 vCPU)
    memory: "4Gi",   // GiB
  },
  // ...
};
```

Then deploy: push to `main` or run `pulumi up` manually.

### Adjust instance counts

Instance min/max are defined in the Pulumi resource files under `telecine/deploy/resources/`. Each service's Cloud Run definition specifies `scaling.minInstanceCount` and `scaling.maxInstanceCount`.

For workers, look in `telecine/deploy/resources/queues/`. For public services, check their respective directories (`web/`, `jit-transcoding/`, etc.).

### Adjust concurrency

Cloud Run concurrency (requests per instance) is also configured in the Pulumi resource definitions. Look for `maxInstanceRequestConcurrency` in the service's `cloudrun.ts` file.

## Secret Management

Secrets are managed via GCP Secret Manager and referenced in Pulumi.

### Current secrets

Defined in `telecine/deploy/resources/secrets.ts`:
- `application` -- application secret
- `action` -- action secret
- `app-jwt` -- app JWT secret
- `jwt` -- Hasura JWT secret
- `hasura-admin` -- Hasura admin secret

The postgres password is managed separately in `telecine/deploy/resources/database/`.

### Add a new secret

1. Create the secret in GCP Secret Manager:
```bash
echo -n "secret-value" | gcloud secrets create my-new-secret \
  --data-file=- \
  --project=editframe \
  --replication-policy=automatic
```

2. Add a new version (if updating):
```bash
echo -n "new-value" | gcloud secrets versions add my-new-secret \
  --data-file=- \
  --project=editframe
```

3. Reference it in Pulumi by adding to `telecine/deploy/resources/secrets.ts`:
```typescript
export const myNewSecret = secretToken("my-new");
```

4. Bind it to the service that needs it in the service's Cloud Run resource definition (as an environment variable or volume mount).

5. Deploy via push to `main` or `pulumi up`.

### Rotate a secret

1. Add a new version in Secret Manager:
```bash
echo -n "rotated-value" | gcloud secrets versions add application \
  --data-file=- \
  --project=editframe
```

2. Cloud Run services reference the `latest` version by default, so a new deployment will pick it up. Force a new deployment by pushing to `main` or running `pulumi up`.

## Service Health Checks

### Check Cloud Run service status

```bash
# List all services
gcloud run services list --region us-central1 --project editframe

# Describe a specific service
gcloud run services describe telecine-web --region us-central1 --project editframe

# View recent logs
gcloud run services logs read telecine-web --region us-central1 --project editframe --limit 50
```

### Check Pulumi stack state

```bash
cd telecine/deploy
pulumi login gs://deployment-state
pulumi stack select telecine-dot-dev
pulumi stack  # shows current state summary
pulumi preview  # shows pending changes
```
