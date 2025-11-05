import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useSearchParams } from "react-router";
import { useTraceData, type Trace } from "../hooks/useTraceData";
import { usePages } from "../hooks/usePages";
import { Toolbar } from "./Toolbar";
import { TraceList } from "./TraceList";
import { FlameChart } from "./FlameChart";
import { DetailsPanel } from "./DetailsPanel";
import { TraceDetailsPanel } from "./TraceDetailsPanel";
import { Minimap } from "./Minimap";
import { FilterSidebar, parseAttributeFiltersFromUrl, updateUrlWithAttributeFilters, type AttributeFilter } from "./FilterSidebar";
import { AttributeFilterBar } from "./AttributeFilterBar";
import { PageTabs } from "./PageTabs";
import { LogsPanel } from "./LogsPanel";
import { SpanFilterBar, type SpanFilter } from "./SpanFilterBar";
import "./TraceViewer.css";

export function TraceViewer() {
  const { status, spans, totalSpanCount, traces, clearData } = useTraceData();
  const [searchParams, setSearchParams] = useSearchParams();
  const { pages, currentPage, selectPage, createPage, renamePage, deletePage, updateCurrentPageFilters } = usePages(searchParams, setSearchParams);
  const [zoomStart, setZoomStart] = useState(0);
  const [zoomEnd, setZoomEnd] = useState(100);
  const [filteredTraces, setFilteredTraces] = useState<Trace[]>([]);
  const [attributeFilters, setAttributeFilters] = useState<AttributeFilter[]>(() =>
    parseAttributeFiltersFromUrl(searchParams)
  );
  const [hoveredLogIndex, setHoveredLogIndex] = useState<number | null>(null);
  const [expandedLogs, setExpandedLogs] = useState<Set<number>>(new Set());
  const [sidebarWidth, setSidebarWidth] = useState(200);
  const [rightPanelWidth, setRightPanelWidth] = useState(300);
  const [logsPanelHeight, setLogsPanelHeight] = useState(200);
  const [logSearchText, setLogSearchText] = useState("");
  const [logSearchMode, setLogSearchMode] = useState<'highlight' | 'filter'>('highlight');
  const [spanFilters, setSpanFilters] = useState<SpanFilter[]>(() => {
    try {
      return JSON.parse(searchParams.get("spanFilters") || "[]");
    } catch {
      return [];
    }
  });
  const [spanFiltersActive, setSpanFiltersActive] = useState(() =>
    searchParams.get("spanFiltersActive") === "true"
  );
  const logSearchInputRef = useRef<HTMLInputElement>(null);
  const autoSelectLatest = searchParams.get("live") === "true";
  const isFocusMode = searchParams.get("focus") === "true";

  const throttledSetHoveredLogIndex = useCallback((index: number | null) => {
    setHoveredLogIndex(index);
  }, []);

  const handleLogExpand = useCallback((index: number) => {
    setExpandedLogs(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  const handleAddSpanFilter = useCallback((filter: SpanFilter) => {
    const newFilters = [...spanFilters, filter];
    setSpanFilters(newFilters);
    const params = new URLSearchParams(searchParams);
    params.set("spanFilters", JSON.stringify(newFilters));
    setSearchParams(params);
  }, [spanFilters, searchParams, setSearchParams]);

  const handleRemoveSpanFilter = useCallback((index: number) => {
    const newFilters = spanFilters.filter((_, i) => i !== index);
    setSpanFilters(newFilters);
    const params = new URLSearchParams(searchParams);
    if (newFilters.length > 0) {
      params.set("spanFilters", JSON.stringify(newFilters));
    } else {
      params.delete("spanFilters");
    }
    setSearchParams(params);
  }, [spanFilters, searchParams, setSearchParams]);

  const handleUpdateSpanFilter = useCallback((index: number, filter: SpanFilter) => {
    const newFilters = [...spanFilters];
    newFilters[index] = filter;
    setSpanFilters(newFilters);
    const params = new URLSearchParams(searchParams);
    params.set("spanFilters", JSON.stringify(newFilters));
    setSearchParams(params);
  }, [spanFilters, searchParams, setSearchParams]);

  const handleToggleSpanFiltersActive = useCallback(() => {
    const newActive = !spanFiltersActive;
    setSpanFiltersActive(newActive);
    const params = new URLSearchParams(searchParams);
    if (newActive) {
      params.set("spanFiltersActive", "true");
    } else {
      params.delete("spanFiltersActive");
    }
    setSearchParams(params);
  }, [spanFiltersActive, searchParams, setSearchParams]);

  const spanFiltersMap = useMemo(() => {
    const map = new Map<string, 'show' | 'hide'>();
    spanFilters.forEach(filter => {
      map.set(filter.spanName, filter.mode);
    });
    return map;
  }, [spanFilters]);

  const handleZoomChange = useCallback((start: number, end: number) => {
    setZoomStart(start);
    setZoomEnd(end);
  }, []);

  const handleFilterChange = useCallback((filtered: Trace[]) => {
    setFilteredTraces(filtered);
  }, []);

  const handleAddAttributeFilter = useCallback((filter: AttributeFilter) => {
    const newFilters = [...attributeFilters, filter];
    setAttributeFilters(newFilters);
    const params = updateUrlWithAttributeFilters(searchParams, newFilters);
    setSearchParams(params);
  }, [attributeFilters, searchParams, setSearchParams]);

  const handleRemoveAttributeFilter = useCallback((index: number) => {
    const newFilters = attributeFilters.filter((_, i) => i !== index);
    setAttributeFilters(newFilters);
    const params = updateUrlWithAttributeFilters(searchParams, newFilters);
    setSearchParams(params);
  }, [attributeFilters, searchParams, setSearchParams]);

  const handleUpdateAttributeFilter = useCallback((index: number, filter: AttributeFilter) => {
    const newFilters = [...attributeFilters];
    newFilters[index] = filter;
    setAttributeFilters(newFilters);
    const params = updateUrlWithAttributeFilters(searchParams, newFilters);
    setSearchParams(params);
  }, [attributeFilters, searchParams, setSearchParams]);

  useEffect(() => {
    const newFilters = parseAttributeFiltersFromUrl(searchParams);
    setAttributeFilters(newFilters);
  }, [searchParams.get("pageId"), searchParams.get("attrFilters")]);

  useEffect(() => {
    try {
      const newFilters = JSON.parse(searchParams.get("spanFilters") || "[]");
      setSpanFilters(newFilters);
    } catch {
      setSpanFilters([]);
    }
    setSpanFiltersActive(searchParams.get("spanFiltersActive") === "true");
  }, [searchParams.get("pageId"), searchParams.get("spanFilters"), searchParams.get("spanFiltersActive")]);

  const { spanNames, spanAttributeKeys } = useMemo(() => {
    const spanNameSet = new Set<string>();
    const attributeKeysBySpan = new Map<string, Set<string>>();

    traces.forEach(trace => {
      trace.allSpans.forEach(span => {
        spanNameSet.add(span.name);

        if (!attributeKeysBySpan.has(span.name)) {
          attributeKeysBySpan.set(span.name, new Set());
        }
        const keys = attributeKeysBySpan.get(span.name)!;
        span.attributes.forEach(attr => {
          keys.add(attr.key);
        });
      });
    });

    const spanAttributeKeysMap = new Map<string, string[]>();
    attributeKeysBySpan.forEach((keys, spanName) => {
      spanAttributeKeysMap.set(spanName, Array.from(keys).sort());
    });

    return {
      spanNames: Array.from(spanNameSet).sort(),
      spanAttributeKeys: spanAttributeKeysMap
    };
  }, [traces]);

  const traceId = searchParams.get("traceId");
  const spanId = searchParams.get("spanId");

  const tracesToUse = isFocusMode ? traces : filteredTraces;
  const currentTrace = traceId
    ? tracesToUse.find((t) => t.traceId === traceId) || tracesToUse[0]
    : tracesToUse[0];

  useEffect(() => {
    if (currentTrace && !traceId) {
      setSearchParams({ traceId: currentTrace.traceId });
    }
  }, [currentTrace, traceId, setSearchParams]);

  useEffect(() => {
    if (autoSelectLatest && filteredTraces.length > 0) {
      const latestTrace = filteredTraces[0];
      if (latestTrace && latestTrace.traceId !== traceId) {
        const params = new URLSearchParams(searchParams);
        params.set("traceId", latestTrace.traceId);
        params.delete("spanId");
        setSearchParams(params);
      }
    }
  }, [autoSelectLatest, filteredTraces, traceId, searchParams, setSearchParams]);

  useEffect(() => {
    setZoomStart(0);
    setZoomEnd(100);
  }, [traceId]);

  useEffect(() => {
    const preventBrowserZoom = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
      }
    };

    document.addEventListener('wheel', preventBrowserZoom, { passive: false });

    return () => {
      document.removeEventListener('wheel', preventBrowserZoom);
    };
  }, []);

  const handleSelectTrace = (newTraceId: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("traceId", newTraceId);
    params.delete("spanId");
    setSearchParams(params);
  };

  const handleSelectSpan = (newSpanId: string) => {
    const params = new URLSearchParams(searchParams);
    if (traceId) {
      params.set("traceId", traceId);
    }
    params.set("spanId", newSpanId);
    setSearchParams(params);
  };

  const handleCloseSpan = () => {
    const params = new URLSearchParams(searchParams);
    params.delete("spanId");
    setSearchParams(params);
  };

  const handleToggleAutoSelect = () => {
    const params = new URLSearchParams(searchParams);
    if (autoSelectLatest) {
      params.delete("live");
    } else {
      params.set("live", "true");
    }
    setSearchParams(params);
  };

  const handleToggleFocusMode = () => {
    const params = new URLSearchParams(searchParams);
    if (isFocusMode) {
      params.delete("focus");
    } else {
      params.set("focus", "true");
    }
    setSearchParams(params);
  };

  const handleOpenInNewTab = () => {
    const params = new URLSearchParams(searchParams);
    params.set("focus", "true");
    const url = `${window.location.pathname}?${params.toString()}`;
    window.open(url, '_blank');
  };

  useEffect(() => {
    updateCurrentPageFilters();
  }, [
    searchParams.get("traceShow"),
    searchParams.get("traceHide"),
    searchParams.get("spanShow"),
    searchParams.get("spanHide"),
    searchParams.get("serviceShow"),
    searchParams.get("serviceHide"),
    searchParams.get("attrFilters"),
    searchParams.get("spanFilters"),
    searchParams.get("spanFiltersActive"),
    updateCurrentPageFilters
  ]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        clearData();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'l') {
        e.preventDefault();
        if (e.shiftKey) {
          handleToggleAutoSelect();
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'h') {
        e.preventDefault();
        setLogSearchMode('highlight');
        logSearchInputRef.current?.focus();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        setLogSearchMode('filter');
        logSearchInputRef.current?.focus();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'j') {
        e.preventDefault();
        handleToggleSpanFiltersActive();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        if (e.shiftKey) {
          handleOpenInNewTab();
        } else {
          handleToggleFocusMode();
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        createPage();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '[') {
        e.preventDefault();
        const currentIndex = pages.findIndex((p: any) => p.id === currentPage?.id);
        if (currentIndex > 0) {
          const prevPage = pages[currentIndex - 1];
          if (prevPage) selectPage(prevPage);
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === ']') {
        e.preventDefault();
        const currentIndex = pages.findIndex((p: any) => p.id === currentPage?.id);
        if (currentIndex < pages.length - 1) {
          const nextPage = pages[currentIndex + 1];
          if (nextPage) selectPage(nextPage);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [clearData, handleToggleAutoSelect, handleToggleFocusMode, handleOpenInNewTab, createPage, pages, currentPage, selectPage, handleToggleSpanFiltersActive]);

  return (
    <div className="trace-viewer">
      {!isFocusMode && (
        <>
          <Toolbar
            status={status}
            totalSpanCount={totalSpanCount}
            traceCount={traces.length}
            onClear={clearData}
            autoSelectLatest={autoSelectLatest}
            onToggleAutoSelect={handleToggleAutoSelect}
            pageTabs={
              <PageTabs
                currentPage={currentPage || null}
                pages={pages}
                onPageSelect={selectPage}
                onPageCreate={createPage}
                onPageRename={renamePage}
                onPageDelete={deletePage}
              />
            }
          />
          <AttributeFilterBar
            attributeFilters={attributeFilters}
            onAddFilter={handleAddAttributeFilter}
            onRemoveFilter={handleRemoveAttributeFilter}
            onUpdateFilter={handleUpdateAttributeFilter}
            spanNames={spanNames}
            spanAttributeKeys={spanAttributeKeys}
          />
          <SpanFilterBar
            spanFilters={spanFilters}
            onAddFilter={handleAddSpanFilter}
            onRemoveFilter={handleRemoveSpanFilter}
            onUpdateFilter={handleUpdateSpanFilter}
            spanNames={spanNames}
            filtersActive={spanFiltersActive}
            onToggleFiltersActive={handleToggleSpanFiltersActive}
          />
        </>
      )}
      <div className="content" style={{ height: isFocusMode ? '100vh' : 'calc(100vh - 36px - 44px - 44px)' }}>
        {!isFocusMode && (
          <div className="filter-sidebar" style={{ width: `${sidebarWidth}px` }}>
            <FilterSidebar
              traces={traces}
              onFilterChange={handleFilterChange}
              searchParams={searchParams}
              setSearchParams={setSearchParams}
              attributeFilters={attributeFilters}
            />
          </div>
        )}
        {!isFocusMode && <ResizeHandle
          direction="horizontal"
          onResize={(delta) => setSidebarWidth(Math.max(150, Math.min(400, sidebarWidth + delta)))}
        />}
        <div className="main-content" style={{ flex: 1 }}>
          {isFocusMode ? (
            <div className="focus-toolbar">
              <div className="focus-toolbar-left">
                <span className="focus-trace-name">{currentTrace?.allSpans[0]?.name || 'Trace'}</span>
                <span className="focus-trace-id">{currentTrace?.traceId.substring(0, 16)}</span>
              </div>
              <button onClick={handleToggleFocusMode} title="Exit focus mode">
                <span>Exit Focus</span>
                <kbd className="kbd-shortcut">⌘F</kbd>
              </button>
            </div>
          ) : (
            <>
              <TraceList
                traces={filteredTraces}
                selectedTrace={traceId}
                onSelectTrace={handleSelectTrace}
              />
              <div className="trace-toolbar">
                <button onClick={handleToggleFocusMode} title="Focus on this trace">
                  <span>Focus</span>
                  <kbd className="kbd-shortcut">⌘F</kbd>
                </button>
                <button onClick={handleOpenInNewTab} title="Open in new tab">
                  <span>Open in Tab</span>
                  <kbd className="kbd-shortcut">⌘⇧F</kbd>
                </button>
              </div>
            </>
          )}
          <div className="flame-chart-container">
            <Minimap
              trace={currentTrace}
              zoomStart={zoomStart}
              zoomEnd={zoomEnd}
              onZoomChange={handleZoomChange}
              hoveredLogIndex={hoveredLogIndex}
              onLogHover={throttledSetHoveredLogIndex}
            />
            <FlameChart
              trace={currentTrace}
              onSelectSpan={handleSelectSpan}
              zoomStart={zoomStart}
              zoomEnd={zoomEnd}
              onZoomChange={handleZoomChange}
              hoveredLogIndex={hoveredLogIndex}
              onLogHover={throttledSetHoveredLogIndex}
              isLiveMode={autoSelectLatest}
              spanFilters={spanFiltersMap}
              spanFiltersActive={spanFiltersActive}
            />
          </div>
          {currentTrace && currentTrace.logs && currentTrace.logs.length > 0 && (<>
            <ResizeHandle
              direction="vertical"
              onResize={(delta) => setLogsPanelHeight(Math.max(100, Math.min(500, logsPanelHeight - delta)))}
            />
            <LogsPanel
              logs={currentTrace.logs}
              hoveredLogIndex={hoveredLogIndex}
              expandedLogs={expandedLogs}
              onLogHover={throttledSetHoveredLogIndex}
              onLogExpand={handleLogExpand}
              panelHeight={logsPanelHeight}
              searchText={logSearchText}
              searchMode={logSearchMode}
              onSearchTextChange={setLogSearchText}
              onSearchModeChange={setLogSearchMode}
              searchInputRef={logSearchInputRef}
            />
          </>)}
        </div>
        <ResizeHandle
          direction="horizontal"
          onResize={(delta) => setRightPanelWidth(Math.max(250, Math.min(500, rightPanelWidth - delta)))}
        />
        <div className="right-panels" style={{ width: isFocusMode ? '400px' : `${rightPanelWidth}px` }}>
          <TraceDetailsPanel trace={currentTrace} />
          <DetailsPanel
            span={spanId ? spans.get(spanId) : null}
            onClose={handleCloseSpan}
            onAddAttributeFilter={handleAddAttributeFilter}
          />
        </div>
      </div>
    </div>
  );
}

interface ResizeHandleProps {
  direction: 'horizontal' | 'vertical';
  onResize: (delta: number) => void;
}

function ResizeHandle({ direction, onResize }: ResizeHandleProps) {
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = direction === 'horizontal' ? e.movementX : e.movementY;
      onResize(delta);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, direction, onResize]);

  return (
    <div
      className={`resize-handle resize-handle-${direction} ${isDragging ? 'dragging' : ''}`}
      onMouseDown={() => setIsDragging(true)}
    />
  );
}
