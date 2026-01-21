import React, { useRef, useEffect, useState } from "react";
import type { CPUProfile } from "./types.js";
import { getTimeRange, getNodeById, calculateTotalTime } from "./profile-utils.js";

interface HeatMapProps {
  profile: CPUProfile;
}

export function HeatMap({ profile }: HeatMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoverInfo, setHoverInfo] = useState<{
    x: number;
    y: number;
    node: string;
    time: number;
  } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const timeRange = getTimeRange(profile);
    const totalTime = calculateTotalTime(profile);
    const nodeMap = new Map<number, string>();
    const nodeTimes = new Map<number, number[]>();

    // Build node map and initialize time arrays
    for (const node of profile.nodes) {
      nodeMap.set(node.id, node.callFrame.functionName || "(anonymous)");
      nodeTimes.set(node.id, []);
    }

    // Calculate time spent per sample
    let currentTime = profile.startTime;
    const timeBuckets = 200; // Number of time buckets for x-axis
    const bucketSize = timeRange.duration / timeBuckets;

    for (let i = 0; i < profile.samples.length; i++) {
      const sample = profile.samples[i];
      const delta = profile.timeDeltas[i] || 0;
      const bucketIndex = Math.floor((currentTime - timeRange.start) / bucketSize);
      currentTime += delta;

      if (bucketIndex >= 0 && bucketIndex < timeBuckets) {
        const times = nodeTimes.get(sample) || [];
        if (!times[bucketIndex]) {
          times[bucketIndex] = 0;
        }
        times[bucketIndex] += delta;
        nodeTimes.set(sample, times);
      }
    }

    // Get top nodes by total time
    const sortedNodes = Array.from(totalTime.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 50); // Top 50 functions

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const width = rect.width;
    const height = rect.height;
    const rowHeight = height / sortedNodes.length;
    const colWidth = width / timeBuckets;

    // Clear canvas
    ctx.fillStyle = "#0d1117";
    ctx.fillRect(0, 0, width, height);

    // Draw heat map
    sortedNodes.forEach(([nodeId, _totalTime], rowIndex) => {
      const times = nodeTimes.get(nodeId) || [];
      const maxTime = Math.max(...times.filter((t) => t !== undefined), 1);

      times.forEach((time, colIndex) => {
        if (time && time > 0) {
          const intensity = Math.min(time / maxTime, 1);
          // Use a color gradient from dark blue to bright yellow
          const hue = 240 - intensity * 180; // Blue to yellow
          const saturation = 100;
          const lightness = 20 + intensity * 60;
          ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;

          ctx.fillRect(colIndex * colWidth, rowIndex * rowHeight, colWidth, rowHeight);
        }
      });
    });

    // Draw labels
    ctx.fillStyle = "#f0f6fc";
    ctx.font = "10px monospace";
    sortedNodes.forEach(([nodeId, _totalTime], rowIndex) => {
      const nodeName = nodeMap.get(nodeId) || "unknown";
      const shortName = nodeName.length > 30 ? `${nodeName.slice(0, 27)}...` : nodeName;
      ctx.fillText(shortName, 4, rowIndex * rowHeight + rowHeight / 2 + 3);
    });

    // Draw time axis
    ctx.strokeStyle = "#30363d";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height - 20);
    ctx.lineTo(width, height - 20);
    ctx.stroke();

    // Draw time labels
    ctx.fillStyle = "#8b949e";
    ctx.font = "9px monospace";
    for (let i = 0; i <= 5; i++) {
      const time = timeRange.start + (timeRange.duration * i) / 5;
      const x = (width * i) / 5;
      ctx.fillText(`${(time / 1000).toFixed(1)}ms`, x + 2, height - 4);
    }
  }, [profile]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const timeRange = getTimeRange(profile);
    const timeBuckets = 200;
    const bucketSize = timeRange.duration / timeBuckets;
    const totalTime = calculateTotalTime(profile);
    const sortedNodes = Array.from(totalTime.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 50);
    const rowHeight = rect.height / sortedNodes.length;

    const rowIndex = Math.floor(y / rowHeight);
    const colIndex = Math.floor((x / rect.width) * timeBuckets);

    if (rowIndex >= 0 && rowIndex < sortedNodes.length && colIndex >= 0 && colIndex < timeBuckets) {
      const [nodeId] = sortedNodes[rowIndex];
      const node = profile.nodes.find((n) => n.id === nodeId);
      const time = timeRange.start + colIndex * bucketSize;

      setHoverInfo({
        x: e.clientX,
        y: e.clientY,
        node: node?.callFrame.functionName || "(anonymous)",
        time,
      });
    } else {
      setHoverInfo(null);
    }
  };

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", overflow: "auto" }}>
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "100%", display: "block" }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverInfo(null)}
      />
      {hoverInfo && (
        <div
          style={{
            position: "fixed",
            left: hoverInfo.x + 10,
            top: hoverInfo.y + 10,
            background: "#21262d",
            border: "1px solid #30363d",
            padding: "6px 8px",
            borderRadius: "4px",
            fontSize: "11px",
            fontFamily: "monospace",
            color: "#f0f6fc",
            pointerEvents: "none",
            zIndex: 1000,
          }}
        >
          <div>{hoverInfo.node}</div>
          <div style={{ color: "#8b949e", fontSize: "10px" }}>
            {(hoverInfo.time / 1000).toFixed(2)}ms
          </div>
        </div>
      )}
    </div>
  );
}
