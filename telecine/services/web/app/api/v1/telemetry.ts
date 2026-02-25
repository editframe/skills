import { db } from "@/sql-client.server";
import { apiIdentityContext } from "~/middleware/context";
import type { Route } from "./+types/telemetry";

const VALID_RENDER_PATHS = ["client", "cli", "server"] as const;
type RenderPath = (typeof VALID_RENDER_PATHS)[number];

interface TelemetryPayload {
  render_path: RenderPath;
  duration_ms?: number;
  width?: number;
  height?: number;
  fps?: number;
  feature_usage?: Record<string, unknown>;
  sdk_version?: string;
  cli_version?: string;
}

function extractIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]!.trim();
  }
  return request.headers.get("x-real-ip");
}

function parsePayload(raw: unknown): TelemetryPayload {
  if (typeof raw !== "object" || raw === null) {
    throw new Response("Invalid JSON body", { status: 400 });
  }
  const obj = raw as Record<string, unknown>;
  const render_path = obj["render_path"];
  if (!render_path || !VALID_RENDER_PATHS.includes(render_path as RenderPath)) {
    throw new Response(
      `render_path is required and must be one of: ${VALID_RENDER_PATHS.join(", ")}`,
      { status: 400 },
    );
  }
  return {
    render_path: render_path as RenderPath,
    duration_ms: typeof obj["duration_ms"] === "number" ? obj["duration_ms"] : undefined,
    width: typeof obj["width"] === "number" ? obj["width"] : undefined,
    height: typeof obj["height"] === "number" ? obj["height"] : undefined,
    fps: typeof obj["fps"] === "number" ? obj["fps"] : undefined,
    feature_usage:
      typeof obj["feature_usage"] === "object" && obj["feature_usage"] !== null
        ? (obj["feature_usage"] as Record<string, unknown>)
        : undefined,
    sdk_version: typeof obj["sdk_version"] === "string" ? obj["sdk_version"] : undefined,
    cli_version: typeof obj["cli_version"] === "string" ? obj["cli_version"] : undefined,
  };
}

export const action = async ({ request, context }: Route.ActionArgs) => {
  if (request.method !== "POST") {
    throw new Response("Method Not Allowed", { status: 405 });
  }

  const session = context.get(apiIdentityContext);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new Response("Invalid JSON body", { status: 400 });
  }

  const payload = parsePayload(body);

  const ip_address = extractIp(request);
  const origin = request.headers.get("origin");

  try {
    await db
      .insertInto("telemetry.events")
      .values({
        org_id: session.oid,
        api_key_id: session.cid,
        render_path: payload.render_path,
        duration_ms: payload.duration_ms ?? null,
        width: payload.width ?? null,
        height: payload.height ?? null,
        fps: payload.fps ?? null,
        feature_usage: payload.feature_usage ?? {},
        ip_address: ip_address ?? null,
        origin: origin ?? null,
        sdk_version: payload.sdk_version ?? null,
        cli_version: payload.cli_version ?? null,
      })
      .execute();
  } catch {
    // Telemetry must never block the caller — swallow DB errors silently.
  }

  return { ok: true };
};
