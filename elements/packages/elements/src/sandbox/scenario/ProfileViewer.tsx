import React from "react";
import type { CPUProfile } from "./types.js";
import { HotspotsList } from "./HotspotsList.js";
import { getTimeRange } from "./profile-utils.js";

interface ProfileViewerProps {
  profile: CPUProfile;
}

export function ProfileViewer({ profile }: ProfileViewerProps) {
  const timeRange = getTimeRange(profile);

  const downloadProfile = () => {
    const blob = new Blob([JSON.stringify(profile)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `profile-${Date.now()}.cpuprofile`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "#0d1117",
        borderTop: "1px solid #30363d",
      }}
    >
      {/* Header with metadata and download button */}
      <div
        style={{
          padding: "8px 12px",
          background: "#161b22",
          borderBottom: "1px solid #30363d",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ fontSize: "11px", color: "#8b949e" }}>
          Performance Profile: {(timeRange.duration / 1000).toFixed(2)}ms duration, {profile.samples.length} samples
        </div>
        <button
          onClick={downloadProfile}
          style={{
            padding: "4px 8px",
            background: "#21262d",
            border: "1px solid #30363d",
            borderRadius: "4px",
            color: "#8b949e",
            cursor: "pointer",
            fontSize: "11px",
            fontWeight: 500,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#30363d";
            e.currentTarget.style.color = "#f0f6fc";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#21262d";
            e.currentTarget.style.color = "#8b949e";
          }}
        >
          ⬇ Download .cpuprofile
        </button>
      </div>

      {/* Hotspots list */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        <HotspotsList profile={profile} />
      </div>
    </div>
  );
}
