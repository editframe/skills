import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { render as litRender } from "lit";
import type { TemplateResult } from "lit";
import type { SandboxConfig, ScenarioResult } from "./index.js";
import { SandboxContext } from "./SandboxContext.js";

@customElement("sandbox-viewer")
export class SandboxViewer extends LitElement {
  @property({ type: String })
  sandboxName = "";

  @property({ type: String })
  sandboxFilePath = "";

  @property({ attribute: false })
  sandboxConfig: SandboxConfig | null = null;

  @state()
  private scenarioResults: Map<string, ScenarioResult> = new Map();

  @state()
  private runningScenario: string | null = null;

  @state()
  private error: string | null = null;

  @state()
  private logs: string[] = [];

  private containerElement: HTMLElement | null = null;

  static styles = css`
    :host {
      display: block;
      height: 100vh;
      display: flex;
      flex-direction: column;
      font-family: system-ui, -apple-system, sans-serif;
    }

    .header {
      padding: 16px;
      background: #1f2937;
      color: white;
      border-bottom: 1px solid #374151;
    }

    .header h1 {
      margin: 0;
      font-size: 20px;
      font-weight: 600;
    }

    .header .description {
      margin-top: 4px;
      font-size: 14px;
      color: #9ca3af;
    }

    .main {
      flex: 1;
      display: flex;
      overflow: hidden;
    }

    .sidebar {
      width: 300px;
      background: #f9fafb;
      border-right: 1px solid #e5e7eb;
      overflow-y: auto;
      padding: 16px;
    }

    .sidebar h2 {
      margin: 0 0 12px 0;
      font-size: 16px;
      font-weight: 600;
    }

    .scenario-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .scenario-item {
      padding: 8px 12px;
      margin-bottom: 4px;
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 4px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .scenario-item:hover {
      background: #f3f4f6;
    }

    .scenario-item.running {
      background: #dbeafe;
    }

    .status-icon {
      width: 16px;
      height: 16px;
      flex-shrink: 0;
    }

    .status-icon.passed {
      color: #10b981;
    }

    .status-icon.failed {
      color: #ef4444;
    }

    .scenario-name {
      flex: 1;
      font-size: 14px;
    }

    .run-all-btn {
      width: 100%;
      padding: 8px;
      margin-top: 12px;
      background: #3b82f6;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 500;
    }

    .run-all-btn:hover {
      background: #2563eb;
    }

    .content {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .preview {
      flex: 1;
      padding: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #ffffff;
      overflow: auto;
    }

    .preview-container {
      min-width: 400px;
      min-height: 300px;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 24px;
      background: white;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .error-panel {
      padding: 16px;
      background: #fef2f2;
      border-top: 1px solid #fee2e2;
      max-height: 200px;
      overflow-y: auto;
    }

    .error-panel h3 {
      margin: 0 0 8px 0;
      font-size: 14px;
      font-weight: 600;
      color: #991b1b;
    }

    .error-message {
      font-family: monospace;
      font-size: 12px;
      color: #7f1d1d;
      white-space: pre-wrap;
    }

    .logs-panel {
      padding: 16px;
      background: #f9fafb;
      border-top: 1px solid #e5e7eb;
      max-height: 150px;
      overflow-y: auto;
      font-family: monospace;
      font-size: 12px;
    }

    .logs-panel h3 {
      margin: 0 0 8px 0;
      font-size: 14px;
      font-weight: 600;
    }

    .log-entry {
      margin-bottom: 4px;
      color: #374151;
    }
  `;

  async connectedCallback(): Promise<void> {
    super.connectedCallback();
    
    // If sandboxConfig is already set (e.g., from the TypeScript entry file),
    // we're done. Otherwise, fetch from API (though this won't work for functions).
    if (!this.sandboxConfig) {
      await this.loadSandbox();
    }
  }

  private async loadSandbox(): Promise<void> {
    if (!this.sandboxFilePath || !this.sandboxName) {
      this.error = "No sandbox file path or name provided";
      return;
    }

    try {
      // Fetch the sandbox config from the API
      // This is a fallback for when sandboxConfig isn't set directly
      const response = await fetch(`/_sandbox/api/${this.sandboxName}/config`);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch sandbox config: ${response.statusText} - ${errorText}`);
      }
      
      const data = await response.json();
      
      // Note: Functions can't be serialized in JSON, so we can't use data.config.render
      // This path is only used as a fallback. The main path sets sandboxConfig directly
      // from the imported module in the TypeScript entry file.
      this.error = "Sandbox config must be set directly from imported module (functions can't be serialized)";
    } catch (err) {
      this.error = `Failed to load sandbox: ${err instanceof Error ? err.message : String(err)}`;
      console.error("Failed to load sandbox:", err);
    }
  }

  private async runScenario(scenarioName: string): Promise<void> {
    if (!this.sandboxConfig) return;

    const scenario = this.sandboxConfig.scenarios[scenarioName];
    if (!scenario) {
      this.error = `Scenario "${scenarioName}" not found`;
      return;
    }

    this.runningScenario = scenarioName;
    this.logs = [];
    this.error = null;

    const startTime = Date.now();
    let result: ScenarioResult;

    try {
      if (!this.containerElement) {
        throw new Error("Container element not found");
      }

      const ctx = new SandboxContext(this.containerElement);
      
      // Run the scenario
      await scenario(ctx);

      const durationMs = Date.now() - startTime;
      result = {
        name: scenarioName,
        status: "passed",
        durationMs,
      };
    } catch (err) {
      const durationMs = Date.now() - startTime;
      const error = err instanceof Error ? err : new Error(String(err));
      
      result = {
        name: scenarioName,
        status: "failed",
        durationMs,
        error: {
          message: error.message,
          stack: error.stack,
        },
      };
    } finally {
      this.runningScenario = null;
    }

    this.scenarioResults.set(scenarioName, result);
    this.requestUpdate();
  }

  private async runAllScenarios(): Promise<void> {
    if (!this.sandboxConfig) return;

    const scenarioNames = Object.keys(this.sandboxConfig.scenarios);
    for (const name of scenarioNames) {
      await this.runScenario(name);
    }
  }

  private getStatusIcon(status: ScenarioResult["status"]): string {
    switch (status) {
      case "passed":
        return "✓";
      case "failed":
      case "error":
        return "✗";
      default:
        return "";
    }
  }

  private renderPreview(): TemplateResult {
    if (!this.sandboxConfig) {
      return html`<div>Loading sandbox...</div>`;
    }

    return html`
      <div class="preview-container" id="sandbox-container">
        ${this.sandboxConfig.render()}
      </div>
    `;
  }

  private renderErrorPanel(): TemplateResult | null {
    const failedResults = Array.from(this.scenarioResults.values()).filter(
      (r) => r.status === "failed" || r.status === "error",
    );

    if (failedResults.length === 0 && !this.error) {
      return null;
    }

    return html`
      <div class="error-panel">
        <h3>Errors</h3>
        ${this.error
          ? html`<div class="error-message">${this.error}</div>`
          : failedResults.map(
              (result) => html`
                <div class="error-message">
                  <strong>${result.name}:</strong> ${result.error?.message || "Unknown error"}
                  ${result.error?.stack
                    ? html`<pre>${result.error.stack}</pre>`
                    : ""}
                </div>
              `,
            )}
      </div>
    `;
  }

  render() {
    if (!this.sandboxConfig) {
      return html`<div>Loading sandbox...</div>`;
    }

    const scenarioNames = Object.keys(this.sandboxConfig.scenarios);

    return html`
      <div class="header">
        <h1>${this.sandboxConfig.name}</h1>
        ${this.sandboxConfig.description
          ? html`<div class="description">${this.sandboxConfig.description}</div>`
          : ""}
      </div>

      <div class="main">
        <div class="sidebar">
          <h2>Scenarios</h2>
          <ul class="scenario-list">
            ${scenarioNames.map(
              (name) => {
                const result = this.scenarioResults.get(name);
                const isRunning = this.runningScenario === name;
                return html`
                  <li
                    class="scenario-item ${isRunning ? "running" : ""}"
                    @click=${() => this.runScenario(name)}
                  >
                    <span
                      class="status-icon ${result?.status || ""}"
                      title=${result?.status || "not run"}
                    >
                      ${result ? this.getStatusIcon(result.status) : "○"}
                    </span>
                    <span class="scenario-name">${name}</span>
                    ${result
                      ? html`<span style="font-size: 12px; color: #6b7280;">
                          (${result.durationMs}ms)
                        </span>`
                      : ""}
                  </li>
                `;
              },
            )}
          </ul>
          <button class="run-all-btn" @click=${() => this.runAllScenarios()}>
            Run All
          </button>
        </div>

        <div class="content">
          <div class="preview">${this.renderPreview()}</div>
          ${this.renderErrorPanel()}
          ${this.logs.length > 0
            ? html`
                <div class="logs-panel">
                  <h3>Logs</h3>
                  ${this.logs.map((log) => html`<div class="log-entry">${log}</div>`)}
                </div>
              `
            : ""}
        </div>
      </div>
    `;
  }

  updated(changedProperties: Map<string | number | symbol, unknown>): void {
    super.updated(changedProperties);
    
    // Render the sandbox content into the container after update
    if (changedProperties.has("sandboxConfig") && this.sandboxConfig) {
      const container = this.shadowRoot?.getElementById("sandbox-container");
      if (container) {
        this.containerElement = container as HTMLElement;
        // Re-render the sandbox template
        litRender(this.sandboxConfig.render(), container);
      }
    }
  }
}
