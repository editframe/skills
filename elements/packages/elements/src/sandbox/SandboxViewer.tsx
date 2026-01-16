import React, { useEffect, useState, useRef, useCallback } from "react";
import type { SandboxConfig, ScenarioResult, Assertion, Scenario, ScenarioType } from "./index.js";
import { runScenario, runAllScenarios as runAllScenariosRunner } from "./ScenarioRunner.js";
import type { TemplateResult } from "lit";
import { render as litRender } from "lit";
import { PlaybackControls } from "./PlaybackControls.js";
import type { EFTimegroup } from "../elements/EFTimegroup.js";

interface SandboxViewerProps {
  sandboxName: string;
  sandboxConfig: SandboxConfig | null;
}

/**
 * Extract metadata from a scenario definition
 */
function getScenarioMeta(scenarios: SandboxConfig["scenarios"], name: string): {
  description?: string;
  type: ScenarioType;
} {
  const def = scenarios[name];
  if (typeof def === "function") {
    return { type: "scenario" };
  }
  return {
    description: (def as Scenario).description,
    type: (def as Scenario).type ?? "scenario",
  };
}

/**
 * Component to display assertions from a scenario run
 */
function AssertionsDisplay({ assertions }: { assertions: Assertion[] }) {
  if (assertions.length === 0) return null;

  const passedCount = assertions.filter(a => a.passed).length;
  const failedCount = assertions.length - passedCount;

  return (
    <div style={{
      marginTop: "4px",
      padding: "4px 6px",
      background: "#f8fafc",
      borderRadius: "2px",
      fontSize: "10px",
    }}>
      <div style={{
        fontWeight: 500,
        marginBottom: "4px",
        color: failedCount > 0 ? "#991b1b" : "#065f46",
      }}>
        Assertions: {passedCount} passed{failedCount > 0 ? `, ${failedCount} failed` : ""}
      </div>
      <div style={{ maxHeight: "100px", overflowY: "auto" }}>
        {assertions.map((assertion, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "4px",
              marginBottom: "2px",
              color: assertion.passed ? "#065f46" : "#991b1b",
              fontFamily: "monospace",
            }}
          >
            <span style={{ flexShrink: 0 }}>{assertion.passed ? "✓" : "✗"}</span>
            <span style={{ wordBreak: "break-word" }}>{assertion.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SandboxViewer({ sandboxName, sandboxConfig }: SandboxViewerProps) {
  const [scenarioResults, setScenarioResults] = useState<Map<string, ScenarioResult>>(new Map());
  const [runningScenario, setRunningScenario] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [timegroup, setTimegroup] = useState<EFTimegroup | null>(null);
  const [playbackMode, setPlaybackMode] = useState<"auto" | "step">("auto");
  const containerRef = useRef<HTMLDivElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  // Detect timegroup in preview container
  const detectTimegroup = useCallback(() => {
    if (!previewContainerRef.current) return;
    
    // Look for ef-timegroup elements
    const timegroupElement = previewContainerRef.current.querySelector("ef-timegroup") as EFTimegroup | null;
    setTimegroup(timegroupElement);
  }, []);

  useEffect(() => {
    // Don't render the sandbox template when scenarios are running
    // Scenarios build their own DOM, and the template interferes with isolation
    // The template is only for visual preview when not running scenarios
    if (sandboxConfig && previewContainerRef.current && runningScenario === null) {
      // Render the sandbox template using Lit's render function into a container
      // React doesn't handle custom elements well, so we render into a div ref
      // and let Lit manage the DOM inside it
      const container = previewContainerRef.current;
      container.innerHTML = ""; // Clear previous content
      setTimegroup(null); // Reset timegroup
      
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
          
          // Detect timegroup after render (with a small delay to allow custom elements to initialize)
          requestAnimationFrame(() => {
            detectTimegroup();
          });
        }
      } catch (err) {
        console.error("Failed to render sandbox template:", err);
        setError(`Failed to render sandbox: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }, [sandboxConfig, runningScenario, detectTimegroup]);

  const runScenarioHandler = async (scenarioName: string) => {
    if (!sandboxConfig) return;

    const container = containerRef.current;
    if (!container) {
      setError("Container element not found");
      return;
    }

    setRunningScenario(scenarioName);
    setError(null);
    setLogs([]);

    try {
      const result = await runScenario(
        sandboxConfig,
        scenarioName,
        container,
        {
          onLog: (message) => {
            setLogs((prev) => [...prev, message]);
          },
        }
      );

      setScenarioResults((prev) => {
        const next = new Map(prev);
        next.set(scenarioName, result);
        return next;
      });

      if (result.error) {
        setError(result.error.message);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      const errorResult: ScenarioResult = {
        name: scenarioName,
        status: "error",
        durationMs: 0,
        error: {
          message: errorMessage,
          stack: err instanceof Error ? err.stack : undefined,
        },
      };
      setScenarioResults((prev) => {
        const next = new Map(prev);
        next.set(scenarioName, errorResult);
        return next;
      });
    } finally {
      setRunningScenario(null);
    }
  };

  const runAllScenariosHandler = async () => {
    if (!sandboxConfig) return;

    const container = containerRef.current;
    if (!container) {
      setError("Container element not found");
      return;
    }

    setRunningScenario("__all__");
    setError(null);
    setLogs([]);

    try {
      const results = await runAllScenariosRunner(
        sandboxConfig,
        container,
        {
          onLog: (message) => {
            setLogs((prev) => [...prev, message]);
          },
        }
      );

      const resultsMap = new Map<string, ScenarioResult>();
      for (const result of results) {
        resultsMap.set(result.name, result);
      }
      setScenarioResults(resultsMap);

      const failedResults = results.filter(r => r.status === "failed" || r.status === "error");
      if (failedResults.length > 0) {
        setError(`${failedResults.length} scenario(s) failed`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
    } finally {
      setRunningScenario(null);
    }
  };

  if (!sandboxConfig) {
    return <div>Loading sandbox...</div>;
  }

  const scenarioNames = Object.keys(sandboxConfig.scenarios);
  
  // Separate scenarios from validations
  const mainScenarios = scenarioNames.filter(name => 
    getScenarioMeta(sandboxConfig.scenarios, name).type === "scenario"
  );
  const validations = scenarioNames.filter(name => 
    getScenarioMeta(sandboxConfig.scenarios, name).type === "validation"
  );
  
  // State for collapsing validations section
  const [validationsExpanded, setValidationsExpanded] = useState(false);

  // Helper to render a single scenario card
  const renderScenarioCard = (name: string) => {
    const result = scenarioResults.get(name);
    const isRunning = runningScenario === name;
    const meta = getScenarioMeta(sandboxConfig.scenarios, name);
    
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
        {meta.description && (
          <div style={{ fontSize: "10px", color: "#6b7280", marginBottom: "4px", fontStyle: "italic" }}>
            {meta.description}
          </div>
        )}
        {result && (
          <div style={{ fontSize: "10px", color: "#6b7280", marginBottom: "2px" }}>
            {result.durationMs.toFixed(2)}ms
          </div>
        )}
        {result?.assertions && result.assertions.length > 0 && (
          <AssertionsDisplay assertions={result.assertions} />
        )}
        <button
          onClick={() => runScenarioHandler(name)}
          disabled={isRunning}
          style={{
            width: "100%",
            padding: "3px",
            marginTop: result?.assertions?.length ? "4px" : "0",
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
  };

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
        <div style={{ width: "280px", display: "flex", flexDirection: "column", background: "#f9fafb" }}>
          <div style={{ padding: "4px 6px", borderBottom: "1px solid #e5e7eb", fontWeight: 600, fontSize: "11px" }}>
            Scenarios ({mainScenarios.length}){validations.length > 0 && ` + ${validations.length} validations`}
          </div>
          <div style={{ flex: 1, overflow: "auto", padding: "6px 8px" }}>
            {scenarioNames.length === 0 ? (
              <div style={{ padding: "8px", color: "#6b7280", textAlign: "center", fontSize: "11px" }}>
                No scenarios defined
              </div>
            ) : (
              <>
                <button
                  onClick={runAllScenariosHandler}
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
                
                {/* Main scenarios */}
                {mainScenarios.map(renderScenarioCard)}
                
                {/* Validations section (collapsible) */}
                {validations.length > 0 && (
                  <div style={{ marginTop: "8px" }}>
                    <button
                      onClick={() => setValidationsExpanded(!validationsExpanded)}
                      style={{
                        width: "100%",
                        padding: "4px 6px",
                        background: "#f3f4f6",
                        border: "1px solid #e5e7eb",
                        borderRadius: "2px",
                        cursor: "pointer",
                        fontSize: "10px",
                        fontWeight: 500,
                        color: "#6b7280",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <span>Validations ({validations.length})</span>
                      <span>{validationsExpanded ? "▼" : "▶"}</span>
                    </button>
                    {validationsExpanded && (
                      <div style={{ marginTop: "4px" }}>
                        {validations.map(renderScenarioCard)}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Playback Controls - show when timegroup is detected */}
      {timegroup && (
        <PlaybackControls
          timegroup={timegroup}
          mode={playbackMode}
          onModeChange={setPlaybackMode}
        />
      )}

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
