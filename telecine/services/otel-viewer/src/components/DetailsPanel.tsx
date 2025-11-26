import { useState, useEffect } from "react";
import type { Span } from "../hooks/useTraceData";
import type { AttributeFilter } from "./FilterSidebar";
import { formatDuration } from "../utils/format";
import { AttributeValue } from "./AttributeValue";
import { getAttributeValueAsString } from "./FilterSidebar";

interface DetailsPanelProps {
  span: Span | null | undefined;
  onClose: () => void;
  onAddAttributeFilter?: (filter: AttributeFilter) => void;
}

export function DetailsPanel({
  span,
  onClose,
  onAddAttributeFilter,
}: DetailsPanelProps) {
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    attributeKey: string;
    attributeValue: any;
  } | null>(null);
  const [expandedEvents, setExpandedEvents] = useState<Set<number>>(new Set());

  useEffect(() => {
    const handleGlobalClick = () => {
      if (contextMenu) {
        setContextMenu(null);
      }
    };

    if (contextMenu) {
      document.addEventListener("click", handleGlobalClick);
      return () => document.removeEventListener("click", handleGlobalClick);
    }
  }, [contextMenu]);

  if (!span) {
    return null;
  }

  const handleAttributeClick = (
    e: React.MouseEvent,
    key: string,
    value: any,
  ) => {
    if (!onAddAttributeFilter) return;

    e.stopPropagation();

    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      attributeKey: key,
      attributeValue: value,
    });
  };

  const handleAddFilter = (
    condition: AttributeFilter["condition"],
    mode: AttributeFilter["mode"],
  ) => {
    if (!contextMenu || !onAddAttributeFilter) return;

    const valueStr = getAttributeValueAsString(contextMenu.attributeValue);

    onAddAttributeFilter({
      spanName: span.name,
      attributeKey: contextMenu.attributeKey,
      condition,
      value:
        condition === "equals" || condition === "notEquals"
          ? valueStr
          : undefined,
      mode,
    });

    setContextMenu(null);
  };

  const handleCloseMenu = () => {
    setContextMenu(null);
  };

  return (
    <>
      <div className="details-panel visible" onClick={handleCloseMenu}>
        <div className="detail-header">
          <div className="detail-title">Span Details</div>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="detail-section">
          <div className="detail-title">Name</div>
          <div className="detail-value">{span.name}</div>
        </div>
        <div className="detail-section">
          <div className="detail-row">
            <span className="detail-key">Duration</span>
            <span className="detail-val">
              {formatDuration(Number(span.duration))}
            </span>
          </div>
          <div className="detail-row">
            <span className="detail-key">Service</span>
            <span className="detail-val">{span.serviceName}</span>
          </div>
          <div className="detail-row">
            <span className="detail-key">Span ID</span>
            <span className="detail-val">{span.spanId}</span>
          </div>
        </div>
        {span.events.length > 0 && (
          <div className="detail-section">
            <div className="detail-title">Events ({span.events.length})</div>
            {span.events.map((evt, i) => {
              const isExpanded = expandedEvents.has(i);
              const isException = evt.name === "exception";
              const exceptionType = evt.attributes.find(
                (a) => a.key === "exception.type",
              )?.value;
              const exceptionMessage = evt.attributes.find(
                (a) => a.key === "exception.message",
              )?.value;
              const exceptionStacktrace = evt.attributes.find(
                (a) => a.key === "exception.stacktrace",
              )?.value;

              return (
                <div
                  key={i}
                  className={`event-item ${isException ? "exception-event" : ""} ${isExpanded ? "expanded" : ""}`}
                  onClick={() => {
                    setExpandedEvents((prev) => {
                      const next = new Set(prev);
                      if (next.has(i)) {
                        next.delete(i);
                      } else {
                        next.add(i);
                      }
                      return next;
                    });
                  }}
                >
                  <div className="event-name">{evt.name}</div>
                  {isException && exceptionType && (
                    <div className="exception-type">
                      <AttributeValue value={exceptionType} />
                    </div>
                  )}
                  {isException && exceptionMessage && (
                    <div className="exception-message">
                      <AttributeValue value={exceptionMessage} />
                    </div>
                  )}
                  {isException && exceptionStacktrace && (
                    <pre className="exception-stacktrace">
                      <AttributeValue value={exceptionStacktrace} />
                    </pre>
                  )}
                  {!isException && evt.attributes.length > 0 && (
                    <div className="event-attrs">
                      {evt.attributes.map((attr, j) => (
                        <div key={j} className="detail-attr-row">
                          <div className="detail-key">{attr.key}</div>
                          <div className="detail-val">
                            <AttributeValue value={attr.value} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {span.attributes.length > 0 && (
          <div className="detail-section">
            <div className="detail-title">Attributes</div>
            <div className="detail-attrs-list">
              {span.attributes.map((attr, i) => (
                <div
                  key={i}
                  className="detail-attr-item clickable-attr"
                  onClick={(e) => handleAttributeClick(e, attr.key, attr.value)}
                >
                  <span className="detail-attr-key">{attr.key}</span>
                  <span className="detail-attr-sep">=</span>
                  <span className="detail-attr-val">
                    <AttributeValue value={attr.value} />
                  </span>
                  {onAddAttributeFilter && (
                    <span className="filter-hint">⚡</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      {contextMenu && (
        <>
          <div
            className="attr-context-menu-anchor"
            style={
              {
                left: contextMenu.x,
                top: contextMenu.y,
                anchorName: "--context-menu-anchor",
              } as React.CSSProperties
            }
          />
          <div
            className="attr-context-menu"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="attr-context-menu-header">
              Add filter for <strong>{contextMenu.attributeKey}</strong>
            </div>
            <div className="attr-context-menu-section">
              <div className="attr-context-menu-label">
                Show traces where...
              </div>
              <button
                className="attr-context-menu-item show"
                onClick={() => handleAddFilter("exists", "show")}
              >
                ✓ Has value
              </button>
              <button
                className="attr-context-menu-item show"
                onClick={() => handleAddFilter("equals", "show")}
              >
                ✓ Equals "
                {getAttributeValueAsString(contextMenu.attributeValue)}"
              </button>
            </div>
            <div className="attr-context-menu-section">
              <div className="attr-context-menu-label">
                Hide traces where...
              </div>
              <button
                className="attr-context-menu-item hide"
                onClick={() => handleAddFilter("missing", "hide")}
              >
                ✕ Missing/null
              </button>
              <button
                className="attr-context-menu-item hide"
                onClick={() => handleAddFilter("equals", "hide")}
              >
                ✕ Equals "
                {getAttributeValueAsString(contextMenu.attributeValue)}"
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
