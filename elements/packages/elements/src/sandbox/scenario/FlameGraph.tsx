import React, { useRef, useEffect, useState } from "react";
import type { CPUProfile } from "./types.js";
import { buildCallTree, getTimeRange, type CallTreeNode } from "./profile-utils.js";

interface FlameGraphProps {
  profile: CPUProfile;
}

interface FlameFrame {
  node: CallTreeNode;
  x: number;
  y: number;
  width: number;
  height: number;
  depth: number;
}

export function FlameGraph({ profile }: FlameGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoverInfo, setHoverInfo] = useState<{
    x: number;
    y: number;
    frame: FlameFrame;
  } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const timeRange = getTimeRange(profile);
    const callTree = buildCallTree(profile);
    const frames: FlameFrame[] = [];
    const frameHeight = 20;
    const padding = 2;

    // Build flame frames from call tree
    function buildFrames(
      node: CallTreeNode,
      x: number,
      y: number,
      width: number,
      depth: number,
    ) {
      if (width < 1) return; // Skip frames that are too small

      frames.push({
        node,
        x,
        y,
        width,
        height: frameHeight - padding,
        depth,
      });

      if (node.children.length === 0) return;

      let currentX = x;
      for (const child of node.children) {
        const childWidth = (child.totalTime / timeRange.duration) * width;
        buildFrames(child, currentX, y + frameHeight, childWidth, depth + 1);
        currentX += childWidth;
      }
    }

    // Build frames starting from roots
    const totalWidth = 800; // Base width for rendering
    let currentX = 0;
    for (const root of callTree) {
      const rootWidth = (root.totalTime / timeRange.duration) * totalWidth;
      buildFrames(root, currentX, 0, rootWidth, 0);
      currentX += rootWidth;
    }

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const width = rect.width;
    const height = rect.height;

    // Clear canvas
    ctx.fillStyle = "#0d1117";
    ctx.fillRect(0, 0, width, height);

    // Calculate visible area with zoom and pan
    const scaleX = zoom;
    const offsetX = panX;
    const visibleWidth = width / scaleX;

    // Draw frames
    frames.forEach((frame) => {
      const screenX = (frame.x - offsetX) * scaleX;
      const screenWidth = frame.width * scaleX;

      // Skip if outside visible area
      if (screenX + screenWidth < 0 || screenX > width) return;

      // Color based on depth
      const hue = (frame.depth * 30) % 360;
      const saturation = 70;
      const lightness = 40 + (frame.depth % 3) * 10;
      ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
      ctx.strokeStyle = "#30363d";
      ctx.lineWidth = 1;

      ctx.fillRect(screenX, frame.y, screenWidth, frame.height);
      ctx.strokeRect(screenX, frame.y, screenWidth, frame.height);

      // Draw label if there's space
      if (screenWidth > 60) {
        ctx.fillStyle = "#f0f6fc";
        ctx.font = "10px monospace";
        const nodeName = frame.node.node.callFrame.functionName || "(anonymous)";
        const shortName = screenWidth > 100 ? nodeName : nodeName.slice(0, Math.floor(screenWidth / 6));
        ctx.fillText(shortName, screenX + 4, frame.y + frame.height / 2 + 3);
      }
    });

    // Draw time scale at bottom
    ctx.strokeStyle = "#30363d";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height - 20);
    ctx.lineTo(width, height - 20);
    ctx.stroke();

    ctx.fillStyle = "#8b949e";
    ctx.font = "9px monospace";
    for (let i = 0; i <= 5; i++) {
      const time = timeRange.start + (timeRange.duration * i) / 5;
      const x = (width * i) / 5;
      ctx.fillText(`${(time / 1000).toFixed(1)}ms`, x + 2, height - 4);
    }
  }, [profile, zoom, panX]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const timeRange = getTimeRange(profile);
    const callTree = buildCallTree(profile);
    const frames: FlameFrame[] = [];
    const frameHeight = 20;

    function buildFrames(
      node: CallTreeNode,
      xPos: number,
      yPos: number,
      width: number,
      depth: number,
    ) {
      if (width < 1) return;

      frames.push({
        node,
        x: xPos,
        y: yPos,
        width,
        height: frameHeight - 2,
        depth,
      });

      if (node.children.length === 0) return;

      let currentX = xPos;
      for (const child of node.children) {
        const childWidth = (child.totalTime / timeRange.duration) * width;
        buildFrames(child, currentX, yPos + frameHeight, childWidth, depth + 1);
        currentX += childWidth;
      }
    }

    const totalWidth = 800;
    let currentX = 0;
    for (const root of callTree) {
      const rootWidth = (root.totalTime / timeRange.duration) * totalWidth;
      buildFrames(root, currentX, 0, rootWidth, 0);
      currentX += rootWidth;
    }

    const scaleX = zoom;
    const offsetX = panX;

    const hoveredFrame = frames.find((frame) => {
      const screenX = (frame.x - offsetX) * scaleX;
      const screenWidth = frame.width * scaleX;
      return (
        x >= screenX &&
        x <= screenX + screenWidth &&
        y >= frame.y &&
        y <= frame.y + frame.height
      );
    });

    if (hoveredFrame) {
      setHoverInfo({
        x: e.clientX,
        y: e.clientY,
        frame: hoveredFrame,
      });
    } else {
      setHoverInfo(null);
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom((prev) => Math.max(0.1, Math.min(10, prev * delta)));
  };

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", overflow: "auto" }}>
      <div
        style={{
          padding: "8px",
          background: "#161b22",
          borderBottom: "1px solid #30363d",
          display: "flex",
          gap: "8px",
          alignItems: "center",
        }}
      >
        <button
          onClick={() => setZoom((prev) => Math.max(0.1, prev * 0.9))}
          style={{
            padding: "4px 8px",
            background: "#21262d",
            border: "1px solid #30363d",
            color: "#f0f6fc",
            borderRadius: "3px",
            cursor: "pointer",
            fontSize: "11px",
          }}
        >
          Zoom Out
        </button>
        <button
          onClick={() => setZoom((prev) => Math.min(10, prev * 1.1))}
          style={{
            padding: "4px 8px",
            background: "#21262d",
            border: "1px solid #30363d",
            color: "#f0f6fc",
            borderRadius: "3px",
            cursor: "pointer",
            fontSize: "11px",
          }}
        >
          Zoom In
        </button>
        <button
          onClick={() => {
            setZoom(1);
            setPanX(0);
          }}
          style={{
            padding: "4px 8px",
            background: "#21262d",
            border: "1px solid #30363d",
            color: "#f0f6fc",
            borderRadius: "3px",
            cursor: "pointer",
            fontSize: "11px",
          }}
        >
          Reset
        </button>
        <span style={{ fontSize: "11px", color: "#8b949e", marginLeft: "8px" }}>
          Zoom: {(zoom * 100).toFixed(0)}%
        </span>
      </div>
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "calc(100% - 40px)", display: "block" }}
        onMouseMove={handleMouseMove}
        onWheel={handleWheel}
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
          <div>{hoverInfo.frame.node.node.callFrame.functionName || "(anonymous)"}</div>
          <div style={{ color: "#8b949e", fontSize: "10px" }}>
            Self: {(hoverInfo.frame.node.selfTime / 1000).toFixed(2)}ms
          </div>
          <div style={{ color: "#8b949e", fontSize: "10px" }}>
            Total: {(hoverInfo.frame.node.totalTime / 1000).toFixed(2)}ms
          </div>
          <div style={{ color: "#8b949e", fontSize: "10px" }}>
            {hoverInfo.frame.node.node.callFrame.url.split("/").pop()}:{hoverInfo.frame.node.node.callFrame.lineNumber + 1}
          </div>
        </div>
      )}
    </div>
  );
}
