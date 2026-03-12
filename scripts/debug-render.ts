#!/usr/bin/env node
/**
 * Debug a render: show status, fragment breakdown, errors, and optionally live Redis state.
 *
 * Usage: ./scripts/run tsx scripts/debug-render.ts <render-id> [--redis] [--logs]
 *
 *   --redis   Show live Redis workflow state (jobs in queued/claimed/completed/failed)
 *   --logs    Grep docker compose logs for this render ID (requires docker access)
 */

import { db } from "@/sql-client.server";
import { valkey } from "@/valkey/valkey";
import { deserializeJob } from "@/queues/Job";

const rawId = process.argv[2];
if (!rawId || rawId === "--help" || rawId === "-h") {
  console.error(
    "Usage: tsx scripts/debug-render.ts <render-id> [--redis] [--logs]",
  );
  process.exit(1);
}
const renderId: string = rawId;
const showRedis = process.argv.includes("--redis");
const showLogs = process.argv.includes("--logs");

// ── Formatting helpers ──────────────────────────────────────────────

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";

const statusColor = (status: string) => {
  switch (status) {
    case "complete":
      return GREEN;
    case "failed":
      return RED;
    case "rendering":
      return YELLOW;
    case "created":
    case "queued":
      return CYAN;
    default:
      return RESET;
  }
};

const check = `${GREEN}✓${RESET}`;
const cross = `${RED}✗${RESET}`;
const dash = `${DIM}-${RESET}`;

const formatMs = (ms: number) => {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60_000).toFixed(1)}m`;
};

const fmtDate = (d: Date | string | null) => {
  if (!d) return "—";
  const date = d instanceof Date ? d : new Date(d);
  return date
    .toISOString()
    .replace("T", " ")
    .replace(/\.\d+Z$/, "Z");
};

const header = (text: string) =>
  console.log(`\n${BOLD}═══ ${text} ═══${RESET}`);

// ── Main ────────────────────────────────────────────────────────────

async function main() {
  // ── 1. Render row ─────────────────────────────────────────────────

  const render = await db
    .selectFrom("video2.renders")
    .where("id", "=", renderId)
    .selectAll()
    .executeTakeFirst();

  if (!render) {
    console.error(`${RED}Render not found:${RESET} ${renderId}`);
    process.exit(1);
  }

  header(`Render ${renderId}`);
  const sc = statusColor(render.status);
  console.log(`Status:     ${sc}${BOLD}${render.status}${RESET}`);
  console.log(`Created:    ${fmtDate(render.created_at)}`);
  if (render.started_at) {
    const initDuration =
      render.completed_at || render.failed_at ? "" : " (still running)";
    console.log(`Started:    ${fmtDate(render.started_at)}${initDuration}`);
  }
  if (render.completed_at) {
    const totalMs =
      new Date(render.completed_at as any).getTime() -
      new Date(render.created_at as any).getTime();
    console.log(
      `Completed:  ${fmtDate(render.completed_at)} ${DIM}(${formatMs(totalMs)} total)${RESET}`,
    );
  }
  if (render.failed_at) {
    const totalMs =
      new Date(render.failed_at as any).getTime() -
      new Date(render.created_at as any).getTime();
    console.log(
      `${RED}Failed:     ${fmtDate(render.failed_at)} ${DIM}(${formatMs(totalMs)} total)${RESET}`,
    );
  }

  console.log();
  const w = render.width ?? "?";
  const h = render.height ?? "?";
  const fps = render.fps ?? "?";
  const dur = render.duration_ms != null ? `${render.duration_ms}ms` : "?";
  const slice =
    render.work_slice_ms != null ? `${render.work_slice_ms}ms` : "?";
  console.log(`Config:     ${w}x${h} @ ${fps}fps, ${dur}, work_slice=${slice}`);
  console.log(`Org:        ${render.org_id}`);
  console.log(
    `Initializer: ${render.initializer_complete ? `${check} complete` : `${cross} incomplete`}`,
  );

  // ── 2. Error detail ───────────────────────────────────────────────

  if (render.failure_detail) {
    header("Error Detail");
    let detail =
      typeof render.failure_detail === "string"
        ? JSON.parse(render.failure_detail)
        : render.failure_detail;

    // Unwrap SuperJSON {json: ...} wrapper if present
    if (detail.json) {
      detail = detail.json;
    }
    // Unwrap {error: ...} wrapper if present
    if (detail.error && !detail.message) {
      detail = detail.error;
    }

    if (detail.message) {
      console.log(`${RED}${detail.message}${RESET}`);
    }
    if (detail.name && detail.name !== "Error") {
      console.log(`${DIM}Name: ${detail.name}${RESET}`);
    }
    if (detail.stack) {
      const lines = String(detail.stack).split("\n");
      // Show first 10 lines of stack
      for (const line of lines.slice(0, 10)) {
        console.log(`${DIM}  ${line}${RESET}`);
      }
      if (lines.length > 10) {
        console.log(`${DIM}  ... ${lines.length - 10} more lines${RESET}`);
      }
    }

    // Show the HTML if present in the payload (helpful for debugging render content issues)
    const payload =
      typeof render.failure_detail === "object" &&
      (render.failure_detail as any)?.json?.payload
        ? (render.failure_detail as any).json.payload
        : null;
    if (payload?.html) {
      console.log(`\n${BOLD}Input HTML:${RESET}`);
      const htmlPreview =
        payload.html.length > 200
          ? payload.html.slice(0, 200) + "..."
          : payload.html;
      console.log(`  ${DIM}${htmlPreview}${RESET}`);
    }
  }

  // ── 3. Fragment breakdown ─────────────────────────────────────────

  const fragments = await db
    .selectFrom("video2.render_fragments")
    .where("render_id", "=", renderId)
    .selectAll()
    .orderBy("segment_id")
    .execute();

  if (fragments.length > 0) {
    header("Fragment Status");

    // Group by segment_id, show latest attempt
    const bySegment = new Map<string, (typeof fragments)[number][]>();
    for (const f of fragments) {
      const existing = bySegment.get(f.segment_id) ?? [];
      existing.push(f);
      bySegment.set(f.segment_id, existing);
    }

    let completedCount = 0;
    let failedCount = 0;
    let inProgressCount = 0;
    const failedFragments: {
      segmentId: string;
      error: string | null;
      attempts: number;
    }[] = [];

    for (const [segmentId, attempts] of bySegment) {
      // Sort by attempt_number desc to get latest
      attempts.sort((a, b) => b.attempt_number - a.attempt_number);
      const latest = attempts[0]!;

      if (latest.completed_at) {
        completedCount++;
        const durationMs =
          latest.started_at && latest.completed_at
            ? new Date(latest.completed_at as any).getTime() -
              new Date(latest.started_at as any).getTime()
            : null;
        const durStr =
          durationMs != null ? ` ${DIM}(${formatMs(durationMs)})${RESET}` : "";
        const retryStr =
          latest.attempt_number > 0
            ? ` ${YELLOW}(attempt ${latest.attempt_number + 1})${RESET}`
            : "";
        console.log(
          `  ${check} ${segmentId.padEnd(8)} completed${durStr}${retryStr}`,
        );
      } else if (latest.failed_at) {
        failedCount++;
        const errorStr = latest.last_error ? ` — ${latest.last_error}` : "";
        console.log(
          `  ${cross} ${segmentId.padEnd(8)} ${RED}failed${RESET}    (attempt ${latest.attempt_number + 1})${RED}${errorStr}${RESET}`,
        );
        failedFragments.push({
          segmentId,
          error: latest.last_error,
          attempts: attempts.length,
        });
      } else {
        inProgressCount++;
        console.log(
          `  ${dash} ${segmentId.padEnd(8)} in progress (attempt ${latest.attempt_number + 1})`,
        );
      }
    }

    console.log();
    console.log(
      `  Total: ${bySegment.size} segments — ${GREEN}${completedCount} completed${RESET}, ${RED}${failedCount} failed${RESET}, ${inProgressCount} in progress`,
    );

    if (failedFragments.length > 0) {
      header("Failed Fragments Summary");
      for (const f of failedFragments) {
        console.log(
          `  ${RED}${f.segmentId}${RESET}: ${f.error ?? "no error recorded"} (${f.attempts} attempt${f.attempts > 1 ? "s" : ""})`,
        );
      }
    }
  } else {
    header("Fragment Status");
    console.log(`  ${DIM}No fragment records found in database.${RESET}`);
    if (render.status === "failed") {
      console.log(
        `  ${DIM}(Fragment lifecycle handlers may not have been wired up when this render ran)${RESET}`,
      );
    }
  }

  // ── 4. Redis live state ───────────────────────────────────────────

  if (showRedis) {
    header("Redis Workflow State");

    const stages = ["queued", "claimed", "completed", "failed"] as const;
    for (const stage of stages) {
      const key = `workflows:${renderId}:${stage}`;
      const count = await valkey.zcard(key);
      const icon =
        stage === "completed" ? check : stage === "failed" ? cross : dash;
      const color =
        stage === "failed" && count > 0
          ? RED
          : stage === "completed"
            ? GREEN
            : RESET;
      console.log(
        `  ${icon} ${stage.padEnd(10)} ${color}${count} jobs${RESET}`,
      );

      // Show details for non-empty stages (except completed which can be large)
      if (count > 0 && stage !== "completed") {
        const jobKeys = await valkey.zrange(key, 0, 19);
        for (const jobKey of jobKeys) {
          const jobData = await valkey.get(jobKey);
          if (jobData) {
            try {
              const job = deserializeJob(jobData);
              const age =
                stage === "claimed" ? await valkey.zscore(key, jobKey) : null;
              const ageStr = age
                ? ` ${DIM}(claimed ${formatMs(Date.now() - Number(age))} ago)${RESET}`
                : "";
              console.log(`    ${job.jobId}${ageStr}`);
            } catch {
              console.log(`    ${DIM}${jobKey}${RESET}`);
            }
          } else {
            console.log(`    ${DIM}${jobKey} (data evicted)${RESET}`);
          }
        }
      }
    }

    // Check workflow data
    const workflowData = await valkey.get(`workflows:${renderId}:data`);
    console.log(
      `\n  Workflow data: ${workflowData ? `${GREEN}present${RESET}` : `${DIM}evicted${RESET}`}`,
    );

    // Check progress stream
    const progressKey = `render:${renderId}`;
    const progressLen = await valkey.xlen(progressKey);
    if (progressLen > 0) {
      const lastEntry = await valkey.xrevrange(
        progressKey,
        "+",
        "-",
        "COUNT",
        "1",
      );
      const lastType = lastEntry?.[0]?.[1]?.[1] ?? "unknown";
      console.log(
        `  Progress stream: ${progressLen} entries, last type: ${lastType}`,
      );
    } else {
      console.log(`  Progress stream: ${DIM}empty/evicted${RESET}`);
    }
  }

  // ── 5. Docker compose logs ────────────────────────────────────────

  if (showLogs) {
    header("Docker Compose Logs");
    console.log(`${DIM}Filtering logs for ${renderId}...${RESET}\n`);

    const { execSync } = await import("node:child_process");
    try {
      const output = execSync(
        `docker compose logs worker-render-initializer worker-render-fragment worker-render-finalizer maintenance 2>&1 | grep "${renderId}" | tail -100`,
        {
          cwd: "/app",
          encoding: "utf-8",
          maxBuffer: 10 * 1024 * 1024,
        },
      );
      if (output.trim()) {
        console.log(output);
      } else {
        console.log(`${DIM}No log lines found containing ${renderId}.${RESET}`);
        console.log(
          `${DIM}(Containers may have restarted since this render ran)${RESET}`,
        );
      }
    } catch {
      console.log(
        `${DIM}Could not read docker compose logs (may not have docker access from this container).${RESET}`,
      );
    }
  }

  // ── 6. Hints ──────────────────────────────────────────────────────

  if (!showRedis && !showLogs) {
    console.log(
      `\n${DIM}Tip: use --redis for live Redis state, --logs for docker compose log output${RESET}`,
    );
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => {
    valkey.disconnect();
  });
