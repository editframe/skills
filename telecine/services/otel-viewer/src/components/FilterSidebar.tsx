import { useState, useMemo, useEffect, useRef } from "react";
import type { Trace } from "../hooks/useTraceData";

type FilterState = "neutral" | "show" | "hide";

export interface AttributeFilter {
  spanName: string;
  attributeKey: string;
  condition: "exists" | "missing" | "equals" | "notEquals";
  value?: string;
  mode: "show" | "hide";
}

interface FilterSidebarProps {
  traces: Trace[];
  onFilterChange: (filteredTraces: Trace[]) => void;
  searchParams: URLSearchParams;
  setSearchParams: (params: URLSearchParams) => void;
  attributeFilters: AttributeFilter[];
}

export function getAttributeValueAsString(value: any): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    if ("stringValue" in value) return value.stringValue || "";
    if ("intValue" in value) return String(value.intValue);
    if ("doubleValue" in value) return String(value.doubleValue);
    if ("boolValue" in value) return String(value.boolValue);
    return JSON.stringify(value);
  }
  return String(value);
}

export function parseAttributeFiltersFromUrl(
  searchParams: URLSearchParams,
): AttributeFilter[] {
  const attrParam = searchParams.get("attrFilters");
  if (!attrParam) return [];

  try {
    return JSON.parse(attrParam);
  } catch {
    return [];
  }
}

export function updateUrlWithAttributeFilters(
  searchParams: URLSearchParams,
  filters: AttributeFilter[],
): URLSearchParams {
  const params = new URLSearchParams(searchParams);

  if (filters.length > 0) {
    params.set("attrFilters", JSON.stringify(filters));
  } else {
    params.delete("attrFilters");
  }

  return params;
}

function parseFiltersFromUrl(
  searchParams: URLSearchParams,
  prefix: string,
): Map<string, FilterState> {
  const filters = new Map<string, FilterState>();

  const showParam = searchParams.get(`${prefix}Show`);
  if (showParam) {
    showParam
      .split(",")
      .filter(Boolean)
      .forEach((name) => filters.set(name, "show"));
  }

  const hideParam = searchParams.get(`${prefix}Hide`);
  if (hideParam) {
    hideParam
      .split(",")
      .filter(Boolean)
      .forEach((name) => filters.set(name, "hide"));
  }

  return filters;
}

function updateUrlWithFilters(
  searchParams: URLSearchParams,
  prefix: string,
  filters: Map<string, FilterState>,
): URLSearchParams {
  const params = new URLSearchParams(searchParams);

  const showItems = Array.from(filters.entries())
    .filter(([_, state]) => state === "show")
    .map(([name]) => name);

  const hideItems = Array.from(filters.entries())
    .filter(([_, state]) => state === "hide")
    .map(([name]) => name);

  if (showItems.length > 0) {
    params.set(`${prefix}Show`, showItems.join(","));
  } else {
    params.delete(`${prefix}Show`);
  }

  if (hideItems.length > 0) {
    params.set(`${prefix}Hide`, hideItems.join(","));
  } else {
    params.delete(`${prefix}Hide`);
  }

  return params;
}

export function FilterSidebar({
  traces,
  onFilterChange,
  searchParams,
  setSearchParams,
  attributeFilters,
}: FilterSidebarProps) {
  const [traceFilters, setTraceFilters] = useState<Map<string, FilterState>>(
    () => parseFiltersFromUrl(searchParams, "trace"),
  );
  const [spanFilters, setSpanFilters] = useState<Map<string, FilterState>>(() =>
    parseFiltersFromUrl(searchParams, "span"),
  );
  const [serviceFilters, setServiceFilters] = useState<
    Map<string, FilterState>
  >(() => parseFiltersFromUrl(searchParams, "service"));
  const [traceSearch, setTraceSearch] = useState("");
  const [spanSearch, setSpanSearch] = useState("");
  const [serviceSearch, setServiceSearch] = useState("");

  useEffect(() => {
    setTraceFilters(parseFiltersFromUrl(searchParams, "trace"));
    setSpanFilters(parseFiltersFromUrl(searchParams, "span"));
    setServiceFilters(parseFiltersFromUrl(searchParams, "service"));
  }, [searchParams.get("pageId")]);
  const [traceSelectedIndex, setTraceSelectedIndex] = useState(-1);
  const [spanSelectedIndex, setSpanSelectedIndex] = useState(-1);
  const [serviceSelectedIndex, setServiceSelectedIndex] = useState(-1);
  const traceItemRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const spanItemRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const serviceItemRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const { traceNames, spanNames, serviceNames } = useMemo(() => {
    const traceNameSet = new Set<string>();
    const spanNameSet = new Set<string>();
    const serviceNameSet = new Set<string>();

    traces.forEach((trace) => {
      if (trace.rootSpans[0]) {
        traceNameSet.add(trace.rootSpans[0].name);
      }
      trace.allSpans.forEach((span) => {
        spanNameSet.add(span.name);
        serviceNameSet.add(span.serviceName);
      });
    });

    return {
      traceNames: Array.from(traceNameSet).sort(),
      spanNames: Array.from(spanNameSet).sort(),
      serviceNames: Array.from(serviceNameSet).sort(),
    };
  }, [traces]);

  const filteredTraceNames = useMemo(() => {
    if (!traceSearch) return traceNames;
    return traceNames.filter((name) => {
      const hasFilter =
        traceFilters.has(name) && traceFilters.get(name) !== "neutral";
      const matchesSearch = name
        .toLowerCase()
        .includes(traceSearch.toLowerCase());
      return hasFilter || matchesSearch;
    });
  }, [traceNames, traceSearch, traceFilters]);

  const filteredSpanNames = useMemo(() => {
    if (!spanSearch) return spanNames;
    return spanNames.filter((name) => {
      const hasFilter =
        spanFilters.has(name) && spanFilters.get(name) !== "neutral";
      const matchesSearch = name
        .toLowerCase()
        .includes(spanSearch.toLowerCase());
      return hasFilter || matchesSearch;
    });
  }, [spanNames, spanSearch, spanFilters]);

  const filteredServiceNames = useMemo(() => {
    if (!serviceSearch) return serviceNames;
    return serviceNames.filter((name) => {
      const hasFilter =
        serviceFilters.has(name) && serviceFilters.get(name) !== "neutral";
      const matchesSearch = name
        .toLowerCase()
        .includes(serviceSearch.toLowerCase());
      return hasFilter || matchesSearch;
    });
  }, [serviceNames, serviceSearch, serviceFilters]);

  useEffect(() => {
    setTraceSelectedIndex(-1);
  }, [traceSearch]);

  useEffect(() => {
    setSpanSelectedIndex(-1);
  }, [spanSearch]);

  useEffect(() => {
    setServiceSelectedIndex(-1);
  }, [serviceSearch]);

  useEffect(() => {
    if (traceSelectedIndex >= 0) {
      traceItemRefs.current.get(traceSelectedIndex)?.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  }, [traceSelectedIndex]);

  useEffect(() => {
    if (spanSelectedIndex >= 0) {
      spanItemRefs.current.get(spanSelectedIndex)?.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  }, [spanSelectedIndex]);

  useEffect(() => {
    if (serviceSelectedIndex >= 0) {
      serviceItemRefs.current.get(serviceSelectedIndex)?.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  }, [serviceSelectedIndex]);

  const cycleFilterState = (current: FilterState): FilterState => {
    if (current === "neutral") return "show";
    if (current === "show") return "hide";
    return "neutral";
  };

  const handleTraceSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setTraceSelectedIndex((prev) =>
        prev < filteredTraceNames.length - 1 ? prev + 1 : 0,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setTraceSelectedIndex((prev) =>
        prev > 0 ? prev - 1 : filteredTraceNames.length - 1,
      );
    } else if (
      (e.key === "Enter" || e.key === " ") &&
      traceSelectedIndex >= 0
    ) {
      e.preventDefault();
      const name = filteredTraceNames[traceSelectedIndex];
      if (name) {
        toggleTraceName(name);
      }
    }
  };

  const handleSpanSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSpanSelectedIndex((prev) =>
        prev < filteredSpanNames.length - 1 ? prev + 1 : 0,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSpanSelectedIndex((prev) =>
        prev > 0 ? prev - 1 : filteredSpanNames.length - 1,
      );
    } else if ((e.key === "Enter" || e.key === " ") && spanSelectedIndex >= 0) {
      e.preventDefault();
      const name = filteredSpanNames[spanSelectedIndex];
      if (name) {
        toggleSpanName(name);
      }
    }
  };

  const handleServiceSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setServiceSelectedIndex((prev) =>
        prev < filteredServiceNames.length - 1 ? prev + 1 : 0,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setServiceSelectedIndex((prev) =>
        prev > 0 ? prev - 1 : filteredServiceNames.length - 1,
      );
    } else if (
      (e.key === "Enter" || e.key === " ") &&
      serviceSelectedIndex >= 0
    ) {
      e.preventDefault();
      const name = filteredServiceNames[serviceSelectedIndex];
      if (name) {
        toggleServiceName(name);
      }
    }
  };

  const toggleTraceName = (name: string) => {
    const newFilters = new Map(traceFilters);
    const current = newFilters.get(name) || "neutral";
    const next = cycleFilterState(current);

    if (next === "neutral") {
      newFilters.delete(name);
    } else {
      newFilters.set(name, next);
    }

    setTraceFilters(newFilters);

    let params = updateUrlWithFilters(searchParams, "trace", newFilters);
    params = updateUrlWithFilters(params, "span", spanFilters);
    params = updateUrlWithFilters(params, "service", serviceFilters);
    setSearchParams(params);
  };

  const toggleSpanName = (name: string) => {
    const newFilters = new Map(spanFilters);
    const current = newFilters.get(name) || "neutral";
    const next = cycleFilterState(current);

    if (next === "neutral") {
      newFilters.delete(name);
    } else {
      newFilters.set(name, next);
    }

    setSpanFilters(newFilters);

    let params = updateUrlWithFilters(searchParams, "trace", traceFilters);
    params = updateUrlWithFilters(params, "span", newFilters);
    params = updateUrlWithFilters(params, "service", serviceFilters);
    setSearchParams(params);
  };

  const toggleServiceName = (name: string) => {
    const newFilters = new Map(serviceFilters);
    const current = newFilters.get(name) || "neutral";
    const next = cycleFilterState(current);

    if (next === "neutral") {
      newFilters.delete(name);
    } else {
      newFilters.set(name, next);
    }

    setServiceFilters(newFilters);

    let params = updateUrlWithFilters(searchParams, "trace", traceFilters);
    params = updateUrlWithFilters(params, "span", spanFilters);
    params = updateUrlWithFilters(params, "service", newFilters);
    setSearchParams(params);
  };

  const filteredTraces = useMemo(() => {
    const showTraces = Array.from(traceFilters.entries())
      .filter(([_, state]) => state === "show")
      .map(([name]) => name);

    const hideTraces = Array.from(traceFilters.entries())
      .filter(([_, state]) => state === "hide")
      .map(([name]) => name);

    const showSpans = Array.from(spanFilters.entries())
      .filter(([_, state]) => state === "show")
      .map(([name]) => name);

    const hideSpans = Array.from(spanFilters.entries())
      .filter(([_, state]) => state === "hide")
      .map(([name]) => name);

    const showServices = Array.from(serviceFilters.entries())
      .filter(([_, state]) => state === "show")
      .map(([name]) => name);

    const hideServices = Array.from(serviceFilters.entries())
      .filter(([_, state]) => state === "hide")
      .map(([name]) => name);

    const hasShowFilters =
      showTraces.length > 0 || showSpans.length > 0 || showServices.length > 0;

    return traces.filter((trace) => {
      const rootName = trace.rootSpans[0]?.name;
      const spanNamesInTrace = trace.allSpans.map((s) => s.name);
      const serviceNamesInTrace = trace.allSpans.map((s) => s.serviceName);

      if (hideTraces.includes(rootName || "")) {
        return false;
      }

      const hasHiddenSpan = spanNamesInTrace.some((name) =>
        hideSpans.includes(name),
      );
      if (hasHiddenSpan) {
        return false;
      }

      const hasHiddenService = serviceNamesInTrace.some((name) =>
        hideServices.includes(name),
      );
      if (hasHiddenService) {
        return false;
      }

      const showAttrFilters = attributeFilters.filter((f) => f.mode === "show");
      const hideAttrFilters = attributeFilters.filter((f) => f.mode === "hide");

      for (const filter of hideAttrFilters) {
        const matchingSpans = trace.allSpans.filter(
          (s) => s.name === filter.spanName,
        );

        if (matchingSpans.length === 0) {
          continue;
        }

        const hasMatchingSpan = matchingSpans.some((span) => {
          const attr = span.attributes.find(
            (a) => a.key === filter.attributeKey,
          );

          switch (filter.condition) {
            case "exists":
              return (
                attr !== undefined &&
                attr.value !== null &&
                attr.value !== undefined
              );
            case "missing":
              return (
                attr === undefined ||
                attr.value === null ||
                attr.value === undefined
              );
            case "equals":
              if (!attr) return false;
              const attrValue = getAttributeValueAsString(attr.value);
              return attrValue === filter.value;
            case "notEquals":
              if (!attr) return true;
              const attrVal = getAttributeValueAsString(attr.value);
              return attrVal !== filter.value;
            default:
              return true;
          }
        });

        if (hasMatchingSpan) {
          return false;
        }
      }

      for (const filter of showAttrFilters) {
        const matchingSpans = trace.allSpans.filter(
          (s) => s.name === filter.spanName,
        );

        if (matchingSpans.length === 0) {
          return false;
        }

        const hasMatchingSpan = matchingSpans.some((span) => {
          const attr = span.attributes.find(
            (a) => a.key === filter.attributeKey,
          );

          switch (filter.condition) {
            case "exists":
              return (
                attr !== undefined &&
                attr.value !== null &&
                attr.value !== undefined
              );
            case "missing":
              return (
                attr === undefined ||
                attr.value === null ||
                attr.value === undefined
              );
            case "equals":
              if (!attr) return false;
              const attrValue = getAttributeValueAsString(attr.value);
              return attrValue === filter.value;
            case "notEquals":
              if (!attr) return true;
              const attrVal = getAttributeValueAsString(attr.value);
              return attrVal !== filter.value;
            default:
              return true;
          }
        });

        if (!hasMatchingSpan) {
          return false;
        }
      }

      if (hasShowFilters) {
        const matchesTraceShow = showTraces.includes(rootName || "");
        const matchesSpanShow = spanNamesInTrace.some((name) =>
          showSpans.includes(name),
        );
        const matchesServiceShow = serviceNamesInTrace.some((name) =>
          showServices.includes(name),
        );
        return matchesTraceShow || matchesSpanShow || matchesServiceShow;
      }

      return true;
    });
  }, [traces, traceFilters, spanFilters, serviceFilters, attributeFilters]);

  useEffect(() => {
    onFilterChange(filteredTraces);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredTraces]);

  return (
    <div className="filter-sidebar">
      <div className="filter-section">
        <div className="filter-section-header">
          Traces ({traceNames.length})
        </div>
        <div className="filter-search-container">
          <input
            type="text"
            placeholder="Search traces..."
            value={traceSearch}
            onChange={(e) => setTraceSearch(e.target.value)}
            onKeyDown={handleTraceSearchKeyDown}
            className="filter-search-input"
          />
        </div>
        <div className="filter-items">
          {filteredTraceNames.map((name, index) => {
            const state = traceFilters.get(name) || "neutral";
            const isSelected = index === traceSelectedIndex;
            return (
              <div
                key={name}
                ref={(el) => {
                  if (el) traceItemRefs.current.set(index, el);
                  else traceItemRefs.current.delete(index);
                }}
                className={`filter-item filter-${state} ${isSelected ? "selected" : ""}`}
                onClick={() => toggleTraceName(name)}
              >
                <span className="filter-icon">
                  {state === "neutral" && "○"}
                  {state === "show" && "✓"}
                  {state === "hide" && "✕"}
                </span>
                <span className="filter-name" title={name}>
                  {name}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="filter-section">
        <div className="filter-section-header">Spans ({spanNames.length})</div>
        <div className="filter-search-container">
          <input
            type="text"
            placeholder="Search spans..."
            value={spanSearch}
            onChange={(e) => setSpanSearch(e.target.value)}
            onKeyDown={handleSpanSearchKeyDown}
            className="filter-search-input"
          />
        </div>
        <div className="filter-items">
          {filteredSpanNames.map((name, index) => {
            const state = spanFilters.get(name) || "neutral";
            const isSelected = index === spanSelectedIndex;
            return (
              <div
                key={name}
                ref={(el) => {
                  if (el) spanItemRefs.current.set(index, el);
                  else spanItemRefs.current.delete(index);
                }}
                className={`filter-item filter-${state} ${isSelected ? "selected" : ""}`}
                onClick={() => toggleSpanName(name)}
              >
                <span className="filter-icon">
                  {state === "neutral" && "○"}
                  {state === "show" && "✓"}
                  {state === "hide" && "✕"}
                </span>
                <span className="filter-name" title={name}>
                  {name}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="filter-section">
        <div className="filter-section-header">
          Services ({serviceNames.length})
        </div>
        <div className="filter-search-container">
          <input
            type="text"
            placeholder="Search services..."
            value={serviceSearch}
            onChange={(e) => setServiceSearch(e.target.value)}
            onKeyDown={handleServiceSearchKeyDown}
            className="filter-search-input"
          />
        </div>
        <div className="filter-items">
          {filteredServiceNames.map((name, index) => {
            const state = serviceFilters.get(name) || "neutral";
            const isSelected = index === serviceSelectedIndex;
            return (
              <div
                key={name}
                ref={(el) => {
                  if (el) serviceItemRefs.current.set(index, el);
                  else serviceItemRefs.current.delete(index);
                }}
                className={`filter-item filter-${state} ${isSelected ? "selected" : ""}`}
                onClick={() => toggleServiceName(name)}
              >
                <span className="filter-icon">
                  {state === "neutral" && "○"}
                  {state === "show" && "✓"}
                  {state === "hide" && "✕"}
                </span>
                <span className="filter-name" title={name}>
                  {name}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
