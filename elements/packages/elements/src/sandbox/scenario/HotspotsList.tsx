import React, { useState } from "react";
import type { CPUProfile } from "./types.js";
import { getHotspots, getTimeRange } from "./profile-utils.js";

interface HotspotsListProps {
  profile: CPUProfile;
}

export function HotspotsList({ profile }: HotspotsListProps) {
  const [showAll, setShowAll] = useState(false);
  const allHotspots = getHotspots(profile);
  const timeRange = getTimeRange(profile);
  
  // Filter to show only user code by default (exclude internal V8 functions and node_modules)
  const hotspots = showAll 
    ? allHotspots 
    : allHotspots.filter(h => {
        const isInternal = h.functionName.startsWith("(") && h.functionName.endsWith(")");
        const isNodeModules = h.url && (h.url.includes("node_modules") || h.url.includes("chunk-"));
        return !isInternal && !isNodeModules && h.url && h.url !== "";
      });

  return (
    <div style={{ padding: "12px", overflow: "auto", height: "100%" }}>
      <div style={{ marginBottom: "12px", fontSize: "12px", color: "#8b949e", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          Showing {showAll ? "all" : "user code"} hotspots by self time
          {timeRange.duration > 0 && (
            <span style={{ marginLeft: "8px" }}>
              ({hotspots.length} of {allHotspots.length} functions, {(timeRange.duration / 1000).toFixed(2)}ms total)
            </span>
          )}
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: "4px", cursor: "pointer" }}>
          <input 
            type="checkbox" 
            checked={showAll} 
            onChange={(e) => setShowAll(e.target.checked)}
            style={{ cursor: "pointer" }}
          />
          <span>Show all (including internal)</span>
        </label>
      </div>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: "11px",
          fontFamily: "monospace",
        }}
      >
        <thead>
          <tr style={{ borderBottom: "1px solid #30363d", background: "#161b22" }}>
            <th
              style={{
                padding: "6px 8px",
                textAlign: "left",
                fontWeight: 600,
                color: "#f0f6fc",
                position: "sticky",
                top: 0,
                background: "#161b22",
              }}
            >
              Function
            </th>
            <th
              style={{
                padding: "6px 8px",
                textAlign: "left",
                fontWeight: 600,
                color: "#f0f6fc",
                position: "sticky",
                top: 0,
                background: "#161b22",
              }}
            >
              File:Line
            </th>
            <th
              style={{
                padding: "6px 8px",
                textAlign: "right",
                fontWeight: 600,
                color: "#f0f6fc",
                position: "sticky",
                top: 0,
                background: "#161b22",
              }}
            >
              Self Time
            </th>
            <th
              style={{
                padding: "6px 8px",
                textAlign: "right",
                fontWeight: 600,
                color: "#f0f6fc",
                position: "sticky",
                top: 0,
                background: "#161b22",
              }}
            >
              Total Time
            </th>
            <th
              style={{
                padding: "6px 8px",
                textAlign: "right",
                fontWeight: 600,
                color: "#f0f6fc",
                position: "sticky",
                top: 0,
                background: "#161b22",
              }}
            >
              %
            </th>
          </tr>
        </thead>
        <tbody>
          {hotspots.slice(0, 100).map((hotspot, index) => {
            const percentage =
              timeRange.duration > 0 ? (hotspot.selfTime / timeRange.duration) * 100 : 0;
            
            // Parse file path and line number
            const hasUrl = hotspot.url && hotspot.url !== "";
            const fileName = hasUrl ? hotspot.url.split("/").pop() || hotspot.url : "";
            const shortUrl = fileName.length > 40 ? `...${fileName.slice(-37)}` : fileName;
            const lineNumber = hotspot.line >= 0 ? hotspot.line + 1 : null;
            
            // Determine if this is a user function or internal
            const isInternal = hotspot.functionName.startsWith("(") && hotspot.functionName.endsWith(")");
            const isUserCode = hasUrl && !hotspot.url.includes("node_modules") && !hotspot.url.includes("chunk-");
            
            // Format location
            let location = "";
            if (hasUrl && lineNumber !== null) {
              location = `${shortUrl}:${lineNumber}`;
            } else if (hasUrl) {
              location = shortUrl;
            } else {
              location = isInternal ? "internal" : "—";
            }

            return (
              <tr
                key={index}
                style={{
                  borderBottom: "1px solid #21262d",
                  background: index % 2 === 0 ? "#0d1117" : "#161b22",
                  opacity: isInternal ? 0.6 : 1,
                }}
              >
                <td style={{ 
                  padding: "6px 8px", 
                  color: isUserCode ? "#58a6ff" : "#f0f6fc",
                  fontWeight: isUserCode ? 600 : 400,
                }}>
                  {hotspot.functionName}
                </td>
                <td style={{ 
                  padding: "6px 8px", 
                  color: isUserCode ? "#8b949e" : "#6e7681",
                  fontSize: "10px",
                }} title={hotspot.url || "No source location"}>
                  {location}
                </td>
                <td style={{ padding: "6px 8px", textAlign: "right", color: "#f0f6fc" }}>
                  {(hotspot.selfTime / 1000).toFixed(2)}ms
                </td>
                <td style={{ padding: "6px 8px", textAlign: "right", color: "#8b949e" }}>
                  {(hotspot.totalTime / 1000).toFixed(2)}ms
                </td>
                <td style={{ padding: "6px 8px", textAlign: "right", color: "#8b949e" }}>
                  {percentage.toFixed(1)}%
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
