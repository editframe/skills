import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useNavigate, useSearchParams, useParams } from "react-router";
import type { SandboxConfig, ScenarioResult, Scenario, ScenarioType, Assertion } from "../index.js";
import { runScenario as runScenarioRunner } from "../ScenarioRunner.js";
import type { TemplateResult } from "lit";
import { ProfileViewer } from "./ProfileViewer.js";
import type { CPUProfile } from "./types.js";

// Import generic tree component
import "@editframe/elements/gui/tree/EFTree.js";
import "@editframe/elements/gui/tree/EFTreeItem.js";
import type { TreeItem } from "@editframe/elements";

interface SandboxInfo {
  name: string;
  filePath: string;
  elementName: string;
  category?: string | null;
  subcategory?: string | null;
}

interface SandboxRelationships {
  elementTag: string | null;
  uses: string[];
  usedBy: string[];
}

/**
 * Collapse folders that have only one child (recursively)
 */
function collapseSingleItemFolders(items: TreeItem[]): TreeItem[] {
  return items.flatMap(item => {
    if (!item.children || item.children.length === 0) {
      return [item];
    }
    
    // Recursively collapse children first
    const collapsedChildren = collapseSingleItemFolders(item.children);
    
    // If there's only one child, collapse this folder
    if (collapsedChildren.length === 1) {
      const child = collapsedChildren[0]!;
      const childData = child.data as any;
      const itemData = item.data as any;
      
      // If child is also a folder, merge them into a single folder node
      if (childData?.type === "folder") {
        const mergedPath = itemData.path ? `${itemData.path}/${childData.path}` : childData.path;
        return [{
          ...child,
          id: item.id,
          label: `${item.label}/${child.label}`,
          data: {
            ...childData,
            path: mergedPath,
            collapsed: true,
          },
        }];
      } else {
        // Child is a sandbox, flatten: return the sandbox directly with merged label
        return [{
          ...child,
          label: `${item.label}/${child.label}`,
          data: {
            ...childData,
            collapsed: true,
          },
        }];
      }
    }
    
    // Multiple children, keep folder structure
    return [{
      ...item,
      children: collapsedChildren,
    }];
  });
}

/**
 * Build a tree structure from sandbox list, grouping by category and subcategory.
 * Uses explicit category/subcategory fields instead of parsing file paths.
 */
function buildSandboxTree(sandboxes: SandboxInfo[]): TreeItem[] {
  // Group sandboxes by category, then by subcategory
  const sandboxesByCategory = new Map<string, Map<string, SandboxInfo[]>>();
  
  for (const sandbox of sandboxes) {
    const category = sandbox.category || "uncategorized";
    const subcategory = sandbox.subcategory || null;
    
    if (!sandboxesByCategory.has(category)) {
      sandboxesByCategory.set(category, new Map());
    }
    
    const subcategoryMap = sandboxesByCategory.get(category)!;
    const subcategoryKey = subcategory || "";
    
    if (!subcategoryMap.has(subcategoryKey)) {
      subcategoryMap.set(subcategoryKey, []);
    }
    
    subcategoryMap.get(subcategoryKey)!.push(sandbox);
  }
  
  const rootItems: TreeItem[] = [];
  
  // Map category to user-friendly label
  const categoryLabels: Record<string, string> = {
    elements: "Elements",
    gui: "GUI",
    demos: "Demos",
    test: "Test",
  };
  
  // Map subcategory to user-friendly label
  const subcategoryLabels: Record<string, Record<string, string>> = {
    elements: {
      media: "Media",
      temporal: "Temporal",
      text: "Text",
      visualization: "Visualization",
    },
    gui: {
      controls: "Controls",
      timeline: "Timeline",
      hierarchy: "Hierarchy",
      preview: "Preview",
      canvas: "Canvas",
      config: "Config",
    },
    demos: {
      workbench: "Workbench",
      compactness: "Compactness",
    },
  };
  
  // Process each category
  for (const [category, subcategoryMap] of Array.from(sandboxesByCategory.entries()).sort()) {
    const categoryChildren: TreeItem[] = [];
    
    // Process each subcategory within this category
    for (const [subcategoryKey, subcategorySandboxes] of Array.from(subcategoryMap.entries()).sort()) {
      // Create sandbox items for this subcategory
      const sandboxItems: TreeItem[] = subcategorySandboxes.map((sandbox) => ({
        id: `sandbox:${sandbox.name}`,
        label: sandbox.name,
        data: { type: "sandbox", name: sandbox.name, sandbox },
      }));
      
      // Sort sandbox items alphabetically
      sandboxItems.sort((a, b) => a.label.localeCompare(b.label));
      
      if (subcategoryKey) {
        // Has subcategory - create subcategory node
        const subcategoryLabel = subcategoryLabels[category]?.[subcategoryKey] || 
          subcategoryKey.charAt(0).toUpperCase() + subcategoryKey.slice(1);
        
        const subcategoryItem: TreeItem = {
          id: `subcategory:${category}:${subcategoryKey}`,
          label: subcategoryLabel,
          icon: "📁",
          children: sandboxItems,
          data: { type: "subcategory", category, subcategory: subcategoryKey },
        };
        
        categoryChildren.push(subcategoryItem);
      } else {
        // No subcategory - add sandboxes directly to category
        categoryChildren.push(...sandboxItems);
      }
    }
    
    // Collapse single-item folders within this category
    const collapsedCategoryChildren = collapseSingleItemFolders(categoryChildren);
    
    // Create category node
    const categoryLabel = categoryLabels[category] || category.charAt(0).toUpperCase() + category.slice(1);
    const categoryItem: TreeItem = {
      id: `category:${category}`,
      label: categoryLabel,
      icon: "📂",
      children: collapsedCategoryChildren,
      data: { type: "category", category },
    };
    
    // Sort category children
    sortTreeItems(collapsedCategoryChildren);
    
    rootItems.push(categoryItem);
  }
  
  // Sort categories by priority (most common use cases first)
  const categoryOrder: Record<string, number> = {
    "Elements": 1,
    "GUI": 2,
    "Demos": 3,
    "Test": 4,
  };
  
  rootItems.sort((a, b) => {
    const aOrder = categoryOrder[a.label] || 999;
    const bOrder = categoryOrder[b.label] || 999;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return a.label.localeCompare(b.label);
  });
  
  return rootItems;
}

/**
 * Sort tree items: folders first (alphabetically), then files (alphabetically)
 */
function sortTreeItems(items: TreeItem[]): void {
  items.sort((a, b) => {
    const aData = a.data as any;
    const bData = b.data as any;
    const aIsFolder = aData?.type === "folder";
    const bIsFolder = bData?.type === "folder";
    
    // Folders come first
    if (aIsFolder && !bIsFolder) return -1;
    if (!aIsFolder && bIsFolder) return 1;
    
    // Alphabetical within same type
    return a.label.localeCompare(b.label);
  });
  
  // Recursively sort children
  for (const item of items) {
    if (item.children && item.children.length > 0) {
      sortTreeItems(item.children);
    }
  }
}

/**
 * Component to render sandbox list as a tree with folder structure.
 * Uses ef-tree web component from @editframe/elements.
 */
function SandboxTree({ 
  sandboxes, 
  selectedSandboxName,
  onNavigate
}: { 
  sandboxes: SandboxInfo[]; 
  selectedSandboxName: string | null;
  onNavigate: (sandboxName: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const treeRef = useRef<HTMLElement | null>(null);
  const treeItems = useMemo(() => buildSandboxTree(sandboxes), [sandboxes]);
  
  // Create and mount ef-tree using Lit render
  // Note: We use Lit here because ef-tree is a web component, but we manage it React-style
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    // If treeItems is empty, don't render anything (but don't clear - let React handle it)
    if (treeItems.length === 0) {
      return;
    }
    
    let isCancelled = false;
    let currentTreeElement: HTMLElement | null = null;
    
    // Import lit for rendering
    import("lit").then(({ html, render }) => {
      // Check if effect was cancelled or container changed before rendering
      if (isCancelled || !containerRef.current || containerRef.current !== container) {
        return;
      }
      
      // Render the ef-tree with items
      render(
        html`
          <ef-tree
            .items=${treeItems}
            .selectedId=${selectedSandboxName ? `sandbox:${selectedSandboxName}` : null}
            expand-all
            style="
              --tree-bg: transparent;
              --tree-text: #f0f6fc;
              --tree-hover-bg: #21262d;
              --tree-selected-bg: rgba(88, 166, 255, 0.2);
              --tree-item-height: 26px;
              --tree-item-font-size: 12px;
              --tree-indent: 12px;
            "
            @tree-select=${(e: CustomEvent) => {
              console.log("[SandboxTree] tree-select received", e.detail);
              const detail = e.detail;
              const itemData = detail.item?.data as { type: string; name?: string } | undefined;
              
              // Only navigate for sandbox items, not folders
              if (itemData?.type === "sandbox" && itemData.name) {
                console.log("[SandboxTree] Navigating to sandbox", itemData.name);
                onNavigate(itemData.name);
              }
            }}
          ></ef-tree>
        `,
        container
      );
      
      // Store ref to tree element
      currentTreeElement = container.querySelector("ef-tree");
      treeRef.current = currentTreeElement;
    }).catch((err) => {
      console.error("[SandboxTree] Failed to render tree:", err);
    });
    
    return () => {
      // Mark as cancelled to prevent rendering after cleanup
      isCancelled = true;
      // Don't manually clear the container - let React handle the DOM
      // The container will be managed by React's ref system
      currentTreeElement = null;
      treeRef.current = null;
    };
  }, [treeItems, selectedSandboxName, onNavigate]);
  
  if (sandboxes.length === 0) {
    return (
      <div style={{ padding: "12px", color: "#8b949e", textAlign: "center", fontSize: "12px" }}>
        Loading sandboxes...
      </div>
    );
  }
  
  return <div ref={containerRef} style={{ flex: 1 }} />;
}

type ScenarioCategory = "demonstration" | "theming" | "internals" | "performance";

/**
 * Extract metadata from a scenario definition
 */
function getScenarioMeta(scenarios: SandboxConfig["scenarios"], name: string): {
  description?: string;
  type: ScenarioType;
  category: ScenarioCategory;
} {
  const def = scenarios[name];
  if (typeof def === "function") {
    return { type: "scenario", category: "demonstration" };
  }
  const scenario = def as Scenario;
  return {
    description: scenario.description,
    type: scenario.type ?? "scenario",
    category: (scenario as any).category ?? "demonstration",
  };
}

/**
 * Component to render a collapsible group of scenarios by category
 */
function ScenarioCategoryGroup({
  category,
  categoryLabel,
  scenarios,
  selectedScenario,
  runningScenario,
  scenarioResults,
  sandboxConfig,
  onSelectScenario,
  defaultExpanded,
}: {
  category: ScenarioCategory;
  categoryLabel: string;
  scenarios: string[];
  selectedScenario: string | null;
  runningScenario: string | null;
  scenarioResults: Map<string, ScenarioResult>;
  sandboxConfig: SandboxConfig | null;
  onSelectScenario: (name: string) => void;
  defaultExpanded: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  
  // Count scenarios in this category
  const categoryCounts = useMemo(() => {
    let passed = 0;
    let failed = 0;
    let running = 0;
    
    scenarios.forEach((name) => {
      const result = scenarioResults.get(name);
      if (runningScenario === name) {
        running++;
      } else if (result) {
        if (result.status === "passed") {
          passed++;
        } else if (result.status === "failed" || result.status === "error") {
          failed++;
        }
      }
    });
    
    return { passed, failed, running, total: scenarios.length };
  }, [scenarios, scenarioResults, runningScenario]);
  
  // Category-specific badges
  const categoryBadges: Record<ScenarioCategory, string | null> = {
    demonstration: "📽️",
    theming: "🎨",
    internals: "⚙️",
    performance: "⚡",
  };
  
  const badge = categoryBadges[category];
  
  return (
    <div style={{ marginBottom: "8px" }}>
      {/* Category header */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: "6px 8px",
          background: expanded ? "#21262d" : "transparent",
          borderRadius: "4px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: "11px",
          fontWeight: 500,
          color: "#8b949e",
          marginBottom: "2px",
        }}
        onMouseEnter={(e) => {
          if (!expanded) {
            e.currentTarget.style.background = "#21262d";
          }
        }}
        onMouseLeave={(e) => {
          if (!expanded) {
            e.currentTarget.style.background = "transparent";
          }
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px", flex: 1 }}>
          <span style={{ fontSize: "10px" }}>{expanded ? "▼" : "▶"}</span>
          <span>{categoryLabel}</span>
          {badge && <span style={{ fontSize: "10px" }} title={category === "theming" ? "CSS controls available" : category === "performance" ? "Auto-profiling enabled" : ""}>{badge}</span>}
          <span style={{ fontSize: "10px", opacity: 0.7 }}>({categoryCounts.total})</span>
        </div>
        <div style={{ display: "flex", gap: "4px", fontSize: "9px" }}>
          {categoryCounts.passed > 0 && (
            <span style={{ color: "#238636" }}>✓{categoryCounts.passed}</span>
          )}
          {categoryCounts.failed > 0 && (
            <span style={{ color: "#da3633" }}>✗{categoryCounts.failed}</span>
          )}
          {categoryCounts.running > 0 && (
            <span style={{ color: "#58a6ff" }}>⟳{categoryCounts.running}</span>
          )}
        </div>
      </div>
      
      {/* Scenarios list (collapsible) */}
      {expanded && (
        <div style={{ paddingLeft: "16px" }}>
          {scenarios.map((name) => {
            const result = scenarioResults.get(name);
            const isSelected = selectedScenario === name;
            const isRunning = runningScenario === name;
            const meta = sandboxConfig ? getScenarioMeta(sandboxConfig.scenarios, name) : { type: "scenario" as ScenarioType, category: "demonstration" as ScenarioCategory };
            const isValidation = meta.type === "validation";
            
            return (
              <div
                key={name}
                onClick={() => onSelectScenario(name)}
                style={{
                  padding: "8px 10px",
                  marginBottom: "2px",
                  background: isSelected ? "#21262d" : "transparent",
                  borderRadius: "4px",
                  cursor: "pointer",
                  border: isSelected ? "1px solid #58a6ff" : "1px solid transparent",
                  transition: "all 0.1s",
                  opacity: isValidation && !isSelected ? 0.7 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = "#21262d";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = "transparent";
                  }
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2px" }}>
                  <span style={{ 
                    fontWeight: isSelected ? 600 : 400, 
                    color: isSelected ? "#58a6ff" : "#f0f6fc",
                    fontSize: "12px",
                    flex: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap"
                  }}>
                    {isValidation && <span style={{ color: "#8b949e", marginRight: "4px" }} title="Validation">◇</span>}
                    {name}
                  </span>
                  {result && (
                    <span
                      style={{
                        fontSize: "10px",
                        padding: "1px 4px",
                        borderRadius: "3px",
                        background:
                          result.status === "passed"
                            ? "#238636"
                            : result.status === "failed"
                            ? "#da3633"
                            : "#bf8700",
                        color: "white",
                        marginLeft: "6px",
                        flexShrink: 0,
                        fontWeight: 500,
                      }}
                    >
                      {result.status === "passed" ? "✓" : result.status === "failed" ? "✗" : "⚠"}
                    </span>
                  )}
                  {isRunning && (
                    <span style={{ marginLeft: "6px", color: "#8b949e", fontSize: "10px", flexShrink: 0 }}>
                      ⟳
                    </span>
                  )}
                </div>
                {/* Description if available */}
                {meta.description && (
                  <div style={{ fontSize: "10px", color: "#8b949e", marginBottom: "2px", fontStyle: "italic", lineHeight: "1.3" }}>
                    {meta.description}
                  </div>
                )}
                {/* Always reserve space for timing */}
                <div style={{ fontSize: "10px", color: "#8b949e", height: "12px" }}>
                  {result ? `${result.durationMs.toFixed(0)}ms` : ""}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Component to display assertions from a scenario run
 */
function AssertionsDisplay({ assertions }: { assertions: Assertion[] }) {
  const [expanded, setExpanded] = useState(false);
  
  if (assertions.length === 0) return null;

  const passedCount = assertions.filter(a => a.passed).length;
  const failedCount = assertions.length - passedCount;

  // Default: show ~4-5 lines worth (about 70px), expanded: show all with larger max
  const collapsedHeight = "70px";
  const expandedHeight = "300px";

  return (
    <div style={{
      padding: "8px 10px",
      background: "#161b22",
      borderRadius: "4px",
      fontSize: "11px",
      border: "1px solid #30363d",
    }}>
      <div 
        onClick={() => setExpanded(!expanded)}
        style={{
          fontWeight: 500,
          marginBottom: "6px",
          color: failedCount > 0 ? "#ffa198" : "#7ee787",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span>Assertions: {passedCount} passed{failedCount > 0 ? `, ${failedCount} failed` : ""}</span>
        <span style={{ color: "#8b949e", fontSize: "10px" }}>{expanded ? "▼ collapse" : "▶ expand"}</span>
      </div>
      <div style={{ 
        maxHeight: expanded ? expandedHeight : collapsedHeight, 
        overflowY: "auto",
        transition: "max-height 0.2s ease-in-out",
      }}>
        {assertions.map((assertion, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "6px",
              marginBottom: "3px",
              color: assertion.passed ? "#7ee787" : "#ffa198",
              fontFamily: "monospace",
              fontSize: "10px",
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

// TypeScript declarations for exposed profiling functions (injected by ef open)
declare global {
  interface Window {
    __startProfiling?: (optionsJson?: string) => Promise<string>;
    __stopProfiling?: () => Promise<string>;
    __resetProfiling?: () => Promise<string>;
  }
}

// Check if profiling is available via exposed functions (from ef open)
const isProfilingAvailable = () => typeof window.__startProfiling === "function";

interface ScenarioViewerProps {
  /**
   * Optional sandbox loaders map for dev-server specific glob loading.
   * If provided, uses these loaders instead of API-only loading.
   */
  sandboxLoaders?: Record<string, () => Promise<unknown>>;
}

export function ScenarioViewer({ sandboxLoaders }: ScenarioViewerProps = {}) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const params = useParams<{ "*"?: string }>();
  
  // Parse path from catch-all: /sandbox/* where * = "" | ":sandboxName" | ":sandboxName/:scenarioName"
  const pathParts = (params["*"] || "").split("/").filter(Boolean);
  const urlSandboxName = pathParts[0] || null;
  const urlScenarioName = pathParts[1] || null;
  
  const [sandboxName, setSandboxName] = useState<string | null>(null);
  const [sandboxConfig, setSandboxConfig] = useState<SandboxConfig | null>(null);
  const [sandboxList, setSandboxList] = useState<Array<{ name: string; filePath: string; elementName: string; category?: string | null; subcategory?: string | null }>>([]);
  const [scenarioResults, setScenarioResults] = useState<Map<string, ScenarioResult>>(new Map());
  const [runningScenario, setRunningScenario] = useState<string | null>(null);
  const [scenarioErrors, setScenarioErrors] = useState<Map<string, string>>(new Map());
  const [scenarioLogs, setScenarioLogs] = useState<Map<string, string[]>>(new Map());
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
  const [containerKeys, setContainerKeys] = useState<Map<string, number>>(new Map());
  const previewContainerRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const scenarioElementRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [isControlled, setIsControlled] = useState(false);
  const [profilingEnabled, setProfilingEnabled] = useState(false);
  const [profilingFunctionsAvailable, setProfilingFunctionsAvailable] = useState(false);
  const [sandboxLoadError, setSandboxLoadError] = useState<string | null>(null);
  const [isLoadingSandbox, setIsLoadingSandbox] = useState(false);
  const [relationships, setRelationships] = useState<SandboxRelationships | null>(null);
  const [allRelationships, setAllRelationships] = useState<Record<string, SandboxRelationships>>({});
  const sandboxListLoadedRef = useRef(false);
  const sandboxListLoadingRef = useRef(false);

  // Client-side navigation helper using React Router
  // Uses path-based routing: /sandbox/:sandboxName/:scenarioName
  const navigateToSandbox = useCallback((targetSandbox: string, targetScenario?: string) => {
    // Build the path
    let path = `/sandbox/${encodeURIComponent(targetSandbox)}`;
    if (targetScenario) {
      path += `/${encodeURIComponent(targetScenario)}`;
    }
    
    // Preserve query params (controlled, profile, sessionId)
    const preservedParams = new URLSearchParams();
    if (searchParams.get("controlled")) {
      preservedParams.set("controlled", searchParams.get("controlled")!);
    }
    if (searchParams.get("profile")) {
      preservedParams.set("profile", searchParams.get("profile")!);
    }
    if (searchParams.get("sessionId")) {
      preservedParams.set("sessionId", searchParams.get("sessionId")!);
    }
    
    const queryString = preservedParams.toString();
    navigate(queryString ? `${path}?${queryString}` : path, { replace: false });
  }, [navigate, searchParams]);

  const loadSandbox = useCallback(async (name: string) => {
    setIsLoadingSandbox(true);
    setSandboxLoadError(null);
    setSandboxConfig(null);
    
    try {
      // Track components are already pre-loaded at module load time via preloadTracks.js
      // No need to pre-load here - they're already in the module cache
      
      // Fetch the sandbox config from the API to get the filePath
      const response = await fetch(`/sandbox/api/${name}/config`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errorData.error || `Failed to fetch sandbox config: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Use sandboxLoaders if provided (dev-server glob loading), otherwise use API-only loading
      if (sandboxLoaders && sandboxLoaders[data.filePath]) {
        // Use the pre-loaded sandbox module from import.meta.glob
        // The API returns filePath in format @editframe/elements/...
        const loader = sandboxLoaders[data.filePath];
        if (!loader) {
          throw new Error(`Sandbox loader not found for ${data.filePath}`);
        }
        const module = await loader();
        const config = (module as any).default || module;
        
        if (config && typeof config.render === "function") {
          setSandboxConfig(config as SandboxConfig);
          setSandboxLoadError(null);
        } else {
          throw new Error("Invalid sandbox config: missing render function");
        }
      } else {
        // Fallback: use the @editframe/elements alias directly via dynamic import
        // This handles cases where sandboxLoaders doesn't have the sandbox, or when
        // sandboxLoaders is not provided (production mode)
        // Vite should resolve this alias correctly (configured in vite.config)
        // The API returns paths like @editframe/elements/canvas/EFCanvas.sandbox.ts
        try {
          // Use the filePath directly as it's already in the correct format for Vite
          const module = await import(/* @vite-ignore */ data.filePath);
          const config = (module as any).default || module;
          
          if (config && typeof config.render === "function") {
            setSandboxConfig(config as SandboxConfig);
            setSandboxLoadError(null);
          } else {
            throw new Error("Invalid sandbox config: missing render function");
          }
        } catch (importErr) {
          throw new Error(`Failed to load sandbox module: ${importErr instanceof Error ? importErr.message : String(importErr)}`);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error("Failed to load sandbox:", err);
      setSandboxLoadError(errorMessage);
      setSandboxConfig(null);
    } finally {
      setIsLoadingSandbox(false);
    }
  }, [sandboxLoaders]);

  // Load sandbox list on mount and reload if it becomes empty after being loaded
  useEffect(() => {
    // Prevent concurrent loads
    if (sandboxListLoadingRef.current) {
      return;
    }
    
    // Load if we haven't loaded yet
    if (!sandboxListLoadedRef.current) {
      sandboxListLoadedRef.current = true;
      sandboxListLoadingRef.current = true;
      
      const loadSandboxList = async () => {
        try {
          // Always use API to get the sandbox list - this ensures all discovered sandboxes
          // appear in the list even if some modules fail to load (e.g., CSS import errors).
          // The API uses file system discovery which doesn't require loading modules.
          // sandboxLoaders are only used for actually loading individual sandbox modules when needed.
          const response = await fetch(`/sandbox/api/list`);
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: response.statusText }));
            throw new Error(errorData.error || `Failed to fetch sandbox list: ${response.statusText}`);
          }
          const data = await response.json();
          // Update with the loaded sandboxes
          setSandboxList(data.sandboxes || []);
          setSandboxLoadError(null); // Clear any previous errors
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          console.error("Failed to load sandbox list:", err);
          // Show error in the sandbox list area, but don't clear existing list
          // Use functional update to preserve existing list if it exists
          setSandboxList(prev => prev.length > 0 ? prev : []);
          setSandboxLoadError(`Failed to load sandbox list: ${errorMessage}`);
        } finally {
          sandboxListLoadingRef.current = false;
        }
      };
      
      loadSandboxList();
      return;
    }
    
    // If list was previously loaded but is now empty, reload it
    // This handles cases where the list gets cleared during navigation or errors
    // BUT: Only reload if we're not currently loading a sandbox (to avoid race conditions)
    if (sandboxList.length === 0 && !isLoadingSandbox) {
      console.log("[ScenarioViewer] Sandbox list is empty after being loaded, reloading...");
      sandboxListLoadedRef.current = false; // Reset flag to allow reload
      sandboxListLoadingRef.current = true;
      
      const reloadSandboxList = async () => {
        try {
          const response = await fetch(`/sandbox/api/list`);
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: response.statusText }));
            throw new Error(errorData.error || `Failed to fetch sandbox list: ${response.statusText}`);
          }
          const data = await response.json();
          setSandboxList(data.sandboxes || []);
          setSandboxLoadError(null);
          sandboxListLoadedRef.current = true;
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          console.error("Failed to reload sandbox list:", err);
          setSandboxLoadError(`Failed to reload sandbox list: ${errorMessage}`);
          // Don't reset the flag on error - we'll retry on next render if still empty
        } finally {
          sandboxListLoadingRef.current = false;
        }
      };
      
      reloadSandboxList();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sandboxList.length]); // Reload if list becomes empty

  // React to URL changes via React Router
  // Uses path params for sandbox/scenario, query params for controlled/profile
  useEffect(() => {
    // Path params from /sandbox/:sandboxName/:scenarioName (parsed from catch-all)
    const name = urlSandboxName || searchParams.get("sandbox"); // fallback for legacy URLs
    const scenario = urlScenarioName || searchParams.get("scenario"); // fallback for legacy URLs
    
    // Query params for control flags
    const controlled = searchParams.get("controlled") === "true";
    const profile = searchParams.get("profile") === "true";
    
    setIsControlled(controlled);
    setProfilingEnabled(profile);
    
    if (name) {
      setSandboxName(name);
      if (scenario) {
        setSelectedScenario(scenario);
      } else {
        setSelectedScenario(null);
      }
      loadSandbox(name);
    } else {
      setSandboxName(null);
      setSelectedScenario(null);
      setSandboxConfig(null);
    }
  }, [urlSandboxName, urlScenarioName, searchParams, loadSandbox]);

  // Debug logging for profiling availability
  useEffect(() => {
    if (isControlled) {
      console.log("[ScenarioViewer] Controlled browser detected");
      // Check if profiling functions are available (exposed by ef open)
      const checkProfiling = () => {
        const available = isProfilingAvailable();
        setProfilingFunctionsAvailable(available);
        if (available) {
          console.log("[ScenarioViewer] ✅ Profiling functions available: __startProfiling, __stopProfiling");
        } else {
          console.log("[ScenarioViewer] ⏳ Profiling functions not yet available, will check again...");
          // Try again after a short delay in case functions aren't exposed yet
          setTimeout(() => {
            const availableNow = isProfilingAvailable();
            setProfilingFunctionsAvailable(availableNow);
            if (availableNow) {
              console.log("[ScenarioViewer] ✅ Profiling functions now available");
            } else {
              console.warn("[ScenarioViewer] ⚠️ Profiling functions not available. Make sure to open with 'ef open'.");
            }
          }, 500);
        }
      };
      checkProfiling();
      // Also check periodically in case functions are exposed later
      const interval = setInterval(() => {
        const available = isProfilingAvailable();
        if (available !== profilingFunctionsAvailable) {
          setProfilingFunctionsAvailable(available);
          if (available) {
            console.log("[ScenarioViewer] ✅ Profiling functions became available");
          }
        }
      }, 1000);
      // Clear interval after 10 seconds
      setTimeout(() => clearInterval(interval), 10000);
    }
  }, [isControlled, profilingFunctionsAvailable]);


  const toggleProfiling = () => {
    const newValue = !profilingEnabled;
    setProfilingEnabled(newValue);
    
    // Build query params (path stays the same)
    const queryParams = new URLSearchParams();
    if (newValue) {
      queryParams.set("profile", "true");
    }
    if (isControlled) {
      queryParams.set("controlled", "true");
    }
    const sessionId = searchParams.get("sessionId");
    if (sessionId) {
      queryParams.set("sessionId", sessionId);
    }
    
    const queryString = queryParams.toString();
    const newUrl = queryString ? `${window.location.pathname}?${queryString}` : window.location.pathname;
    window.history.replaceState({}, "", newUrl);
  };

  // Fetch relationships data
  const loadRelationships = async () => {
    try {
      const response = await fetch("/sandbox/api/relationships");
      if (response.ok) {
        const data = await response.json();
        setAllRelationships(data.relationships || {});
      }
    } catch (err) {
      // Silently ignore - relationships are optional
      console.warn("Failed to fetch sandbox relationships:", err);
    }
  };

  // Load relationships on mount
  useEffect(() => {
    loadRelationships();
  }, []);

  // Update current sandbox relationships when sandbox changes
  useEffect(() => {
    if (sandboxName && allRelationships[sandboxName]) {
      setRelationships(allRelationships[sandboxName]);
    } else {
      setRelationships(null);
    }
  }, [sandboxName, allRelationships]);

  // NOTE: The browser sandbox viewer is designed for interactive exploration.
  // - Scenarios are NOT automatically run when a sandbox loads
  // - Only the SELECTED scenario's preview is rendered (using renderPreviewOnly)
  // - Click "▶ Run" button to actually execute the scenario assertions
  // - This avoids interference from multiple scenarios running simultaneously
  // - The CLI (ef run) is the authoritative test runner that runs all scenarios

  const runScenario = async (scenarioName: string) => {
    if (!sandboxConfig) return;

    const scenario = sandboxConfig.scenarios[scenarioName];
    if (!scenario) {
      setScenarioErrors((prev) => {
        const next = new Map(prev);
        next.set(scenarioName, `Scenario "${scenarioName}" not found`);
        return next;
      });
      return;
    }

    setRunningScenario(scenarioName);
    setScenarioErrors((prev) => {
      const next = new Map(prev);
      next.delete(scenarioName);
      return next;
    });
    setScenarioLogs((prev) => {
      const next = new Map(prev);
      next.set(scenarioName, []);
      return next;
    });

    const startTime = performance.now();
    const result: ScenarioResult = {
      name: scenarioName,
      status: "passed",
      durationMs: 0,
    };

    let profilingActive = false;

    // Debug: Log profiling state
    console.log("[Profile] Profiling state:", {
      profilingEnabled,
      isControlled,
      functionsAvailable: isProfilingAvailable(),
      willStart: profilingEnabled && isControlled && isProfilingAvailable(),
    });

    // Start profiling if enabled and exposed functions are available
    if (profilingEnabled && isControlled && isProfilingAvailable()) {
      try {
        console.log("[Profile] Starting profiling for scenario:", scenarioName);
        const resultJson = await window.__startProfiling!(JSON.stringify({ samplingInterval: 100 }));
        const result = JSON.parse(resultJson);
        if (result.started) {
          profilingActive = true;
          console.log("[Profile] ✅ Profiling started via exposed function, timestamp:", result.timestamp);
        } else {
          console.warn("[Profile] ⚠️ Profiling start returned unexpected result:", result);
        }
      } catch (err) {
        console.error("[Profile] ❌ Failed to start profiling:", err);
        if (err instanceof Error) {
          console.error("[Profile] Error stack:", err.stack);
        }
      }
    } else {
      if (profilingEnabled && isControlled) {
        console.warn("[Profile] ⚠️ Profiling enabled but __startProfiling function not available. Open with 'ef open' to enable profiling.");
      } else if (profilingEnabled && !isControlled) {
        console.warn("[Profile] ⚠️ Profiling enabled but page not opened with 'ef open' (controlled=false)");
      } else if (!profilingEnabled) {
        console.log("[Profile] ℹ️ Profiling disabled (checkbox not checked)");
      }
    }

    try {
      // Increment the container key to force React to recreate the container element
      // This ensures we get a fresh container without Lit marker node issues
      const containerBeforeKeyChange = previewContainerRefs.current.get(scenarioName);
      setContainerKeys((prev) => {
        const next = new Map(prev);
        const currentKey = next.get(scenarioName) || 0;
        next.set(scenarioName, currentKey + 1);
        return next;
      });

      // Wait deterministically for React to re-render with the new key.
      // When the key changes, React unmounts the old container and mounts a new one.
      // The ref callback (setPreviewRef) will be called when the new container mounts.
      // We wait for the container to exist, and if it was null and then becomes non-null,
      // that confirms React has re-rendered with the new key.
      const waitForContainer = async (): Promise<HTMLDivElement> => {
        const maxAttempts = 100; // 100 attempts * 10ms = 1 second max wait
        const pollInterval = 10; // 10ms between checks
        
        // If container existed before, wait for it to be removed (unmounted) first
        if (containerBeforeKeyChange) {
          for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const container = previewContainerRefs.current.get(scenarioName);
            if (!container || container !== containerBeforeKeyChange) {
              break; // Container was removed or replaced
            }
            await new Promise(resolve => setTimeout(resolve, pollInterval));
          }
        }
        
        // Now wait for the new container to be mounted
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          const container = previewContainerRefs.current.get(scenarioName);
          if (container && container !== containerBeforeKeyChange) {
            return container; // New container is mounted
          }
          
          // Wait before next check
          await new Promise(resolve => setTimeout(resolve, pollInterval));
        }
        
        throw new Error(`Container for scenario "${scenarioName}" not mounted after ${maxAttempts * pollInterval}ms`);
      };

      const container = await waitForContainer();

      // Use shared runner for consistent execution logic
      // Note: The runner will clear the container and run setup, so we don't need to render template here
      const runnerResult = await runScenarioRunner(
        sandboxConfig,
        scenarioName,
        container,
        {
          onLog: (log) => {
            setScenarioLogs((prev) => {
              const next = new Map(prev);
              const currentLogs = next.get(scenarioName) || [];
              next.set(scenarioName, [...currentLogs, log]);
              return next;
            });
          },
        }
      );

      // Copy result from runner (preserving profiling data we'll add below)
      result.durationMs = runnerResult.durationMs;
      result.status = runnerResult.status;
      result.error = runnerResult.error;
      result.assertions = runnerResult.assertions;

      if (runnerResult.error) {
        const errorText = runnerResult.error.stack 
          ? `${runnerResult.error.message}\n\n${runnerResult.error.stack}`
          : runnerResult.error.message;
        setScenarioErrors((prev) => {
          const next = new Map(prev);
          next.set(scenarioName, errorText);
          return next;
        });
      }
    } catch (err) {
      result.durationMs = performance.now() - startTime;
      result.status = "error";
      result.error = {
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      };
      const errorText = result.error.stack
        ? `${result.error.message}\n\n${result.error.stack}`
        : result.error.message;
      setScenarioErrors((prev) => {
        const next = new Map(prev);
        next.set(scenarioName, errorText);
        return next;
      });
    } finally {
      // Stop profiling if it was started
      if (profilingActive && isProfilingAvailable()) {
        try {
          console.log("[Profile] Stopping profiling for scenario:", scenarioName);
          const profileJson = await window.__stopProfiling!();
          const parsed = JSON.parse(profileJson);
          
          // Check if there's an error in the response
          if (parsed.error) {
            console.error("[Profile] ❌ Profiling error:", parsed.error);
            setScenarioErrors((prev) => {
              const next = new Map(prev);
              next.set(scenarioName, `Profiling error: ${parsed.error}`);
              return next;
            });
          } else {
            const profile = parsed as CPUProfile;
            // Validate profile data
            if (profile && profile.nodes && profile.nodes.length > 0) {
              result.profile = profile;
              console.log("[Profile] ✅ Profiling stopped, profile data received:", {
                nodes: profile.nodes.length,
                samples: profile.samples?.length || 0,
                startTime: profile.startTime,
                endTime: profile.endTime,
                duration: profile.endTime && profile.startTime ? profile.endTime - profile.startTime : undefined,
              });
              
              // Log sample URLs to see what source mapping is happening
              const sampleUrls = new Set(profile.nodes.slice(0, 20).map(n => n.callFrame.url).filter(u => u));
              console.log("[Profile] Sample URLs from profile:", Array.from(sampleUrls));
            } else {
              console.warn("[Profile] ⚠️ Profile data is empty or invalid:", {
                hasProfile: !!profile,
                nodesLength: profile?.nodes?.length || 0,
                samplesLength: profile?.samples?.length || 0,
              });
              setScenarioErrors((prev) => {
                const next = new Map(prev);
                next.set(scenarioName, "Profiling completed but no data collected. The scenario may have run too quickly.");
                return next;
              });
            }
          }
        } catch (err) {
          console.error("[Profile] ❌ Failed to stop profiling:", err);
          if (err instanceof Error) {
            console.error("[Profile] Error stack:", err.stack);
          }
          setScenarioErrors((prev) => {
            const next = new Map(prev);
            next.set(scenarioName, `Failed to stop profiling: ${err instanceof Error ? err.message : String(err)}`);
            return next;
          });
        }
      } else {
        console.log("[Profile] ℹ️ Profiling not active, skipping stop:", {
          profilingActive,
          functionsAvailable: isProfilingAvailable(),
        });
      }

      console.log("[Profile] Final result:", {
        scenarioName,
        hasProfile: !!result.profile,
        profileNodes: (result.profile as any)?.nodes?.length || 0,
        profileSamples: (result.profile as any)?.samples?.length || 0,
      });

      setRunningScenario(null);
      setScenarioResults((prev) => {
        const next = new Map(prev);
        next.set(scenarioName, result);
        return next;
      });

      // Don't re-render after scenario completes - the scenario runner already rendered
      // the scenario's content, and we want to keep it visible for manual review/interaction.
      // The content is rendered BEFORE the run (in ScenarioRunner), so it stays visible after.
    }
  };

  // Track which scenarios should have containers rendered (for preview display)
  const [scenariosToRender, setScenariosToRender] = useState<Set<string>>(new Set());

  // Auto-select first scenario and run it when sandbox loads
  useEffect(() => {
    if (sandboxConfig) {
      const scenarioNames = Object.keys(sandboxConfig.scenarios);
      if (scenarioNames.length > 0) {
        let targetScenario = selectedScenario;
        
        // If no scenario is selected (or selected one doesn't exist), select the first one
        if (!selectedScenario || !scenarioNames.includes(selectedScenario)) {
          targetScenario = scenarioNames[0] ?? null;
          if (targetScenario) {
            setSelectedScenario(targetScenario);
            updateUrlWithScenario(targetScenario);
          }
        }
        
        // Ensure the scenario's container is rendered, then run the scenario
        if (targetScenario) {
          setScenariosToRender(prev => {
            if (prev.has(targetScenario!)) return prev;
            const next = new Set(prev);
            next.add(targetScenario!);
            return next;
          });
          
          // Run the selected scenario (not all scenarios)
          runScenario(targetScenario);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sandboxConfig]); // Only depend on sandboxConfig - renderScenarioPreview is stable via useCallback

  // Calculate rollup counts for the current sandbox
  // Must be called before any early returns to follow Rules of Hooks
  const scenarioNames = sandboxConfig ? Object.keys(sandboxConfig.scenarios) : [];
  const scenarioCounts = useMemo(() => {
    let passed = 0;
    let failed = 0;
    let running = 0;
    
    scenarioNames.forEach((name) => {
      const result = scenarioResults.get(name);
      if (runningScenario === name) {
        running++;
      } else if (result) {
        if (result.status === "passed") {
          passed++;
        } else if (result.status === "failed" || result.status === "error") {
          failed++;
        }
      }
    });
    
    return { passed, failed, running };
  }, [scenarioNames, scenarioResults, runningScenario]);

  if (!sandboxName) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100vh", fontFamily: "system-ui, -apple-system, sans-serif", overflow: "hidden", background: "#0d1117" }}>
        {/* Global header with profile checkbox */}
        <div style={{ padding: "8px 12px", background: "#161b22", borderBottom: "1px solid #30363d", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <h1 style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: "#f0f6fc" }}>Element Sandboxes</h1>
          {isControlled && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  cursor: "pointer",
                  fontSize: "12px",
                  color: "#8b949e",
                  padding: "4px 8px",
                  borderRadius: "4px",
                  background: profilingEnabled ? "#21262d" : "transparent",
                  border: "1px solid #30363d",
                }}
              >
                <input
                  type="checkbox"
                  checked={profilingEnabled}
                  onChange={toggleProfiling}
                  style={{ cursor: "pointer" }}
                />
                <span style={{ fontWeight: profilingEnabled ? 500 : 400, color: profilingEnabled ? "#58a6ff" : "#8b949e" }}>
                  Enable Profiling
                </span>
              </label>
              {profilingFunctionsAvailable ? (
                <span style={{ fontSize: "10px", color: "#238636", padding: "2px 6px", background: "#161b22", borderRadius: "3px" }}>
                  ✓ Functions Available
                </span>
              ) : (
                <span style={{ fontSize: "10px", color: "#da3633", padding: "2px 6px", background: "#161b22", borderRadius: "3px" }}>
                  ⚠ Functions Not Available
                </span>
              )}
            </div>
          )}
        </div>

        {/* Three-column layout - same as when sandbox is selected */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          {/* Left: Sandboxes navigation */}
          <div style={{ width: "200px", background: "#161b22", borderRight: "1px solid #30363d", flexShrink: 0, display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "8px 10px", borderBottom: "1px solid #30363d", fontSize: "11px", fontWeight: 600, color: "#8b949e", textTransform: "uppercase" }}>
              Sandboxes
            </div>
            <div style={{ flex: 1, overflow: "auto" }}>
              <SandboxTree sandboxes={sandboxList} selectedSandboxName={null} onNavigate={navigateToSandbox} />
            </div>
          </div>

          {/* Middle: Empty placeholder */}
          <div style={{ width: "220px", background: "#161b22", borderRight: "1px solid #30363d", flexShrink: 0, display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "8px 10px", borderBottom: "1px solid #30363d", fontSize: "11px", fontWeight: 600, color: "#8b949e", textTransform: "uppercase" }}>
              Scenarios
            </div>
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#8b949e", fontSize: "12px" }}>
              Select a sandbox
            </div>
          </div>

          {/* Right: Empty placeholder */}
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#8b949e", fontSize: "12px", background: "#0d1117" }}>
            Select a sandbox to view scenarios
          </div>
        </div>
      </div>
    );
  }

  // Show loading or error state with navigation chrome still visible
  if (!sandboxConfig && sandboxName) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100vh", fontFamily: "system-ui, -apple-system, sans-serif", overflow: "hidden", background: "#0d1117" }}>
        {/* Global header */}
        <div style={{ padding: "8px 12px", background: "#161b22", borderBottom: "1px solid #30363d", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <h1 style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: "#f0f6fc" }}>
            {sandboxName}
          </h1>
          {isControlled && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  cursor: "pointer",
                  fontSize: "12px",
                  color: "#8b949e",
                  padding: "4px 8px",
                  borderRadius: "4px",
                  background: profilingEnabled ? "#21262d" : "transparent",
                  border: "1px solid #30363d",
                }}
              >
                <input
                  type="checkbox"
                  checked={profilingEnabled}
                  onChange={toggleProfiling}
                  style={{ cursor: "pointer" }}
                />
                <span style={{ fontWeight: profilingEnabled ? 500 : 400, color: profilingEnabled ? "#58a6ff" : "#8b949e" }}>
                  Enable Profiling
                </span>
              </label>
              {profilingFunctionsAvailable ? (
                <span style={{ fontSize: "10px", color: "#238636", padding: "2px 6px", background: "#161b22", borderRadius: "3px" }}>
                  ✓ Functions Available
                </span>
              ) : (
                <span style={{ fontSize: "10px", color: "#da3633", padding: "2px 6px", background: "#161b22", borderRadius: "3px" }}>
                  ⚠ Functions Not Available
                </span>
              )}
            </div>
          )}
        </div>

        {/* Three-column layout with navigation */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          {/* Left: Sandboxes navigation */}
          <div style={{ width: "200px", background: "#161b22", borderRight: "1px solid #30363d", flexShrink: 0, display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "8px 10px", borderBottom: "1px solid #30363d", fontSize: "11px", fontWeight: 600, color: "#8b949e", textTransform: "uppercase" }}>
              Sandboxes
            </div>
            <div style={{ flex: 1, overflow: "auto" }}>
              <SandboxTree sandboxes={sandboxList} selectedSandboxName={sandboxName} onNavigate={navigateToSandbox} />
            </div>
            
            {/* Related sandboxes section (also shown during loading) */}
            {relationships && (relationships.uses.length > 0 || relationships.usedBy.length > 0) && (
              <div style={{ borderTop: "1px solid #30363d", padding: "8px 10px" }}>
                <div style={{ fontSize: "11px", fontWeight: 600, color: "#8b949e", textTransform: "uppercase", marginBottom: "8px" }}>
                  Related
                </div>
                
                {relationships.uses.length > 0 && (
                  <div style={{ marginBottom: "8px" }}>
                    <div style={{ fontSize: "10px", color: "#8b949e", marginBottom: "4px" }}>Uses:</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                      {relationships.uses.map(name => {
                        return (
                          <div
                            key={name}
                            onClick={() => navigateToSandbox(name)}
                            style={{
                              fontSize: "10px",
                              padding: "2px 6px",
                              background: "rgba(88, 166, 255, 0.15)",
                              color: "#58a6ff",
                              borderRadius: "3px",
                              cursor: "pointer",
                              border: "1px solid rgba(88, 166, 255, 0.3)",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = "rgba(88, 166, 255, 0.25)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "rgba(88, 166, 255, 0.15)";
                            }}
                          >
                            {name}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                {relationships.usedBy.length > 0 && (
                  <div>
                    <div style={{ fontSize: "10px", color: "#8b949e", marginBottom: "4px" }}>Used by:</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                      {relationships.usedBy.map(name => {
                        return (
                          <div
                            key={name}
                            onClick={() => navigateToSandbox(name)}
                            style={{
                              fontSize: "10px",
                              padding: "2px 6px",
                              background: "rgba(126, 231, 135, 0.15)",
                              color: "#7ee787",
                              borderRadius: "3px",
                              cursor: "pointer",
                              border: "1px solid rgba(126, 231, 135, 0.3)",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = "rgba(126, 231, 135, 0.25)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "rgba(126, 231, 135, 0.15)";
                            }}
                          >
                            {name}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Middle: Empty placeholder */}
          <div style={{ width: "220px", background: "#161b22", borderRight: "1px solid #30363d", flexShrink: 0, display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "8px 10px", borderBottom: "1px solid #30363d", fontSize: "11px", fontWeight: 600, color: "#8b949e", textTransform: "uppercase" }}>
              Scenarios
            </div>
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#8b949e", fontSize: "12px" }}>
              {isLoadingSandbox ? "Loading..." : "Error loading"}
            </div>
          </div>

          {/* Right: Error or loading message */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "#0d1117" }}>
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
              <div style={{ maxWidth: "600px", width: "100%" }}>
                {isLoadingSandbox ? (
                  <div style={{ textAlign: "center", color: "#8b949e" }}>
                    <div style={{ fontSize: "14px", marginBottom: "8px" }}>Loading sandbox...</div>
                  </div>
                ) : sandboxLoadError ? (
                  <div style={{ background: "#490202", border: "1px solid #da3633", borderRadius: "6px", padding: "16px" }}>
                    <div style={{ fontSize: "14px", fontWeight: 600, color: "#ffa198", marginBottom: "8px" }}>
                      Failed to load sandbox
                    </div>
                    <div style={{ fontSize: "12px", color: "#ffa198", fontFamily: "monospace", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                      {sandboxLoadError}
                    </div>
                    <button
                      onClick={() => loadSandbox(sandboxName)}
                      style={{
                        marginTop: "12px",
                        padding: "6px 12px",
                        background: "#238636",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "12px",
                        fontWeight: 500,
                      }}
                    >
                      Retry
                    </button>
                  </div>
                ) : (
                  <div style={{ textAlign: "center", color: "#8b949e", fontSize: "14px" }}>
                    Loading sandbox...
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const setPreviewRef = (scenarioName: string, element: HTMLDivElement | null) => {
    if (element) {
      previewContainerRefs.current.set(scenarioName, element);
    } else {
      previewContainerRefs.current.delete(scenarioName);
    }
  };

  const setScenarioElementRef = (scenarioName: string, element: HTMLDivElement | null) => {
    if (element) {
      scenarioElementRefs.current.set(scenarioName, element);
    } else {
      scenarioElementRefs.current.delete(scenarioName);
    }
  };

  const updateUrlWithScenario = (scenarioName: string) => {
    if (!sandboxName) return;
    
    // Build path-based URL: /sandbox/:sandboxName/:scenarioName
    let path = `/sandbox/${encodeURIComponent(sandboxName)}/${encodeURIComponent(scenarioName)}`;
    
    // Preserve query params (controlled, profile, sessionId)
    const queryParams = new URLSearchParams();
    if (isControlled) {
      queryParams.set("controlled", "true");
    }
    if (profilingEnabled) {
      queryParams.set("profile", "true");
    }
    const sessionId = searchParams.get("sessionId");
    if (sessionId) {
      queryParams.set("sessionId", sessionId);
    }
    
    const queryString = queryParams.toString();
    const newUrl = queryString ? `${path}?${queryString}` : path;
    window.history.replaceState({}, "", newUrl);
  };

  const selectScenario = (scenarioName: string) => {
    setSelectedScenario(scenarioName);
    updateUrlWithScenario(scenarioName);
    
    // Ensure the scenario's container is rendered
    setScenariosToRender(prev => {
      if (prev.has(scenarioName)) return prev;
      const next = new Set(prev);
      next.add(scenarioName);
      return next;
    });
    
    // Run the selected scenario
    runScenario(scenarioName);
    
    // When switching scenarios, ensure the newly visible container gets proper events
    // This helps elements that depend on container dimensions to re-measure
    requestAnimationFrame(() => {
      const container = previewContainerRefs.current.get(scenarioName);
      if (container) {
        console.log(`[ScenarioViewer] Switching to ${scenarioName}:`, {
          containerSize: { 
            width: container.offsetWidth, 
            height: container.offsetHeight 
          }
        });
        
        container.getBoundingClientRect(); // Force layout
        
                // Dispatch multiple events
                const events = [
                  new Event('resize', { bubbles: true }),
                  new CustomEvent('timeline-ready', { bubbles: true }),
                  new CustomEvent('container-ready', { bubbles: true })
                ];
                
                events.forEach(event => container.dispatchEvent(event));
                
                // Force ResizeObserver callbacks by temporarily changing container size
                // This is needed for elements like EFTimelineRuler that depend on ResizeObserver
                const originalWidth = container.style.width;
                container.style.width = `${container.offsetWidth + 1}px`;
                requestAnimationFrame(() => {
                  container.style.width = originalWidth;
                });
        
        // Also trigger after a delay for elements that need more time
        setTimeout(() => {
          events.forEach(event => container.dispatchEvent(event));
        }, 50);
      }
    });
  };

  // At this point, sandboxConfig must be non-null (we return early if it's null)
  if (!sandboxConfig) {
    return null; // This should never happen, but satisfies TypeScript
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", fontFamily: "system-ui, -apple-system, sans-serif", overflow: "hidden", background: "#0d1117" }}>
      {/* Global header with profile checkbox */}
      <div style={{ padding: "8px 12px", background: "#161b22", borderBottom: "1px solid #30363d", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
        <h1 style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: "#f0f6fc" }}>
          {sandboxConfig.name}
          {sandboxConfig.description && (
            <span style={{ marginLeft: "8px", fontSize: "12px", fontWeight: 400, color: "#8b949e" }}>
              {sandboxConfig.description}
            </span>
          )}
        </h1>
        {isControlled && (
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              cursor: "pointer",
              fontSize: "12px",
              color: "#8b949e",
              padding: "4px 8px",
              borderRadius: "4px",
              background: profilingEnabled ? "#21262d" : "transparent",
              border: "1px solid #30363d",
            }}
          >
            <input
              type="checkbox"
              checked={profilingEnabled}
              onChange={toggleProfiling}
              style={{ cursor: "pointer" }}
            />
            <span style={{ fontWeight: profilingEnabled ? 500 : 400, color: profilingEnabled ? "#58a6ff" : "#8b949e" }}>
              Enable Profiling
            </span>
          </label>
        )}
      </div>

      {/* Three-column layout */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Left: Sandboxes navigation */}
        <div style={{ width: "200px", background: "#161b22", borderRight: "1px solid #30363d", flexShrink: 0, display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "8px 10px", borderBottom: "1px solid #30363d", fontSize: "11px", fontWeight: 600, color: "#8b949e", textTransform: "uppercase" }}>
            Sandboxes
          </div>
          <div style={{ flex: 1, overflow: "auto" }}>
            <SandboxTree sandboxes={sandboxList} selectedSandboxName={sandboxName} onNavigate={navigateToSandbox} />
          </div>
          
          {/* Related sandboxes section */}
          {relationships && (relationships.uses.length > 0 || relationships.usedBy.length > 0) && (
            <div style={{ borderTop: "1px solid #30363d", padding: "8px 10px" }}>
              <div style={{ fontSize: "11px", fontWeight: 600, color: "#8b949e", textTransform: "uppercase", marginBottom: "8px" }}>
                Related
              </div>
              
              {relationships.uses.length > 0 && (
                <div style={{ marginBottom: "8px" }}>
                  <div style={{ fontSize: "10px", color: "#8b949e", marginBottom: "4px" }}>Uses:</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                    {relationships.uses.map(name => {
                      return (
                        <div
                          key={name}
                          onClick={() => navigateToSandbox(name)}
                          style={{
                            fontSize: "10px",
                            padding: "2px 6px",
                            background: "rgba(88, 166, 255, 0.15)",
                            color: "#58a6ff",
                            borderRadius: "3px",
                            cursor: "pointer",
                            border: "1px solid rgba(88, 166, 255, 0.3)",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "rgba(88, 166, 255, 0.25)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "rgba(88, 166, 255, 0.15)";
                          }}
                        >
                          {name}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {relationships.usedBy.length > 0 && (
                <div>
                  <div style={{ fontSize: "10px", color: "#8b949e", marginBottom: "4px" }}>Used by:</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                    {relationships.usedBy.map(name => {
                      return (
                        <div
                          key={name}
                          onClick={() => navigateToSandbox(name)}
                          style={{
                            fontSize: "10px",
                            padding: "2px 6px",
                            background: "rgba(126, 231, 135, 0.15)",
                            color: "#7ee787",
                            borderRadius: "3px",
                            cursor: "pointer",
                            border: "1px solid rgba(126, 231, 135, 0.3)",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "rgba(126, 231, 135, 0.25)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "rgba(126, 231, 135, 0.15)";
                          }}
                        >
                          {name}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Middle: Scenarios navigation */}
        <div style={{ width: "220px", background: "#161b22", borderRight: "1px solid #30363d", flexShrink: 0, display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "8px 10px", borderBottom: "1px solid #30363d", fontSize: "11px", fontWeight: 600, color: "#8b949e", textTransform: "uppercase", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Scenarios</span>
            {scenarioNames.length > 0 && (
              <div style={{ display: "flex", gap: "6px", fontSize: "10px", fontWeight: 400 }}>
                {scenarioCounts.passed > 0 && (
                  <span style={{ color: "#238636" }}>✓{scenarioCounts.passed}</span>
                )}
                {scenarioCounts.failed > 0 && (
                  <span style={{ color: "#da3633" }}>✗{scenarioCounts.failed}</span>
                )}
                {scenarioCounts.running > 0 && (
                  <span style={{ color: "#58a6ff" }}>⟳{scenarioCounts.running}</span>
                )}
              </div>
            )}
          </div>
          <div style={{ flex: 1, overflow: "auto", padding: "4px" }}>
            {scenarioNames.length === 0 ? (
              <div style={{ padding: "12px", color: "#8b949e", textAlign: "center", fontSize: "12px" }}>
                No scenarios defined
              </div>
            ) : (
              (() => {
                // Group scenarios by category
                const scenariosByCategory = new Map<ScenarioCategory, string[]>();
                for (const name of scenarioNames) {
                  const meta = sandboxConfig ? getScenarioMeta(sandboxConfig.scenarios, name) : { type: "scenario" as ScenarioType, category: "demonstration" as ScenarioCategory };
                  const category = meta.category;
                  if (!scenariosByCategory.has(category)) {
                    scenariosByCategory.set(category, []);
                  }
                  scenariosByCategory.get(category)!.push(name);
                }
                
                // Category labels and default expanded state
                const categoryLabels: Record<ScenarioCategory, string> = {
                  demonstration: "Demonstration",
                  theming: "Theming",
                  internals: "Internals",
                  performance: "Performance",
                };
                
                const defaultExpanded: Record<ScenarioCategory, boolean> = {
                  demonstration: true,
                  theming: true,
                  internals: false,
                  performance: true,
                };
                
                // Category order for display
                const categoryOrder: ScenarioCategory[] = ["demonstration", "theming", "internals", "performance"];
                
                return categoryOrder.map((category) => {
                  const categoryScenarios = scenariosByCategory.get(category) || [];
                  if (categoryScenarios.length === 0) return null;
                  
                  return (
                    <ScenarioCategoryGroup
                      key={category}
                      category={category}
                      categoryLabel={categoryLabels[category] || category}
                      scenarios={categoryScenarios}
                      selectedScenario={selectedScenario}
                      runningScenario={runningScenario}
                      scenarioResults={scenarioResults}
                      sandboxConfig={sandboxConfig}
                      onSelectScenario={selectScenario}
                      defaultExpanded={defaultExpanded[category] ?? false}
                    />
                  );
                }).filter(Boolean);
              })()
            )}
          </div>
        </div>

        {/* Right: Sandbox preview/content (largest column) */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
          {scenarioNames.length === 0 ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#8b949e", fontSize: "12px" }}>
              No scenarios defined
            </div>
          ) : !selectedScenario ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#8b949e", fontSize: "12px" }}>
              Select a scenario from the middle column
            </div>
          ) : (
            // Only render containers for scenarios that need to be in the DOM to avoid interference.
            // When scenarios run sequentially, having all containers in the DOM simultaneously
            // can cause interference (shared Lit render roots, running tasks, event listeners).
            // By only rendering active scenarios, we ensure complete isolation.
            scenarioNames
              .filter((scenarioName) => {
                // Render if:
                // - Selected (to show UI)
                // - Running (needs container to execute)  
                // - Has results (to show results in UI)
                // - In scenariosToRender set (scenarios queued to run)
                return (
                  scenarioName === selectedScenario ||
                  scenarioName === runningScenario ||
                  scenarioResults.has(scenarioName) ||
                  scenariosToRender.has(scenarioName)
                );
              })
              .map((scenarioName) => {
                const result = scenarioResults.get(scenarioName);
                const isRunning = runningScenario === scenarioName;
                const error: string | undefined = scenarioErrors.get(scenarioName);
                const logs = scenarioLogs.get(scenarioName) || [];
                const isVisible = scenarioName === selectedScenario;
                
                const errorPanel: JSX.Element | null = (() => {
                  if (!error) return null;
                  return (
                    <div
                      style={{
                        padding: "8px 12px",
                        background: "#490202",
                        color: "#ffa198",
                        borderTop: "1px solid #da3633",
                        fontSize: "11px",
                        flexShrink: 0,
                        maxHeight: "300px",
                        overflow: "auto",
                      }}
                    >
                      <div style={{ fontWeight: 600, marginBottom: "4px" }}>Error</div>
                      <div style={{ fontFamily: "monospace", whiteSpace: "pre-wrap", wordBreak: "break-word", lineHeight: "1.4" }}>{error}</div>
                    </div>
                  );
                })();
                
                return (
                  <div 
                    key={scenarioName}
                    ref={(el) => setScenarioElementRef(scenarioName, el)}
                    style={{ 
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      display: isVisible ? "flex" : "none",
                      flexDirection: "column",
                      overflow: "hidden"
                    }}
                  >
                  {/* Scenario header */}
                  {(() => {
                    const scenarioMeta = sandboxConfig ? getScenarioMeta(sandboxConfig.scenarios, scenarioName) : { type: "scenario" as ScenarioType, category: "demonstration" as ScenarioCategory };
                    return (
                      <div style={{ padding: "8px 12px", background: "#21262d", borderBottom: "1px solid #30363d", flexShrink: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1 }}>
                            <h2 style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: "#f0f6fc" }}>
                              {scenarioName}
                            </h2>
                            {scenarioMeta.type === "validation" && (
                              <span style={{ fontSize: "9px", padding: "2px 5px", borderRadius: "3px", background: "#30363d", color: "#8b949e" }}>
                                validation
                              </span>
                            )}
                            {profilingEnabled && isRunning && (
                              <span style={{ color: "#58a6ff", fontSize: "10px" }}>Profiling...</span>
                            )}
                            {result && (
                              <span
                                style={{
                                  fontSize: "10px",
                                  padding: "2px 6px",
                                  borderRadius: "3px",
                                  background:
                                    result.status === "passed"
                                      ? "#238636"
                                      : result.status === "failed"
                                      ? "#da3633"
                                      : "#bf8700",
                                  color: "white",
                                  fontWeight: 500,
                                }}
                              >
                                {result.status === "passed" ? "✓ Passed" : result.status === "failed" ? "✗ Failed" : "⚠ Error"}
                              </span>
                            )}
                            {isRunning && (
                              <span style={{ color: "#8b949e", fontSize: "10px" }}>⟳ Running...</span>
                            )}
                            {result && !isRunning && (
                              <span style={{ fontSize: "10px", color: "#8b949e" }}>
                                {result.durationMs.toFixed(0)}ms
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => runScenario(scenarioName)}
                            disabled={isRunning}
                            style={{
                              padding: "4px 8px",
                              background: "#238636",
                              color: "white",
                              border: "none",
                              borderRadius: "3px",
                              cursor: isRunning ? "not-allowed" : "pointer",
                              opacity: isRunning ? 0.5 : 1,
                              fontSize: "11px",
                              fontWeight: 500,
                            }}
                          >
                            {isRunning ? "Running..." : "▶ Run"}
                          </button>
                        </div>
                        {"description" in scenarioMeta && scenarioMeta.description && (
                          <div style={{ marginTop: "6px", fontSize: "11px", color: "#8b949e", fontStyle: "italic" }}>
                            {scenarioMeta.description}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Preview area - takes remaining space */}
                  <div
                    key={`preview-${scenarioName}-${containerKeys.get(scenarioName) || 0}`}
                    ref={(el) => setPreviewRef(scenarioName, el)}
                    style={{
                      flex: 1,
                      padding: "16px",
                      background: "#0d1117",
                      overflow: "auto",
                      // Ensure the container has explicit dimensions for elements that need them
                      minWidth: "800px", // Ensure minimum width for timeline elements
                      minHeight: "400px", // Ensure minimum height for content
                      // Provide a sizing context for canvas-based elements
                      position: "relative",
                      width: "100%",
                      height: "100%",
                    }}
                  />

                  {/* Error panel */}
                  {errorPanel}

                  {/* Assertions panel */}
                  {result?.assertions && result.assertions.length > 0 && (
                    <div style={{ padding: "8px 12px", borderTop: "1px solid #30363d", flexShrink: 0 }}>
                      <AssertionsDisplay assertions={result.assertions} />
                    </div>
                  )}

                  {/* Logs panel */}
                  {logs.length > 0 && (
                    <div
                      style={{
                        padding: "8px 12px",
                        background: "#21262d",
                        borderTop: "1px solid #30363d",
                        maxHeight: "150px",
                        overflow: "auto",
                        fontSize: "10px",
                        flexShrink: 0,
                      }}
                    >
                      <div style={{ fontWeight: 600, marginBottom: "4px", color: "#f0f6fc", fontSize: "11px" }}>Logs</div>
                      {logs.map((log, i) => (
                        <div key={i} style={{ color: "#8b949e", marginBottom: "2px", fontFamily: "monospace", lineHeight: "1.3" }}>
                          {log}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Profile viewer - only show when profile data exists */}
                  {result?.profile && (
                    <div style={{ height: "400px", flexShrink: 0, borderTop: "1px solid #30363d" }}>
                      <ProfileViewer profile={result.profile as CPUProfile} />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}