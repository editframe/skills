import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import type { Route } from "./+types/logtool";

interface Filter {
  keyPath: string;
  value: string;
  operator:
    | "eq"
    | "neq"
    | "gt"
    | "gte"
    | "lt"
    | "lte"
    | "contains"
    | "startsWith"
    | "endsWith";
}

export default function Logtool(_props: Route.ComponentProps) {
  const [rawLogs, setRawLogs] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  const [filters, setFilters] = useState<Filter[]>([]);

  useEffect(() => {
    const logs = [];
    const lines = rawLogs.split("\n");
    for (const line of lines) {
      try {
        logs.push(JSON.parse(line));
      } catch (error) {
        logs.push({
          msg: line,
          text: true,
        });
      }
    }
    setLogs(logs);
  }, [rawLogs]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      return filters.every((filter) => {
        let value = log;
        for (const keyPath of filter.keyPath.split(".")) {
          // @ts-ignore log tool is not used in production
          value = value[keyPath];
        }
        switch (filter.operator) {
          case "eq":
            return value === filter.value;
          case "neq":
            return value !== filter.value;
        }
      });
    });
  }, [logs, filters]);

  return (
    <div className={clsx(
      "overflow-y-auto h-full grid grid-rows-[auto_1fr] transition-colors",
      "bg-white dark:bg-slate-900"
    )}>
      <input
        type="text"
        className={clsx(
          "px-2 py-1 border rounded transition-colors",
          "bg-white dark:bg-slate-800",
          "text-slate-900 dark:text-white",
          "border-slate-300 dark:border-slate-600",
          "focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400",
          "focus:border-blue-500 dark:focus:border-blue-400"
        )}
        onPasteCapture={(e) => {
          e.preventDefault();
          const text = e.clipboardData.getData("text/plain");
          setRawLogs(text);
        }}
      />
      <div>
        <div className={clsx(
          "flex-1 transition-colors",
          "text-slate-900 dark:text-white"
        )}>
          {filteredLogs.length} / {logs.length} Logs
        </div>
        {filters.map((filter) => (
          <div
            key={filter.keyPath}
            className={clsx(
              "font-mono text-xs rounded-md inline-block m-1 p-1 transition-colors cursor-pointer",
              "bg-slate-100 dark:bg-slate-800",
              "text-slate-900 dark:text-white",
              "hover:bg-slate-200 dark:hover:bg-slate-700"
            )}
            onClick={(event) => {
              event.stopPropagation();
              const newFilters = filters.filter((f) => f !== filter);
              setFilters(newFilters);
            }}
          >
            {filter.keyPath} {filter.operator} {String(filter.value)}
          </div>
        ))}
      </div>
      <div className="overflow-auto">
        {filteredLogs.slice(0, 5_000).map((log, index) => (
          <div key={index} className={clsx(
            "whitespace-nowrap font-mono border-b transition-colors",
            "border-slate-200 dark:border-slate-700",
            "hover:bg-slate-50 dark:hover:bg-slate-800"
          )}>
            {Object.entries(log).map(([key, value]) => (
              <span
                key={key}
                className={clsx(
                  "pr-2 inline-block cursor-pointer transition-colors",
                  "hover:bg-blue-100 dark:hover:bg-blue-900/30"
                )}
                onClick={(event) => {
                  event.stopPropagation();
                  if (event.shiftKey) {
                    setFilters(filters.filter((f) => f.keyPath !== key));
                  } else if (event.metaKey) {
                    setFilters([
                      ...filters,
                      { keyPath: key, value: value, operator: "neq" },
                    ]);
                  } else {
                    setFilters([
                      ...filters,
                      { keyPath: key, value: value, operator: "eq" },
                    ]);
                  }
                }}
              >
                {key}: {JSON.stringify(value)}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
