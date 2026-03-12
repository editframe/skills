import { valkey } from "@/valkey/valkey";
import SuperJSON from "superjson";
import { db } from "@/sql-client.server";

const renderId = process.argv[2] ?? "34d4418f-39e5-4786-a177-5fea152e2489";

async function main() {
  // Get workflow data
  const data = await valkey.get(`workflows:${renderId}:data`);
  if (data) {
    const parsed = SuperJSON.parse(data) as any;
    const { html, ...rest } = parsed;
    console.log("=== Workflow Data ===");
    console.log(JSON.stringify(rest, null, 2));
    console.log("HTML length:", html?.length ?? 0);
  }

  // Get the claimed job details
  const claimedJobs = await valkey.zrange(
    `workflows:${renderId}:claimed`,
    0,
    -1,
    "WITHSCORES",
  );
  console.log("\n=== Claimed Jobs ===");
  for (let i = 0; i < claimedJobs.length; i += 2) {
    const jobKey = claimedJobs[i]!;
    const score = claimedJobs[i + 1]!;
    console.log(
      "Key:",
      jobKey,
      "Score:",
      score,
      "Age:",
      ((Date.now() - Number(score)) / 1000).toFixed(0) + "s ago",
    );

    const jobData = await valkey.get(jobKey);
    if (jobData) {
      const job = SuperJSON.parse(jobData) as any;
      console.log("  Attempts:", job.attempts);
    }
  }

  // Check the queue-level claimed set
  const queueJobKey = `queues:render-initializer:jobs:${renderId}-initializer`;
  const queueClaimedScore = await valkey.zscore(
    "queues:render-initializer:claimed",
    queueJobKey,
  );
  console.log("\n=== Queue Claimed State ===");
  if (queueClaimedScore) {
    console.log(
      "Score:",
      queueClaimedScore,
      "Age:",
      ((Date.now() - Number(queueClaimedScore)) / 1000).toFixed(0) + "s ago",
    );
    console.log(
      "STALL THRESHOLD: 10s. This job should have been detected as stalled.",
    );
  } else {
    console.log("Not in queue claimed set");
  }

  // Check all keys
  const keys = await valkey.keys(`workflows:${renderId}:*`);
  console.log("\n=== All workflow keys ===");
  for (const key of keys.sort()) {
    const type = await valkey.type(key);
    if (type === "zset") {
      const count = await valkey.zcard(key);
      console.log(key, `(${type}, ${count} members)`);
    } else {
      console.log(key, `(${type})`);
    }
  }

  // Check render DB row
  const render = await db
    .selectFrom("video2.renders")
    .where("id", "=", renderId)
    .select([
      "status",
      "failure_detail",
      "started_at",
      "failed_at",
      "duration_ms",
      "initializer_complete",
      "attempt_count",
    ])
    .executeTakeFirst();
  console.log("\n=== DB Render Row ===");
  console.log(JSON.stringify(render, null, 2));

  // Check if the score is 0 (which is what stallJob sets)
  const allClaimedInQueue = await valkey.zrange(
    "queues:render-initializer:claimed",
    0,
    -1,
    "WITHSCORES",
  );
  console.log("\n=== All claimed in render-initializer queue ===");
  for (let i = 0; i < allClaimedInQueue.length; i += 2) {
    console.log(allClaimedInQueue[i], "score:", allClaimedInQueue[i + 1]);
  }
}

main()
  .catch(console.error)
  .finally(() => {
    valkey.disconnect();
    process.exit(0);
  });
