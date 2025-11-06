import { requireAdminSession } from "@/util/requireAdminSession";
import { AutoRefresh } from "./AutoRefresh";
import { Table } from "~/components/Table";
import { TimeAgoInWords } from "~/ui/timeAgoInWords";

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

export default function ApiTraffic({
  loaderData,
}: Route.ComponentProps) {
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
          <h1 className="text-2xl font-bold">API Traffic Monitoring</h1>
          <p className="text-gray-600 mt-1">
            Monitor API requests to editframe.dev to track migration progress
          </p>
        </div>
        <AutoRefresh />
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h2 className="font-semibold text-blue-900 mb-2">Monitoring Setup</h2>
        <p className="text-blue-800 text-sm mb-2">
          All API requests are now tagged with domain information in logs and traces.
        </p>
        <ul className="text-blue-800 text-sm list-disc list-inside space-y-1">
          <li>Domain is logged in morgan request logs as <code className="bg-blue-100 px-1 rounded">:host</code></li>
          <li>OpenTelemetry spans include <code className="bg-blue-100 px-1 rounded">http.host</code> and <code className="bg-blue-100 px-1 rounded">http.domain</code> attributes</li>
          <li>Logs are queryable in Google Cloud Logging</li>
        </ul>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white border border-gray-200 rounded-lg p-4"
          >
            <div className="text-sm text-gray-600 mb-1">{stat.label}</div>
            <div className="text-xl font-semibold mb-1">
              {typeof stat.value === "string" ? (
                <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                  {stat.value}
                </code>
              ) : (
                stat.value
              )}
            </div>
            {stat.description && (
              <div className="text-xs text-gray-500 mt-2">
                {stat.description}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h2 className="font-semibold text-yellow-900 mb-2">How to Monitor</h2>
        <ol className="text-yellow-800 text-sm list-decimal list-inside space-y-2">
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
            <code className="bg-yellow-100 px-1 rounded">
              resource.type="cloud_run_revision" AND http.domain="editframe.dev"
            </code>
          </li>
          <li>
            Filter by API endpoints:{" "}
            <code className="bg-yellow-100 px-1 rounded">
              httpRequest.requestUrl=~"/api/v1/.*"
            </code>
          </li>
          <li>
            Add time range filters to see traffic trends over time
          </li>
        </ol>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h2 className="font-semibold mb-2">Quick Stats</h2>
        <p className="text-gray-600 text-sm">
          For detailed metrics, use Cloud Logging queries. This dashboard will be
          enhanced with direct log queries in a future update.
        </p>
        <div className="mt-4 text-sm text-gray-500">
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

