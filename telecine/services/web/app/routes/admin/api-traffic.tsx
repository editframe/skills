import { requireAdminSession } from "@/util/requireAdminSession";
import { AutoRefresh } from "./AutoRefresh";
import clsx from "clsx";

import type { Route } from "./+types/api-traffic";

export const loader = async ({ request }: Route.LoaderArgs) => {
  await requireAdminSession(request);

  return {
    message: "API traffic monitoring for editframe.dev",
    note: "Traffic data is logged with domain attributes. Query Cloud Logging with: http.domain='editframe.dev' OR http.host='editframe.dev'",
  };
};

interface TrafficStat {
  label: string;
  value: string | number;
  description?: string;
}

export default function ApiTraffic({}: Route.ComponentProps) {
  const stats: TrafficStat[] = [
    {
      label: "Status",
      value: "Monitoring Active",
      description: "Domain attributes are being logged to Cloud Logging",
    },
    {
      label: "Log Query",
      value: "http.domain='editframe.dev'",
      description: "Use this filter in Cloud Logging console",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1
            className={clsx(
              "text-2xl font-bold transition-colors",
              "text-slate-900 dark:text-white",
            )}
          >
            API Traffic Monitoring
          </h1>
          <p
            className={clsx(
              "mt-1 transition-colors",
              "text-slate-600 dark:text-slate-400",
            )}
          >
            Monitor API requests to editframe.dev to track migration progress
          </p>
        </div>
        <AutoRefresh />
      </div>

      <div
        className={clsx(
          "border rounded-lg p-4 transition-colors",
          "bg-blue-50 dark:bg-blue-900/20",
          "border-blue-200 dark:border-blue-800",
        )}
      >
        <h2
          className={clsx(
            "font-semibold mb-2 transition-colors",
            "text-blue-900 dark:text-blue-100",
          )}
        >
          Monitoring Setup
        </h2>
        <p
          className={clsx(
            "text-sm mb-2 transition-colors",
            "text-blue-800 dark:text-blue-200",
          )}
        >
          All API requests are now tagged with domain information in logs and
          traces.
        </p>
        <ul
          className={clsx(
            "text-sm list-disc list-inside space-y-1 transition-colors",
            "text-blue-800 dark:text-blue-200",
          )}
        >
          <li>
            Domain is logged in morgan request logs as{" "}
            <code
              className={clsx(
                "px-1 rounded transition-colors",
                "bg-blue-100 dark:bg-blue-800/50",
              )}
            >
              :host
            </code>
          </li>
          <li>
            OpenTelemetry spans include{" "}
            <code
              className={clsx(
                "px-1 rounded transition-colors",
                "bg-blue-100 dark:bg-blue-800/50",
              )}
            >
              http.host
            </code>{" "}
            and{" "}
            <code
              className={clsx(
                "px-1 rounded transition-colors",
                "bg-blue-100 dark:bg-blue-800/50",
              )}
            >
              http.domain
            </code>{" "}
            attributes
          </li>
          <li>Logs are queryable in Google Cloud Logging</li>
        </ul>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={clsx(
              "border rounded-lg p-4 transition-colors",
              "bg-white dark:bg-slate-800",
              "border-slate-200 dark:border-slate-700",
            )}
          >
            <div
              className={clsx(
                "text-sm mb-1 transition-colors",
                "text-slate-600 dark:text-slate-400",
              )}
            >
              {stat.label}
            </div>
            <div
              className={clsx(
                "text-xl font-semibold mb-1 transition-colors",
                "text-slate-900 dark:text-white",
              )}
            >
              {typeof stat.value === "string" ? (
                <code
                  className={clsx(
                    "px-2 py-1 rounded text-sm transition-colors",
                    "bg-slate-100 dark:bg-slate-700",
                    "text-slate-900 dark:text-white",
                  )}
                >
                  {stat.value}
                </code>
              ) : (
                stat.value
              )}
            </div>
            {stat.description && (
              <div
                className={clsx(
                  "text-xs mt-2 transition-colors",
                  "text-slate-500 dark:text-slate-400",
                )}
              >
                {stat.description}
              </div>
            )}
          </div>
        ))}
      </div>

      <div
        className={clsx(
          "border rounded-lg p-4 transition-colors",
          "bg-yellow-50 dark:bg-yellow-900/20",
          "border-yellow-200 dark:border-yellow-800",
        )}
      >
        <h2
          className={clsx(
            "font-semibold mb-2 transition-colors",
            "text-yellow-900 dark:text-yellow-100",
          )}
        >
          How to Monitor
        </h2>
        <ol
          className={clsx(
            "text-sm list-decimal list-inside space-y-2 transition-colors",
            "text-yellow-800 dark:text-yellow-200",
          )}
        >
          <li>
            Go to{" "}
            <a
              href="https://console.cloud.google.com/logs/query"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              Google Cloud Logging Console
            </a>
          </li>
          <li>
            Use the query:{" "}
            <code
              className={clsx(
                "px-1 rounded transition-colors",
                "bg-yellow-100 dark:bg-yellow-800/50",
              )}
            >
              resource.type="cloud_run_revision" AND http.domain="editframe.dev"
            </code>
          </li>
          <li>
            Filter by API endpoints:{" "}
            <code
              className={clsx(
                "px-1 rounded transition-colors",
                "bg-yellow-100 dark:bg-yellow-800/50",
              )}
            >
              httpRequest.requestUrl=~"/api/v1/.*"
            </code>
          </li>
          <li>Add time range filters to see traffic trends over time</li>
        </ol>
      </div>

      <div
        className={clsx(
          "border rounded-lg p-4 transition-colors",
          "bg-white dark:bg-slate-800",
          "border-slate-200 dark:border-slate-700",
        )}
      >
        <h2
          className={clsx(
            "font-semibold mb-2 transition-colors",
            "text-slate-900 dark:text-white",
          )}
        >
          Quick Stats
        </h2>
        <p
          className={clsx(
            "text-sm transition-colors",
            "text-slate-600 dark:text-slate-400",
          )}
        >
          For detailed metrics, use Cloud Logging queries. This dashboard will
          be enhanced with direct log queries in a future update.
        </p>
        <div
          className={clsx(
            "mt-4 text-sm transition-colors",
            "text-slate-500 dark:text-slate-400",
          )}
        >
          <p>
            <strong>What to monitor:</strong>
          </p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Request count over time (confirm traffic wind-down)</li>
            <li>Requests by endpoint/path</li>
            <li>Error rate for editframe.dev requests</li>
            <li>API key usage (if available in logs)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
