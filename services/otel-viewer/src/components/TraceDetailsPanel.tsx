import { useState } from "react";
import type { Trace } from "../hooks/useTraceData";
import { formatDuration } from "../utils/format";
import { AttributeValue } from "./AttributeValue";

interface TraceDetailsPanelProps {
  trace: Trace | undefined;
}

export function TraceDetailsPanel({ trace }: TraceDetailsPanelProps) {
  const [expandedErrors, setExpandedErrors] = useState<Set<string>>(new Set());
  if (!trace) {
    return null;
  }

  const errors = trace.allSpans.filter((s) => s.isError);
  const services = Array.from(new Set(trace.allSpans.map((s) => s.serviceName))).sort();
  const startTime = new Date(Number(trace.minTime / 1_000_000n));

  return (
    <div className="trace-details-panel">
      <div className="detail-section">
        <div className="detail-title">Trace</div>
        <div className="detail-row">
          <span className="detail-key">ID</span>
          <span className="detail-val">{trace.traceId.substring(0, 16)}</span>
        </div>
        <div className="detail-row">
          <span className="detail-key">Started</span>
          <span className="detail-val">{startTime.toLocaleTimeString()}</span>
        </div>
        <div className="detail-row">
          <span className="detail-key">Duration</span>
          <span className="detail-val">{formatDuration(Number(trace.duration))}</span>
        </div>
        <div className="detail-row">
          <span className="detail-key">Spans</span>
          <span className="detail-val">{trace.allSpans.length}</span>
        </div>
      </div>

      <div className="detail-section">
        <div className="detail-title">Services ({services.length})</div>
        {services.map((service) => (
          <div key={service} className="detail-value">
            {service}
          </div>
        ))}
      </div>

      {errors.length > 0 && (
        <div className="detail-section error-section">
          <div className="detail-title">Errors ({errors.length})</div>
          {errors.map((span) => {
            const isExpanded = expandedErrors.has(span.spanId);
            const exceptionEvents = span.events.filter((evt) => evt.name === "exception");
            const errorAttrs = span.attributes.filter(
              (attr) =>
                attr.key.includes("error") ||
                attr.key.includes("exception")
            );

            return (
              <div
                key={span.spanId}
                className={`error-item ${isExpanded ? 'expanded' : ''}`}
                onClick={() => {
                  setExpandedErrors(prev => {
                    const next = new Set(prev);
                    if (next.has(span.spanId)) {
                      next.delete(span.spanId);
                    } else {
                      next.add(span.spanId);
                    }
                    return next;
                  });
                }}
              >
                <div className="error-item-header">
                  <div className="error-span-name">{span.name}</div>
                  <div className="error-service">{span.serviceName}</div>
                  <div className="error-time">
                    {formatDuration(Number(span.duration))}
                  </div>
                  <div className="error-toggle">{isExpanded ? '−' : '+'}</div>
                </div>
                {exceptionEvents.map((evt, i) => {
                  const exceptionType = evt.attributes.find((a) => a.key === "exception.type")?.value;
                  const exceptionMessage = evt.attributes.find((a) => a.key === "exception.message")?.value;
                  const exceptionStacktrace = evt.attributes.find((a) => a.key === "exception.stacktrace")?.value;

                  return (
                    <div key={i} className="exception-details">
                      {exceptionType && (
                        <div className="error-attr">
                          <div className="detail-key">Type</div>
                          <div className="detail-val">
                            <AttributeValue value={exceptionType} />
                          </div>
                        </div>
                      )}
                      {exceptionMessage && (
                        <div className="error-attr">
                          <div className="detail-key">Message</div>
                          <div className="detail-val">
                            <AttributeValue value={exceptionMessage} />
                          </div>
                        </div>
                      )}
                      {exceptionStacktrace && (
                        <div className="error-attr">
                          <div className="detail-key">Stack Trace</div>
                          <pre className="detail-val exception-stacktrace">
                            <AttributeValue value={exceptionStacktrace} />
                          </pre>
                        </div>
                      )}
                    </div>
                  );
                })}
                {errorAttrs.map((attr, i) => (
                  <div key={i} className="error-attr">
                    <div className="detail-key">{attr.key}</div>
                    <div className="detail-val">
                      <AttributeValue value={attr.value} />
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

