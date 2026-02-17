#!/usr/bin/env tsx
/**
 * Deploy Info
 *
 * Queries local configuration files to emit current deployment infrastructure data.
 * No network access, no Docker, no auth required -- purely local file parsing.
 *
 * Usage:
 *   npx tsx scripts/deploy-info.ts telecine    # Telecine Cloud Run infrastructure
 *   npx tsx scripts/deploy-info.ts elements    # Elements npm packages and release pipeline
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const TELECINE = path.join(ROOT, "telecine");
const ELEMENTS = path.join(ROOT, "elements");

function print(line: string) {
  process.stdout.write(line + "\n");
}

function section(title: string) {
  print("");
  print(`## ${title}`);
  print("");
}

// ============================================================================
// Telecine
// ============================================================================

interface ServiceInfo {
  name: string;
  cloudRunName: string;
  type: "public" | "internal";
  cpu: string;
  memory: string;
  gpu?: string;
  minInstances: number;
  maxInstances: number;
  concurrency: number;
  ingress: string;
}

function parseWorkerResources(): Record<
  string,
  { cpu: string; memory: string }
> {
  const file = fs.readFileSync(
    path.join(TELECINE, "deploy/worker-resources.config.ts"),
    "utf-8"
  );

  const resources: Record<string, { cpu: string; memory: string }> = {};
  // Match: key: { cpu: "...", memory: "..." }
  const pattern =
    /(\w+):\s*\{\s*cpu:\s*"([^"]+)",\s*memory:\s*"([^"]+)",?\s*\}/g;
  let match;
  while ((match = pattern.exec(file)) !== null) {
    resources[match[1]] = { cpu: match[2], memory: match[3] };
  }
  return resources;
}

function parseWorkerConfigs(
  workerResources: Record<string, { cpu: string; memory: string }>
): ServiceInfo[] {
  const file = fs.readFileSync(
    path.join(TELECINE, "deploy/resources/queues/workers.ts"),
    "utf-8"
  );

  const services: ServiceInfo[] = [];

  // Match each worker config block
  const pattern =
    /(\w+):\s*\{[^}]*name:\s*"([^"]+)"[^}]*maxWorkerCount:\s*(\d+)[^}]*workerConcurrency:\s*(\d+)[^}]*workerCpu:\s*workerResources\.(\w+)\.cpu/gs;
  let match;
  while ((match = pattern.exec(file)) !== null) {
    const [, configKey, name, maxCount, concurrency, resourceKey] = match;
    const res = workerResources[resourceKey] ?? { cpu: "?", memory: "?" };
    services.push({
      name,
      cloudRunName: `telecine-worker-${name}`,
      type: "internal",
      cpu: res.cpu,
      memory: res.memory,
      minInstances: 0,
      maxInstances: parseInt(maxCount),
      concurrency: parseInt(concurrency),
      ingress: "internal-only",
    });
  }

  return services;
}

function parseCloudRunService(
  filePath: string,
  workerResources: Record<string, { cpu: string; memory: string }>
): ServiceInfo | null {
  if (!fs.existsSync(filePath)) return null;
  const file = fs.readFileSync(filePath, "utf-8");

  // Extract Cloud Run name
  const nameMatch = file.match(
    /new gcp\.cloudrunv2\.Service\(\s*"[^"]+",\s*\{[^]*?name:\s*"([^"]+)"/
  );
  if (!nameMatch) return null;
  const cloudRunName = nameMatch[1];

  // Extract scaling
  const minMatch = file.match(/minInstanceCount:\s*(\d+)/);
  const maxMatch = file.match(/maxInstanceCount:\s*(\d+)/);

  // Extract concurrency
  const concurrencyMatch = file.match(
    /maxInstanceRequestConcurrency:\s*(\d+)/
  );

  // Extract CPU -- could be inline string or workerResources reference
  let cpu = "?";
  const cpuInlineMatch = file.match(/cpu:\s*"([^"]+)"/);
  const cpuRefMatch = file.match(/cpu:\s*workerResources\.(\w+)\.cpu/);
  if (cpuRefMatch && workerResources[cpuRefMatch[1]]) {
    cpu = workerResources[cpuRefMatch[1]].cpu;
  } else if (cpuInlineMatch) {
    cpu = cpuInlineMatch[1];
  }

  // Extract memory -- same pattern
  let memory = "?";
  const memInlineMatch = file.match(/memory:\s*"([^"]+)"/);
  const memRefMatch = file.match(/memory:\s*workerResources\.(\w+)\.memory/);
  if (memRefMatch && workerResources[memRefMatch[1]]) {
    memory = workerResources[memRefMatch[1]].memory;
  } else if (memInlineMatch) {
    memory = memInlineMatch[1];
  }

  // Extract GPU
  const gpuMatch = file.match(/"nvidia\.com\/gpu":\s*"(\d+)"/);

  // Extract ingress
  const ingressMatch = file.match(/ingress:\s*"([^"]+)"/);
  const ingress = ingressMatch
    ? ingressMatch[1].replace("INGRESS_TRAFFIC_", "").toLowerCase().replace(/_/g, "-")
    : "all";

  return {
    name: cloudRunName.replace("telecine-", ""),
    cloudRunName,
    type: ingress === "internal-only" ? "internal" : "public",
    cpu,
    memory,
    gpu: gpuMatch ? `${gpuMatch[1]} nvidia` : undefined,
    minInstances: minMatch ? parseInt(minMatch[1]) : 0,
    maxInstances: maxMatch ? parseInt(maxMatch[1]) : 1,
    concurrency: concurrencyMatch ? parseInt(concurrencyMatch[1]) : 1,
    ingress,
  };
}

function parseDeployWorkflowMatrix(): string[] {
  const file = fs.readFileSync(
    path.join(TELECINE, ".github/workflows/deploy.yaml"),
    "utf-8"
  );

  const services: string[] = [];
  // Match the image matrix array, including commented-out entries
  const matrixMatch = file.match(/image:\s*\[([\s\S]*?)\]/);
  if (!matrixMatch) return services;

  const lines = matrixMatch[1].split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("#")) {
      // Commented out service
      const name = trimmed.replace(/^#\s*/, "").replace(/,\s*$/, "").trim();
      if (name) services.push(`${name} (disabled)`);
    } else {
      const name = trimmed.replace(/,\s*$/, "").trim();
      if (name) services.push(name);
    }
  }
  return services;
}

function parseSecrets(): string[] {
  const file = fs.readFileSync(
    path.join(TELECINE, "deploy/resources/secrets.ts"),
    "utf-8"
  );

  const secrets: string[] = [];
  const pattern = /secretToken\("([^"]+)"\)/g;
  let match;
  while ((match = pattern.exec(file)) !== null) {
    secrets.push(match[1]);
  }
  return secrets;
}

function parseRoutes(): { path: string; service: string }[] {
  const file = fs.readFileSync(
    path.join(TELECINE, "deploy/resources/loadbalancer/urlmap.ts"),
    "utf-8"
  );

  const routes: { path: string; service: string }[] = [];

  // Match pathRules entries: { paths: ["..."], service: <import>.backendService.id }
  const pathRulePattern =
    /paths:\s*\["([^"]+)"\],\s*service:\s*(\w+)\.backendService/g;
  let match;
  while ((match = pathRulePattern.exec(file)) !== null) {
    routes.push({ path: match[1], service: match[2] });
  }

  // Check for host-based routing (assets)
  const hostRulePattern =
    /hosts:\s*\["([^"]+)"\][^}]*pathMatcher:\s*"([^"]+)"/g;
  while ((match = hostRulePattern.exec(file)) !== null) {
    if (match[2].includes("assets")) {
      routes.push({ path: `${match[1]} (host)`, service: "gcs-bucket-backend" });
    }
  }

  // Find default service
  const defaultMatch = file.match(
    /defaultService:\s*(\w+)\.backendService/
  );
  if (defaultMatch) {
    routes.push({ path: "/* (default)", service: defaultMatch[1] });
  }

  return routes;
}

function parseDomains(): string[] {
  const file = fs.readFileSync(
    path.join(TELECINE, "deploy/resources/loadbalancer/urlmap.ts"),
    "utf-8"
  );

  const domains: string[] = [];
  const pattern = /hosts:\s*\[([^\]]+)\]/g;
  let match;
  while ((match = pattern.exec(file)) !== null) {
    const hostList = match[1];
    const hostPattern = /"([^"]+)"/g;
    let hostMatch;
    while ((hostMatch = hostPattern.exec(hostList)) !== null) {
      if (!domains.includes(hostMatch[1])) {
        domains.push(hostMatch[1]);
      }
    }
  }
  return domains;
}

function parseConstants(): Record<string, string> {
  const file = fs.readFileSync(
    path.join(TELECINE, "deploy/resources/constants.ts"),
    "utf-8"
  );

  const constants: Record<string, string> = {};
  const pattern = /export const (\w+)\s*=\s*"([^"]+)"/g;
  let match;
  while ((match = pattern.exec(file)) !== null) {
    constants[match[1]] = match[2];
  }
  return constants;
}

function telecine() {
  const workerResources = parseWorkerResources();
  const constants = parseConstants();

  section("Infrastructure");
  print(`project: ${constants.GCP_PROJECT ?? "editframe"}`);
  print(`region: ${constants.GCP_LOCATION ?? "us-central1"}`);
  print(`domain: ${constants.DEPLOYED_DOMAIN ?? "editframe.com"}`);
  print(`registry: us-central1-docker.pkg.dev/${constants.GCP_PROJECT ?? "editframe"}/telecine-artifacts`);
  print(`pulumi-stack: telecine-dot-dev`);
  print(`pulumi-state: gs://deployment-state`);

  section("Domains");
  for (const domain of parseDomains()) {
    print(`  ${domain}`);
  }

  section("CI/CD Matrix (deploy.yaml)");
  print("Images built on push to main:");
  for (const service of parseDeployWorkflowMatrix()) {
    print(`  ${service}`);
  }

  // Parse standalone services
  const standaloneServices: ServiceInfo[] = [];
  const serviceDirs = [
    "web",
    "hasura",
    "jit-transcoding",
    "transcribe",
    "transcribe-ctl",
  ];
  for (const dir of serviceDirs) {
    const filePath = path.join(
      TELECINE,
      `deploy/resources/${dir}/cloudrun.ts`
    );
    const info = parseCloudRunService(filePath, workerResources);
    if (info) standaloneServices.push(info);
  }

  // Parse scheduler-go (not in a subdirectory of queues with its own cloudrun.ts)
  const schedulerPath = path.join(
    TELECINE,
    "deploy/resources/queues/scheduler-go.ts"
  );
  const schedulerInfo = parseCloudRunService(schedulerPath, workerResources);
  if (schedulerInfo) {
    schedulerInfo.type = "internal";
    standaloneServices.push(schedulerInfo);
  }

  // Parse workers
  const workers = parseWorkerConfigs(workerResources);

  section("Services");
  const allServices = [...standaloneServices, ...workers];
  for (const svc of allServices) {
    print(`service: ${svc.cloudRunName}`);
    print(`  type: ${svc.type}`);
    print(`  cpu: ${svc.cpu}`);
    print(`  memory: ${svc.memory}`);
    if (svc.gpu) print(`  gpu: ${svc.gpu}`);
    print(`  min-instances: ${svc.minInstances}`);
    print(`  max-instances: ${svc.maxInstances}`);
    print(`  concurrency: ${svc.concurrency}`);
    print(`  ingress: ${svc.ingress}`);
    print("");
  }

  section("Load Balancer Routes");
  for (const route of parseRoutes()) {
    print(`  ${route.path} -> ${route.service}`);
  }

  section("Secrets (GCP Secret Manager)");
  for (const secret of parseSecrets()) {
    print(`  ${secret}`);
  }

  section("Key Files");
  const keyFiles = [
    ["deploy/Pulumi.yaml", "Pulumi project config"],
    ["deploy/Pulumi.telecine-dot-dev.yaml", "Stack config"],
    ["deploy/index.ts", "Main Pulumi program (IAM bindings)"],
    ["deploy/worker-resources.config.ts", "Worker CPU/memory allocations"],
    ["deploy/resources/", "All Pulumi resource definitions"],
    ["deploy/resources/secrets.ts", "Secret Manager token definitions"],
    ["deploy/resources/constants.ts", "GCP project/region/domain constants"],
    [".github/workflows/deploy.yaml", "CI/CD deploy workflow"],
    ["scripts/build-docker-prod", "Build a production Docker image"],
    ["scripts/push-docker-prod", "Push a production Docker image"],
    ["scripts/build-and-push", "Build + push named services"],
    ["scripts/build-and-push-all", "Build + push all services"],
  ];
  for (const [file, purpose] of keyFiles) {
    print(`  telecine/${file}`);
    print(`    ${purpose}`);
  }
}

// ============================================================================
// Elements
// ============================================================================

function parsePackages(): { name: string; version: string }[] {
  const rootPkg = JSON.parse(
    fs.readFileSync(path.join(ELEMENTS, "package.json"), "utf-8")
  );
  const workspaceGlobs: string[] = rootPkg.workspaces ?? [];

  const packages: { name: string; version: string }[] = [];

  for (const glob of workspaceGlobs) {
    // workspaces is ["packages/*"] -- resolve the directory
    const dir = path.join(ELEMENTS, glob.replace("/*", ""));
    if (!fs.existsSync(dir)) continue;

    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const pkgJsonPath = path.join(dir, entry.name, "package.json");
      if (!fs.existsSync(pkgJsonPath)) continue;

      const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, "utf-8"));
      packages.push({ name: pkg.name, version: pkg.version });
    }
  }

  return packages;
}

function parseReleasePipeline(): string[] {
  const file = fs.readFileSync(
    path.join(ELEMENTS, "scripts/prepare-release"),
    "utf-8"
  );

  const steps: string[] = [];
  const lines = file.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip shebang, set directives, variable assignments, empty lines, comments
    if (
      !trimmed ||
      trimmed.startsWith("#!") ||
      trimmed.startsWith("set ") ||
      trimmed.startsWith("SCRIPT_DIR=") ||
      trimmed.startsWith("export ")
    ) {
      continue;
    }

    // Echo lines are informational, skip
    if (trimmed.startsWith("echo ")) continue;

    // Extract the meaningful command
    // Pattern: "${SCRIPT_DIR}"/command args...
    const scriptDirMatch = trimmed.match(
      /"\$\{SCRIPT_DIR\}"\/(\S+)\s*(.*)/
    );
    if (scriptDirMatch) {
      const [, command, args] = scriptDirMatch;
      const fullCmd = args ? `${command} ${args}` : command;
      // Clean up docker-compose invocations to show what they run
      if (command === "docker-compose") {
        const innerMatch = args.match(/run\s+--rm\s+runner\s+(.*)/);
        if (innerMatch) {
          steps.push(innerMatch[1].replace(/\s+/g, " ").trim());
        } else {
          steps.push(fullCmd);
        }
      } else {
        steps.push(fullCmd);
      }
      continue;
    }

    // VITEST_BROWSER_MODE=connect pattern
    const envPrefixMatch = trimmed.match(
      /\w+=\w+\s+"\$\{SCRIPT_DIR\}"\/(\S+)\s*(.*)/
    );
    if (envPrefixMatch) {
      const [, command, args] = envPrefixMatch;
      steps.push(`${command} ${args}`.trim());
      continue;
    }
  }

  return steps;
}

function elements() {
  const packages = parsePackages();

  section("Packages");
  print(`version: ${packages[0]?.version ?? "unknown"}`);
  print(`workspace-root: elements/`);
  print("");
  for (const pkg of packages) {
    print(`  ${pkg.name}`);
  }

  section("Release Pipeline (prepare-release)");
  print("Steps executed by elements/scripts/prepare-release:");
  const steps = parseReleasePipeline();
  for (let i = 0; i < steps.length; i++) {
    print(`  ${i + 1}. ${steps[i]}`);
  }

  section("CI/CD Trigger");
  print("Triggered by: pushing any git tag");
  print("Beta tags (containing 'beta'): skip typecheck + tests, publish with --tag beta");
  print("Release tags: full validation, publish with --tag latest");
  print("Workflow: elements/.github/workflows/release.yaml");

  section("Key Files");
  const keyFiles = [
    [".github/workflows/release.yaml", "CI/CD release workflow"],
    ["scripts/prepare-release", "Full pre-release validation + version + push"],
    ["scripts/version", "Version bump, commit, tag, subtree push"],
    ["scripts/prerelease", "Beta version bump (local only)"],
    ["scripts/publish", "Manual npm publish"],
    ["scripts/build-all", "Build all packages"],
    ["scripts/verify-cli-boot", "Verify CLI starts"],
  ];
  for (const [file, purpose] of keyFiles) {
    print(`  elements/${file}`);
    print(`    ${purpose}`);
  }
}

// ============================================================================
// Main
// ============================================================================

const command = process.argv[2];

if (!command || !["telecine", "elements"].includes(command)) {
  print("Usage: scripts/deploy-info <telecine|elements>");
  print("");
  print("  telecine    Cloud Run services, resources, routes, secrets");
  print("  elements    npm packages, release pipeline");
  process.exit(command ? 1 : 0);
}

if (command === "telecine") {
  telecine();
} else {
  elements();
}
