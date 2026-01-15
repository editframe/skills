import React, { useEffect, useState, useRef } from "react";
import type { SandboxConfig, ScenarioResult } from "./index.js";
import { SandboxContext } from "./SandboxContext.js";
import type { TemplateResult } from "lit";
import { render as litRender } from "lit";

interface SandboxViewerProps {
  sandboxName: string;
  sandboxConfig: SandboxConfig | null;
}

export function SandboxViewer({ sandboxName, sandboxConfig }: SandboxViewerProps) {
  const [scenarioResults, setScenarioResults] = useState<Map<string, ScenarioResult>>(new Map());
  const [runningScenario, setRunningScenario] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (sandboxConfig && previewContainerRef.current) {
      // Render the sandbox template using Lit's render function into a container
      // React doesn't handle custom elements well, so we render into a div ref
      // and let Lit manage the DOM inside it
      const container = previewContainerRef.current;
      container.innerHTML = ""; // Clear previous content
      
      try {
        const templateResult = sandboxConfig.render();
        if (templateResult && typeof templateResult === "object" && "strings" in templateResult) {
          // Render using Lit's render function
          // This will create the custom elements and manage their lifecycle
          litRender(templateResult, container);
          
          // Call setup if provided
          if (sandboxConfig.setup) {
            sandboxConfig.setup(container);
          }
        }
      } catch (err) {
        console.error("Failed to render sandbox template:", err);
        setError(`Failed to render sandbox: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }, [sandboxConfig]);

  const runScenario = async (scenarioName: string) => {
    if (!sandboxConfig) return;

    const scenario = sandboxConfig.scenarios[scenarioName];
    if (!scenario) {
      setError(`Scenario "${scenarioName}" not found`);
      return;
    }

    setRunningScenario(scenarioName);
    setError(null);
    setLogs([]);

    const startTime = performance.now();
    const result: ScenarioResult = {
      name: scenarioName,
      status: "passed",
      durationMs: 0,
    };

    try {
      const container = containerRef.current;
      if (!container) {
        throw new Error("Container element not found");
      }

      const ctx = new SandboxContext(container, (log) => {
        setLogs((prev) => [...prev, log]);
      });

      await scenario(ctx);

      result.durationMs = performance.now() - startTime;
      result.status = "passed";
    } catch (err) {
      result.durationMs = performance.now() - startTime;
      result.status = "error";
      result.error = {
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      };
      setError(result.error.message);
    } finally {
      setRunningScenario(null);
      setScenarioResults((prev) => {
        const next = new Map(prev);
        next.set(scenarioName, result);
        return next;
      });
    }
  };

  const runAllScenarios = async () => {
    if (!sandboxConfig) return;

    const scenarioNames = Object.keys(sandboxConfig.scenarios);
    for (const name of scenarioNames) {
      await runScenario(name);
    }
  };

  if (!sandboxConfig) {
    return <div>Loading sandbox...</div>;
  }

  const scenarioNames = Object.keys(sandboxConfig.scenarios);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* Header */}
      <div style={{ padding: "6px 8px", background: "#1f2937", color: "white", borderBottom: "1px solid #374151" }}>
        <h1 style={{ margin: 0, fontSize: "14px", fontWeight: 600 }}>{sandboxConfig.name}</h1>
        {sandboxConfig.description && (
          <div style={{ marginTop: "2px", color: "#d1d5db", fontSize: "11px" }}>
            {sandboxConfig.description}
          </div>
        )}
      </div>

      {/* Main content */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Preview panel */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", borderRight: "1px solid #e5e7eb" }}>
          <div style={{ padding: "4px 6px", background: "#f9fafb", borderBottom: "1px solid #e5e7eb", fontWeight: 600, fontSize: "11px" }}>
            Preview
          </div>
          <div
            ref={previewContainerRef}
            id="sandbox-container"
            style={{ flex: 1, padding: "8px", overflow: "auto", background: "white" }}
          />
        </div>

        {/* Scenarios panel */}
        <div style={{ width: "250px", display: "flex", flexDirection: "column", background: "#f9fafb" }}>
          <div style={{ padding: "4px 6px", borderBottom: "1px solid #e5e7eb", fontWeight: 600, fontSize: "11px" }}>
            Scenarios
          </div>
          <div style={{ flex: 1, overflow: "auto", padding: "6px 8px" }}>
            {scenarioNames.length === 0 ? (
              <div style={{ padding: "8px", color: "#6b7280", textAlign: "center", fontSize: "11px" }}>
                No scenarios defined
              </div>
            ) : (
              <>
                <button
                  onClick={runAllScenarios}
                  disabled={runningScenario !== null}
                  style={{
                    width: "100%",
                    padding: "4px",
                    marginBottom: "4px",
                    background: "#3b82f6",
                    color: "white",
                    border: "none",
                    borderRadius: "2px",
                    cursor: runningScenario ? "not-allowed" : "pointer",
                    opacity: runningScenario ? 0.5 : 1,
                    fontSize: "11px",
                  }}
                >
                  Run All
                </button>
                {scenarioNames.map((name) => {
                  const result = scenarioResults.get(name);
                  const isRunning = runningScenario === name;
                  return (
                    <div
                      key={name}
                      style={{
                        padding: "4px 6px",
                        marginBottom: "2px",
                        background: "white",
                        border: "1px solid #e5e7eb",
                        borderRadius: "2px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2px" }}>
                        <span style={{ fontWeight: 500, fontSize: "11px" }}>{name}</span>
                        {result && (
                          <span
                            style={{
                              fontSize: "10px",
                              padding: "1px 4px",
                              borderRadius: "2px",
                              background:
                                result.status === "passed"
                                  ? "#d1fae5"
                                  : result.status === "failed"
                                  ? "#fee2e2"
                                  : "#fef3c7",
                              color:
                                result.status === "passed"
                                  ? "#065f46"
                                  : result.status === "failed"
                                  ? "#991b1b"
                                  : "#92400e",
                            }}
                          >
                            {result.status === "passed" ? "✓" : result.status === "failed" ? "✗" : "⚠"}
                          </span>
                        )}
                      </div>
                      {result && (
                        <div style={{ fontSize: "10px", color: "#6b7280", marginBottom: "2px" }}>
                          {result.durationMs.toFixed(2)}ms
                        </div>
                      )}
                      <button
                        onClick={() => runScenario(name)}
                        disabled={isRunning}
                        style={{
                          width: "100%",
                          padding: "3px",
                          background: "#3b82f6",
                          color: "white",
                          border: "none",
                          borderRadius: "2px",
                          cursor: isRunning ? "not-allowed" : "pointer",
                          opacity: isRunning ? 0.5 : 1,
                          fontSize: "10px",
                        }}
                      >
                        {isRunning ? "Running..." : "Run"}
                      </button>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Error panel */}
      {error && (
        <div
          style={{
            padding: "6px 8px",
            background: "#fee2e2",
            color: "#991b1b",
            borderTop: "1px solid #fecaca",
            maxHeight: "120px",
            overflow: "auto",
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: "4px", fontSize: "11px" }}>Error</div>
          <div style={{ fontSize: "10px", fontFamily: "monospace" }}>{error}</div>
        </div>
      )}

      {/* Logs panel */}
      {logs.length > 0 && (
        <div
          style={{
            padding: "6px 8px",
            background: "#f9fafb",
            borderTop: "1px solid #e5e7eb",
            maxHeight: "100px",
            overflow: "auto",
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: "4px", fontSize: "11px" }}>Logs</div>
          {logs.map((log, i) => (
            <div key={i} style={{ fontSize: "10px", color: "#374151", marginBottom: "2px", fontFamily: "monospace" }}>
              {log}
            </div>
          ))}
        </div>
      )}

      {/* Hidden container for scenario execution */}
      <div ref={containerRef} style={{ display: "none" }} />
    </div>
  );
}
