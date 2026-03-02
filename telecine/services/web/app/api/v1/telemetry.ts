import { db } from "@/sql-client.server";
import { logger } from "@/logging";
import { maybeIdentityContext } from "~/middleware/context";
import type { Route } from "./+types/telemetry";

const VALID_EVENT_TYPES = ["render", "load"] as const;
type EventType = (typeof VALID_EVENT_TYPES)[number];

const VALID_RENDER_PATHS = ["client", "cli", "server"] as const;
type RenderPath = (typeof VALID_RENDER_PATHS)[number];

interface TelemetryPayload {
  event_type: EventType;
  render_path?: RenderPath;
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

  // Determine event_type: explicit value takes precedence, render_path implies "render"
  const rawEventType = obj["event_type"];
  const rawRenderPath = obj["render_path"];

  let event_type: EventType;
  if (rawEventType !== undefined) {
    if (!VALID_EVENT_TYPES.includes(rawEventType as EventType)) {
      throw new Response(
        `event_type must be one of: ${VALID_EVENT_TYPES.join(", ")}`,
        { status: 400 },
      );
    }
    event_type = rawEventType as EventType;
  } else if (rawRenderPath !== undefined) {
    event_type = "render";
  } else {
    throw new Response(
      "event_type or render_path is required",
      { status: 400 },
    );
  }

  // Validate render_path when provided
  let render_path: RenderPath | undefined;
  if (rawRenderPath !== undefined) {
    if (!VALID_RENDER_PATHS.includes(rawRenderPath as RenderPath)) {
      throw new Response(
        `render_path must be one of: ${VALID_RENDER_PATHS.join(", ")}`,
        { status: 400 },
      );
    }
    render_path = rawRenderPath as RenderPath;
  }

  return {
    event_type,
    render_path,
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

  const session = context.get(maybeIdentityContext);

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
        org_id: session?.oid ?? null,
        api_key_id: session?.cid ?? null,
        event_type: payload.event_type,
        render_path: payload.render_path ?? null,
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
  } catch (err) {
    logger.error(err, "telemetry insert failed");
  }

  return { ok: true };
};
