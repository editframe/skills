# Telecine Infrastructure

This directory contains Pulumi infrastructure as code for the Telecine project.

## Setup

### Cloudflare Configuration

To enable DNS management via Cloudflare, you need to configure the following secrets:

```bash
# Set your Cloudflare Zone IDs (found in Cloudflare dashboard)
pulumi config set telecine:telecineComZoneId YOUR_EDITFRAME_COM_ZONE_ID
pulumi config set telecine:telecineDevZoneId YOUR_EDITFRAME_DEV_ZONE_ID

# Set your Cloudflare API Token (create one with Zone:DNS:Edit permissions for both zones)
pulumi config set cloudflare:apiToken YOUR_API_TOKEN_HERE --secret
```

### Importing Existing DNS Records

To import existing DNS records from Cloudflare:

```bash
# For editframe.com
CLOUDFLARE_API_TOKEN=your_token \
CLOUDFLARE_ZONE_ID=your_com_zone_id \
OUTPUT_FILE=cloudflare-dns-com.ts \
CONFIG_KEY=telecineComZoneId \
npx tsx bin/import-cloudflare-dns.ts

# For editframe.dev
CLOUDFLARE_API_TOKEN=your_token \
CLOUDFLARE_ZONE_ID=your_dev_zone_id \
OUTPUT_FILE=cloudflare-dns-dev.ts \
CONFIG_KEY=telecineDevZoneId \
npx tsx bin/import-cloudflare-dns.ts
```

To find your Cloudflare Zone ID:

1. Log into Cloudflare dashboard
2. Select your domain (editframe.com)
3. Find the Zone ID on the right side of the Overview page

To create an API token:

1. Go to My Profile > API Tokens in Cloudflare
2. Click "Create Token"
3. Use the "Edit zone DNS" template
4. Select the specific zone (editframe.com)
5. Create the token and copy it

## Assets CDN

The `editframe-assets` GCS bucket is exposed via the load balancer at `assets.editframe.com` with:

- CDN enabled for faster global distribution
- Public read access for all objects
- SSL/TLS via Google-managed certificate
- DNS managed via Cloudflare

### Managing Assets

Place demonstration assets in `deploy/assets/` and sync them:

```bash
# Preview changes
./bin/sync-assets.sh --dry-run

# Sync to bucket
./bin/sync-assets.sh
```

Assets will be available at `https://assets.editframe.com/`

## Deployment

```bash
pulumi up
```
