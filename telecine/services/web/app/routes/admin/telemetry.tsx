import { db } from "@/sql-client.server";
import { sql } from "kysely";
import clsx from "clsx";
import { useSearchParams, Link } from "react-router";
import { TelemetryAreaChart, type TelemetryBucket } from "~/components/TelemetryAreaChart";
import type { Route } from "./+types/telemetry";

// ─── Types ────────────────────────────────────────────────────────────────────

type EventTypeFilter = "all" | "render" | "load";
type RenderPathFilter = "all" | "client" | "cli" | "server";
type DatePreset = "7d" | "30d" | "90d" | "all";

interface TelemetryFilters {
  eventType: EventTypeFilter;
  renderPath: RenderPathFilter;
  preset: DatePreset;
  from: string | null;
  to: string | null;
}

function parseFilters(url: URL): TelemetryFilters {
  const eventType = (url.searchParams.get("eventType") ?? "all") as EventTypeFilter;
  const renderPath = (url.searchParams.get("renderPath") ?? "all") as RenderPathFilter;
  const preset = (url.searchParams.get("preset") ?? "30d") as DatePreset;
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  return { eventType, renderPath, preset, from, to };
}

function dateRangeFromFilters(filters: TelemetryFilters): { from: Date | null; to: Date | null } {
  if (filters.from && filters.to) {
    return { from: new Date(filters.from), to: new Date(filters.to) };
  }
  const now = new Date();
  const to = new Date(now);
  to.setHours(23, 59, 59, 999);

  if (filters.preset === "all") return { from: null, to: null };

  const days = filters.preset === "7d" ? 7 : filters.preset === "30d" ? 30 : 90;
  const from = new Date(now);
  from.setDate(from.getDate() - (days - 1));
  from.setHours(0, 0, 0, 0);
  return { from, to };
}

// ─── Loader ───────────────────────────────────────────────────────────────────

export const loader = async ({ request }: Route.LoaderArgs) => {
  const url = new URL(request.url);
  const filters = parseFilters(url);
  const { from, to } = dateRangeFromFilters(filters);

  // 1. Summary counts
  const summaryQuery = db
    .selectFrom("telemetry.events")
    .$if(filters.eventType !== "all", (q) => q.where("event_type", "=", filters.eventType))
    .$if(filters.renderPath !== "all" && filters.eventType !== "load", (q) =>
      q.where("render_path", "=", filters.renderPath)
    )
    .$if(!!from, (q) => q.where("created_at", ">=", from!))
    .$if(!!to, (q) => q.where("created_at", "<=", to!))
    .select([
      sql<number>`COUNT(*)`.as("total"),
      sql<number>`COUNT(*) FILTER (WHERE org_id IS NOT NULL)`.as("attributed"),
      sql<number>`COUNT(*) FILTER (WHERE org_id IS NULL)`.as("anonymous"),
      sql<number>`COUNT(DISTINCT org_id) FILTER (WHERE org_id IS NOT NULL)`.as("unique_orgs"),
      sql<number>`ROUND(AVG(duration_ms) FILTER (WHERE duration_ms IS NOT NULL))`.as("avg_duration_ms"),
    ])
    .executeTakeFirstOrThrow();

  // 2. Time-series buckets (daily, but weekly if range > 60 days or all-time)
  const bucketSize =
    filters.preset === "all" || filters.preset === "90d" ? "week" : "day";

  const timeSeriesQuery = db
    .selectFrom("telemetry.events")
    .$if(filters.eventType !== "all", (q) => q.where("event_type", "=", filters.eventType))
    .$if(filters.renderPath !== "all" && filters.eventType !== "load", (q) =>
      q.where("render_path", "=", filters.renderPath)
    )
    .$if(!!from, (q) => q.where("created_at", ">=", from!))
    .$if(!!to, (q) => q.where("created_at", "<=", to!))
    .select([
      sql<string>`DATE_TRUNC(${sql.lit(bucketSize)}, created_at)::date::text`.as("date"),
      sql<number>`COUNT(*) FILTER (WHERE org_id IS NOT NULL)`.as("attributed"),
      sql<number>`COUNT(*) FILTER (WHERE org_id IS NULL)`.as("anonymous"),
    ])
    .groupBy(sql`DATE_TRUNC(${sql.lit(bucketSize)}, created_at)`)
    .orderBy(sql`DATE_TRUNC(${sql.lit(bucketSize)}, created_at)`, "asc")
    .execute();

  // 3. Top orgs by event count (top 20 attributed)
  const topOrgsQuery = db
    .selectFrom("telemetry.events")
    .$if(filters.eventType !== "all", (q) => q.where("event_type", "=", filters.eventType))
    .$if(filters.renderPath !== "all" && filters.eventType !== "load", (q) =>
      q.where("render_path", "=", filters.renderPath)
    )
    .$if(!!from, (q) => q.where("created_at", ">=", from!))
    .$if(!!to, (q) => q.where("created_at", "<=", to!))
    .where("org_id", "is not", null)
    .select([
      "org_id",
      sql<number>`COUNT(*)`.as("count"),
    ])
    .groupBy("org_id")
    .orderBy(sql`COUNT(*)`, "desc")
    .limit(20)
    .execute();

  // 4. Top origins
  const topOriginsQuery = db
    .selectFrom("telemetry.events")
    .$if(filters.eventType !== "all", (q) => q.where("event_type", "=", filters.eventType))
    .$if(filters.renderPath !== "all" && filters.eventType !== "load", (q) =>
      q.where("render_path", "=", filters.renderPath)
    )
    .$if(!!from, (q) => q.where("created_at", ">=", from!))
    .$if(!!to, (q) => q.where("created_at", "<=", to!))
    .select([
      sql<string | null>`COALESCE(origin, '(direct / CLI)')`.as("origin"),
      sql<number>`COUNT(*)`.as("count"),
    ])
    .groupBy(sql`COALESCE(origin, '(direct / CLI)')`)
    .orderBy(sql`COUNT(*)`, "desc")
    .limit(20)
    .execute();

  // 5. render_path breakdown (renders only)
  const renderPathQuery = db
    .selectFrom("telemetry.events")
    .where("event_type", "=", "render")
    .$if(!!from, (q) => q.where("created_at", ">=", from!))
    .$if(!!to, (q) => q.where("created_at", "<=", to!))
    .$if(filters.renderPath !== "all", (q) =>
      q.where("render_path", "=", filters.renderPath as string)
    )
    .select([
      sql<string>`COALESCE(render_path, 'unknown')`.as("render_path"),
      sql<number>`COUNT(*)`.as("count"),
    ])
    .groupBy(sql`COALESCE(render_path, 'unknown')`)
    .orderBy(sql`COUNT(*)`, "desc")
    .execute();

  // 6. SDK / CLI version breakdown
  const sdkVersionQuery = db
    .selectFrom("telemetry.events")
    .$if(filters.eventType !== "all", (q) => q.where("event_type", "=", filters.eventType))
    .$if(!!from, (q) => q.where("created_at", ">=", from!))
    .$if(!!to, (q) => q.where("created_at", "<=", to!))
    .where("sdk_version", "is not", null)
    .select([
      "sdk_version",
      sql<number>`COUNT(*)`.as("count"),
    ])
    .groupBy("sdk_version")
    .orderBy(sql`COUNT(*)`, "desc")
    .limit(15)
    .execute();

  const cliVersionQuery = db
    .selectFrom("telemetry.events")
    .$if(filters.eventType !== "all", (q) => q.where("event_type", "=", filters.eventType))
    .$if(!!from, (q) => q.where("created_at", ">=", from!))
    .$if(!!to, (q) => q.where("created_at", "<=", to!))
    .where("cli_version", "is not", null)
    .select([
      "cli_version",
      sql<number>`COUNT(*)`.as("count"),
    ])
    .groupBy("cli_version")
    .orderBy(sql`COUNT(*)`, "desc")
    .limit(15)
    .execute();

  // 7. Feature usage averages (renders only, JSONB)
  const featureUsageQuery = db
    .selectFrom("telemetry.events")
    .where("event_type", "=", "render")
    .$if(!!from, (q) => q.where("created_at", ">=", from!))
    .$if(!!to, (q) => q.where("created_at", "<=", to!))
    .select([
      sql<number>`ROUND(AVG((feature_usage->>'efMediaCount')::numeric), 1)`.as("avg_media"),
      sql<number>`ROUND(AVG((feature_usage->>'efImageCount')::numeric), 1)`.as("avg_image"),
      sql<number>`ROUND(AVG((feature_usage->>'efCaptionsCount')::numeric), 1)`.as("avg_captions"),
      sql<number>`ROUND(AVG((feature_usage->>'efTextCount')::numeric), 1)`.as("avg_text"),
      sql<number>`COUNT(*) FILTER (WHERE feature_usage != '{}')`.as("events_with_usage"),
    ])
    .executeTakeFirstOrThrow();

  const [summary, timeSeries, topOrgs, topOrigins, renderPaths, sdkVersions, cliVersions, featureUsage] =
    await Promise.all([
      summaryQuery,
      timeSeriesQuery,
      topOrgsQuery,
      topOriginsQuery,
      renderPathQuery,
      sdkVersionQuery,
      cliVersionQuery,
      featureUsageQuery,
    ]);

  return {
    filters,
    summary: {
      total: Number(summary.total),
      attributed: Number(summary.attributed),
      anonymous: Number(summary.anonymous),
      unique_orgs: Number(summary.unique_orgs),
      avg_duration_ms: summary.avg_duration_ms != null ? Number(summary.avg_duration_ms) : null,
    },
    timeSeries: timeSeries.map((r) => ({
      date: r.date,
      attributed: Number(r.attributed),
      anonymous: Number(r.anonymous),
    })) as TelemetryBucket[],
    topOrgs: topOrgs.map((r) => ({ org_id: r.org_id!, count: Number(r.count) })),
    topOrigins: topOrigins.map((r) => ({ origin: r.origin!, count: Number(r.count) })),
    renderPaths: renderPaths.map((r) => ({
      render_path: r.render_path as string,
      count: Number(r.count),
    })),
    sdkVersions: sdkVersions.map((r) => ({ version: r.sdk_version!, count: Number(r.count) })),
    cliVersions: cliVersions.map((r) => ({ version: r.cli_version!, count: Number(r.count) })),
    featureUsage: {
      avg_media: featureUsage.avg_media != null ? Number(featureUsage.avg_media) : null,
      avg_image: featureUsage.avg_image != null ? Number(featureUsage.avg_image) : null,
      avg_captions: featureUsage.avg_captions != null ? Number(featureUsage.avg_captions) : null,
      avg_text: featureUsage.avg_text != null ? Number(featureUsage.avg_text) : null,
      events_with_usage: Number(featureUsage.events_with_usage),
    },
  };
};

// ─── Components ───────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={clsx(
        "border rounded-lg p-4 transition-colors",
        accent
          ? "bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800"
          : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700",
      )}
    >
      <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
        {label}
      </div>
      <div
        className={clsx(
          "text-2xl font-semibold tabular-nums",
          accent
            ? "text-indigo-700 dark:text-indigo-300"
            : "text-slate-900 dark:text-white",
        )}
      >
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
      {sub && (
        <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">{sub}</div>
      )}
    </div>
  );
}

function FilterButton({
  active,
  href,
  children,
}: {
  active: boolean;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={href}
      className={clsx(
        "px-3 py-1.5 rounded text-xs font-medium transition-colors",
        active
          ? "bg-indigo-600 text-white"
          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700",
      )}
    >
      {children}
    </Link>
  );
}

function buildFilterUrl(
  current: URLSearchParams,
  overrides: Record<string, string>,
): string {
  const params = new URLSearchParams(current);
  // Clear custom date if switching preset
  if (overrides.preset) {
    params.delete("from");
    params.delete("to");
  }
  for (const [k, v] of Object.entries(overrides)) {
    params.set(k, v);
  }
  return `?${params.toString()}`;
}

function RenderPathBadge({ path }: { path: string }) {
  const colors: Record<string, string> = {
    client: "bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200",
    cli: "bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200",
    server: "bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-200",
    unknown: "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400",
  };
  return (
    <span
      className={clsx(
        "text-xs px-2 py-0.5 rounded-full font-medium",
        colors[path] ?? colors.unknown,
      )}
    >
      {path}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TelemetryDashboard({ loaderData }: Route.ComponentProps) {
  const {
    filters,
    summary,
    timeSeries,
    topOrgs,
    topOrigins,
    renderPaths,
    sdkVersions,
    cliVersions,
    featureUsage,
  } = loaderData;

  const [searchParams] = useSearchParams();

  const showRenderFields = filters.eventType !== "load";

  const totalRenderPathCount = renderPaths.reduce((s, r) => s + r.count, 0);

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Client Telemetry
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          SDK render and load events from <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 rounded">telemetry.events</code>
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-4 items-end">
        {/* Event type */}
        <div className="flex flex-col gap-1">
          <span className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            Event type
          </span>
          <div className="flex gap-1">
            {(["all", "render", "load"] as EventTypeFilter[]).map((t) => (
              <FilterButton
                key={t}
                active={filters.eventType === t}
                href={buildFilterUrl(searchParams, { eventType: t })}
              >
                {t === "all" ? "All" : t === "render" ? "Renders" : "Loads"}
              </FilterButton>
            ))}
          </div>
        </div>

        {/* Render path (hidden for load-only) */}
        {showRenderFields && (
          <div className="flex flex-col gap-1">
            <span className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Render path
            </span>
            <div className="flex gap-1">
              {(["all", "client", "cli", "server"] as RenderPathFilter[]).map((p) => (
                <FilterButton
                  key={p}
                  active={filters.renderPath === p}
                  href={buildFilterUrl(searchParams, { renderPath: p })}
                >
                  {p === "all" ? "All" : p}
                </FilterButton>
              ))}
            </div>
          </div>
        )}

        {/* Time range presets */}
        <div className="flex flex-col gap-1">
          <span className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            Time range
          </span>
          <div className="flex gap-1">
            {(["7d", "30d", "90d", "all"] as DatePreset[]).map((p) => (
              <FilterButton
                key={p}
                active={filters.preset === p && !filters.from}
                href={buildFilterUrl(searchParams, { preset: p })}
              >
                {p === "all" ? "All time" : `Last ${p}`}
              </FilterButton>
            ))}
          </div>
        </div>

        {/* Custom date range */}
        <div className="flex flex-col gap-1">
          <span className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            Custom range
          </span>
          <form method="get" className="flex gap-1 items-center">
            {/* Carry existing non-date params */}
            <input type="hidden" name="eventType" value={filters.eventType} />
            <input type="hidden" name="renderPath" value={filters.renderPath} />
            <input type="hidden" name="preset" value={filters.preset} />
            <input
              type="date"
              name="from"
              defaultValue={filters.from ?? ""}
              className={clsx(
                "text-xs border rounded px-2 py-1 transition-colors",
                "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600",
                "text-slate-700 dark:text-slate-300",
              )}
            />
            <span className="text-xs text-slate-400">–</span>
            <input
              type="date"
              name="to"
              defaultValue={filters.to ?? ""}
              className={clsx(
                "text-xs border rounded px-2 py-1 transition-colors",
                "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600",
                "text-slate-700 dark:text-slate-300",
              )}
            />
            <button
              type="submit"
              className="text-xs px-2 py-1.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              Apply
            </button>
          </form>
        </div>
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard label="Total events" value={summary.total} accent />
        <StatCard
          label="Attributed"
          value={summary.attributed}
          sub={summary.total > 0 ? `${Math.round((summary.attributed / summary.total) * 100)}% of total` : undefined}
        />
        <StatCard
          label="Anonymous"
          value={summary.anonymous}
          sub={summary.total > 0 ? `${Math.round((summary.anonymous / summary.total) * 100)}% of total` : undefined}
        />
        <StatCard label="Unique orgs" value={summary.unique_orgs} />
        {showRenderFields && summary.avg_duration_ms != null && (
          <StatCard
            label="Avg render duration"
            value={`${summary.avg_duration_ms.toLocaleString()} ms`}
            sub={`${(summary.avg_duration_ms / 1000).toFixed(1)}s`}
          />
        )}
      </div>

      {/* Time-series chart */}
      <div
        className={clsx(
          "border rounded-lg p-4 transition-colors",
          "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700",
        )}
      >
        <h2 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-4">
          Events over time
          <span className="ml-2 text-xs font-normal text-slate-400 dark:text-slate-500">
            {filters.preset === "all" || filters.preset === "90d" ? "weekly buckets" : "daily buckets"}
          </span>
        </h2>
        {timeSeries.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-sm text-slate-400 dark:text-slate-500">
            No events in this range
          </div>
        ) : (
          <div className="h-64">
            <TelemetryAreaChart data={timeSeries} />
          </div>
        )}
      </div>

      {/* Three-column breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* render_path breakdown */}
        {showRenderFields && (
          <div
            className={clsx(
              "border rounded-lg p-4 transition-colors",
              "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700",
            )}
          >
            <h2 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
              Render path
            </h2>
            {renderPaths.length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-slate-500">No render events</p>
            ) : (
              <div className="space-y-2">
                {renderPaths.map((r) => (
                  <div key={r.render_path} className="flex items-center gap-2">
                    <RenderPathBadge path={r.render_path} />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300 tabular-nums flex-1 text-right">
                      {r.count.toLocaleString()}
                    </span>
                    <span className="text-xs text-slate-400 w-10 text-right">
                      {totalRenderPathCount > 0
                        ? `${Math.round((r.count / totalRenderPathCount) * 100)}%`
                        : "—"}
                    </span>
                  </div>
                ))}
                {/* Proportion bar */}
                <div className="flex h-2 rounded-full overflow-hidden mt-3">
                  {renderPaths.map((r) => {
                    const pct =
                      totalRenderPathCount > 0
                        ? (r.count / totalRenderPathCount) * 100
                        : 0;
                    const bg =
                      r.render_path === "client"
                        ? "bg-blue-400"
                        : r.render_path === "cli"
                          ? "bg-green-400"
                          : r.render_path === "server"
                            ? "bg-orange-400"
                            : "bg-slate-300";
                    return (
                      <div
                        key={r.render_path}
                        className={bg}
                        style={{ width: `${pct}%` }}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Top orgs */}
        <div
          className={clsx(
            "border rounded-lg p-4 transition-colors",
            "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700",
            !showRenderFields && "lg:col-start-1",
          )}
        >
          <h2 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
            Top orgs by event count
          </h2>
          {topOrgs.length === 0 ? (
            <p className="text-xs text-slate-400 dark:text-slate-500">No attributed events</p>
          ) : (
            <div className="space-y-1">
              {topOrgs.map((org, i) => (
                <div key={org.org_id} className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400 w-4 text-right tabular-nums">{i + 1}</span>
                  <Link
                    to={`/admin/orgs/${org.org_id}`}
                    className="font-mono text-indigo-600 dark:text-indigo-400 hover:underline truncate flex-1 min-w-0"
                    title={org.org_id}
                  >
                    {org.org_id}
                  </Link>
                  <span className="text-slate-700 dark:text-slate-300 tabular-nums font-medium shrink-0">
                    {org.count.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top origins */}
        <div
          className={clsx(
            "border rounded-lg p-4 transition-colors",
            "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700",
          )}
        >
          <h2 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
            Top origins
          </h2>
          {topOrigins.length === 0 ? (
            <p className="text-xs text-slate-400 dark:text-slate-500">No origin data</p>
          ) : (
            <div className="space-y-1">
              {topOrigins.map((origin, i) => (
                <div key={origin.origin} className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400 w-4 text-right tabular-nums">{i + 1}</span>
                  <span
                    className={clsx(
                      "truncate flex-1 min-w-0",
                      origin.origin === "(direct / CLI)"
                        ? "text-slate-400 dark:text-slate-500 italic"
                        : "text-slate-700 dark:text-slate-300 font-mono",
                    )}
                    title={origin.origin}
                  >
                    {origin.origin}
                  </span>
                  <span className="text-slate-700 dark:text-slate-300 tabular-nums font-medium shrink-0">
                    {origin.count.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Feature usage (renders only) */}
      {showRenderFields && (
        <div
          className={clsx(
            "border rounded-lg p-4 transition-colors",
            "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700",
          )}
        >
          <div className="flex items-baseline gap-2 mb-4">
            <h2 className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Feature usage averages
            </h2>
            <span className="text-xs text-slate-400 dark:text-slate-500">
              per render · from {featureUsage.events_with_usage.toLocaleString()} events with usage data
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Media elements", value: featureUsage.avg_media },
              { label: "Image elements", value: featureUsage.avg_image },
              { label: "Captions elements", value: featureUsage.avg_captions },
              { label: "Text elements", value: featureUsage.avg_text },
            ].map(({ label, value }) => (
              <div
                key={label}
                className={clsx(
                  "border rounded p-3 transition-colors",
                  "bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700",
                )}
              >
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">{label}</div>
                <div className="text-xl font-semibold text-slate-900 dark:text-white tabular-nums">
                  {value != null ? value : "—"}
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-3">
            JSONB schema may be inconsistent across SDK versions — averages exclude nulls.
          </p>
        </div>
      )}

      {/* SDK / CLI versions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {sdkVersions.length > 0 && (
          <div
            className={clsx(
              "border rounded-lg p-4 transition-colors",
              "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700",
            )}
          >
            <h2 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
              SDK versions
            </h2>
            <VersionTable rows={sdkVersions} />
          </div>
        )}
        {cliVersions.length > 0 && (
          <div
            className={clsx(
              "border rounded-lg p-4 transition-colors",
              "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700",
            )}
          >
            <h2 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
              CLI versions
            </h2>
            <VersionTable rows={cliVersions} />
          </div>
        )}
      </div>
    </div>
  );
}

function VersionTable({ rows }: { rows: { version: string; count: number }[] }) {
  const total = rows.reduce((s, r) => s + r.count, 0);
  return (
    <div className="space-y-1">
      {rows.map((r) => (
        <div key={r.version} className="flex items-center gap-2 text-xs">
          <code className="text-slate-700 dark:text-slate-300 flex-1">{r.version}</code>
          <span className="text-slate-700 dark:text-slate-300 tabular-nums font-medium shrink-0">
            {r.count.toLocaleString()}
          </span>
          <span className="text-slate-400 dark:text-slate-500 w-8 text-right shrink-0">
            {total > 0 ? `${Math.round((r.count / total) * 100)}%` : "—"}
          </span>
        </div>
      ))}
    </div>
  );
}
