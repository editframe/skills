import { valkey } from "@/valkey/valkey";

const renderId = process.argv[2] || "a095acd8-b678-4738-a322-20e5b1453d85";

async function main() {
  const jobKey = `jobs:render-initializer:${renderId}-initializer`;

  // Check queue-level keys
  const queued = await valkey.zrange("queues:render-initializer:queued", 0, -1);
  const claimed = await valkey.zrange(
    "queues:render-initializer:claimed",
    0,
    -1,
  );
  const failed = await valkey.zrange("queues:render-initializer:failed", 0, -1);

  const matchQueued = queued.filter((k) => k.includes(renderId));
  const matchClaimed = claimed.filter((k) => k.includes(renderId));
  const matchFailed = failed.filter((k) => k.includes(renderId));

  console.log("Queue-level state (render-initializer):");
  console.log(
    `  total queued: ${queued.length}, matching: ${matchQueued.length}`,
    matchQueued,
  );
  console.log(
    `  total claimed: ${claimed.length}, matching: ${matchClaimed.length}`,
    matchClaimed,
  );
  console.log(
    `  total failed: ${failed.length}, matching: ${matchFailed.length}`,
    matchFailed,
  );

  // Check if job data exists
  const jobData = await valkey.get(jobKey);
  console.log(`  job data exists: ${jobData ? "yes" : "no"}`);

  // Check workflow keys
  const wfQueued = await valkey.zrange(`workflows:${renderId}:queued`, 0, -1);
  const wfClaimed = await valkey.zrange(`workflows:${renderId}:claimed`, 0, -1);
  const wfCompleted = await valkey.zrange(
    `workflows:${renderId}:completed`,
    0,
    -1,
  );
  const wfFailed = await valkey.zrange(`workflows:${renderId}:failed`, 0, -1);

  console.log("\nWorkflow-level state:");
  console.log("  queued:", wfQueued);
  console.log("  claimed:", wfClaimed);
  console.log("  completed:", wfCompleted);
  console.log("  failed:", wfFailed);

  const status = await valkey.get(`workflows:${renderId}:status`);
  console.log("  status:", status);

  // Check orgs key
  const orgWorkflows = await valkey.zrange(
    "queues:render-initializer:orgs",
    0,
    -1,
  );
  console.log("\nOrg keys in render-initializer:", orgWorkflows.length);
  for (const ow of orgWorkflows) {
    const workflows = await valkey.zrange(ow + ":workflows", 0, -1);
    const matching = workflows.filter((w) => w.includes(renderId));
    if (matching.length > 0) {
      console.log(`  ${ow}: ${matching}`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => valkey.disconnect());
