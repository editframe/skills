import { useEffect, useMemo, useState } from "react";
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
    <div className="overflow-y-auto h-full grid grid-rows-[auto_1fr]">
      <input
        type="text"
        onPasteCapture={(e) => {
          e.preventDefault();
          const text = e.clipboardData.getData("text/plain");
          setRawLogs(text);
        }}
      />
      <div>
        <div className="flex-1">
          {filteredLogs.length} / {logs.length} Logs
        </div>
        {filters.map((filter) => (
          <div
            key={filter.keyPath}
            className="font-mono bg-gray-100 text-xs rounded-md inline-block m-1 p-1"
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
        {filteredLogs.slice(0, 5_000).map((log) => (
          <div className="whitespace-nowrap font-mono border-b border-gray-200 hover:bg-gray-50">
            {Object.entries(log).map(([key, value]) => (
              <span
                key={key}
                className="pr-2 hover:bg-blue-100 inline-block"
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
