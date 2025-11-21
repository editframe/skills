import type { Route } from "./+types/motion-path";
import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Timegroup, Preview } from "@editframe/react";
import { TimelineControls } from "./shared";

interface Point {
  x: number;
  y: number;
}

interface PathPoint {
  id: string;
  x: number;
  y: number;
  cp1?: Point;
  cp2?: Point;
}

interface TimingPoint {
  id: string;
  pathPosition: number; // 0-1 along path
  time: number; // seconds
}

const CANVAS_WIDTH = 1400;
const CANVAS_HEIGHT = 800;

// Generate smooth path from points using cubic bezier curves
function generatePath(points: PathPoint[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  
  let path = `M ${points[0].x} ${points[0].y}`;
  
  for (let i = 1; i < points.length; i++) {
    const curr = points[i];
    const prev = points[i - 1];
    
    if (curr.cp1 && curr.cp2) {
      // Cubic bezier
      path += ` C ${curr.cp1.x} ${curr.cp1.y}, ${curr.cp2.x} ${curr.cp2.y}, ${curr.x} ${curr.y}`;
    } else {
      // Straight line
      path += ` L ${curr.x} ${curr.y}`;
    }
  }
  
  return path;
}

// Calculate point on path at given distance
function getPointAtDistance(pathString: string, distance: number): Point | null {
  if (!pathString) return null;
  try {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", pathString);
    const totalLength = path.getTotalLength();
    const point = path.getPointAtLength(distance * totalLength);
    return { x: point.x, y: point.y };
  } catch {
    return null;
  }
}

// Calculate animation offset at given time
function calculateOffsetAtTime(timingPoints: TimingPoint[], currentTime: number, duration: number): number {
  if (timingPoints.length === 0) {
    return (currentTime / duration) * 100;
  }
  
  const sorted = [...timingPoints].sort((a, b) => a.time - b.time);
  
  // Find which segment we're in
  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];
    
    if (next && currentTime >= current.time && currentTime <= next.time) {
      // Interpolate between timing points
      const segmentProgress = (currentTime - current.time) / (next.time - current.time);
      const pathProgress = current.pathPosition + (next.pathPosition - current.pathPosition) * segmentProgress;
      return pathProgress * 100;
    }
  }
  
  // Before first point or after last point
  if (currentTime <= sorted[0].time) {
    return (currentTime / sorted[0].time) * sorted[0].pathPosition * 100;
  }
  
  const lastPoint = sorted[sorted.length - 1];
  if (currentTime >= lastPoint.time) {
    const remainingTime = duration - lastPoint.time;
    const remainingPath = 1 - lastPoint.pathPosition;
    const progress = (currentTime - lastPoint.time) / remainingTime;
    return (lastPoint.pathPosition + remainingPath * progress) * 100;
  }
  
  return 0;
}

export default function MotionPath(_props: Route.ComponentProps) {
  // Initial demo path with nice curves
  const [pathPoints, setPathPoints] = useState<PathPoint[]>([
    { id: "p1", x: 200, y: 400, cp1: undefined, cp2: undefined },
    { id: "p2", x: 500, y: 200, cp1: { x: 300, y: 250 }, cp2: { x: 400, y: 220 } },
    { id: "p3", x: 900, y: 400, cp1: { x: 700, y: 600 }, cp2: { x: 800, y: 500 } },
    { id: "p4", x: 1200, y: 400, cp1: undefined, cp2: undefined },
  ]);
  
  const [timingPoints, setTimingPoints] = useState<TimingPoint[]>([
    { id: "t1", pathPosition: 0.33, time: 1.5 },
    { id: "t2", pathPosition: 0.66, time: 3.5 },
  ]);
  
  const [duration, setDuration] = useState(5);
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  const [selectedHandle, setSelectedHandle] = useState<'cp1' | 'cp2' | null>(null);
  const [selectedTimingId, setSelectedTimingId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartPos, setDragStartPos] = useState<Point | null>(null);
  const [offsetDistance, setOffsetDistance] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  
  const svgRef = useRef<SVGSVGElement>(null);
  const timegroupRef = useRef<any>(null);
  
  const path = useMemo(() => generatePath(pathPoints), [pathPoints]);
  
  // Client-side only rendering for timing points (to avoid hydration errors)
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  // Sync animation with timeline
  useEffect(() => {
    const setup = () => {
      if (!timegroupRef.current || typeof timegroupRef.current.addFrameTask !== 'function') {
        return;
      }
      
      const cleanup = timegroupRef.current.addFrameTask((info: any) => {
        const currentTime = info.ownCurrentTimeMs / 1000;
        const offset = calculateOffsetAtTime(timingPoints, currentTime, duration);
        setOffsetDistance(offset);
      });
      
      return cleanup;
    };
    
    setup();
    const timeoutId = setTimeout(setup, 100);
    
    return () => {
      clearTimeout(timeoutId);
    };
  }, [timingPoints, duration]);
  
  // Mouse interaction handlers
  const handleMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    
    const rect = svgRef.current.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    setDragStartPos({ x, y });
    
    // Check if clicking on bezier control handles first
    let clickedPointId: string | null = null;
    let clickedHandle: 'cp1' | 'cp2' | null = null;
    let minDist = Infinity;
    
    pathPoints.forEach(point => {
      if (point.cp1) {
        const dist = Math.sqrt(Math.pow(point.cp1.x - x, 2) + Math.pow(point.cp1.y - y, 2));
        if (dist < 15 && dist < minDist) {
          minDist = dist;
          clickedPointId = point.id;
          clickedHandle = 'cp1';
        }
      }
      if (point.cp2) {
        const dist = Math.sqrt(Math.pow(point.cp2.x - x, 2) + Math.pow(point.cp2.y - y, 2));
        if (dist < 15 && dist < minDist) {
          minDist = dist;
          clickedPointId = point.id;
          clickedHandle = 'cp2';
        }
      }
    });
    
    if (clickedPointId && clickedHandle) {
      setSelectedPointId(clickedPointId);
      setSelectedHandle(clickedHandle);
      setSelectedTimingId(null);
      setIsDragging(true);
      return;
    }
    
    // Check if clicking on a path point
    minDist = Infinity;
    
    pathPoints.forEach(point => {
      const dist = Math.sqrt(Math.pow(point.x - x, 2) + Math.pow(point.y - y, 2));
      if (dist < 20 && dist < minDist) {
        minDist = dist;
        clickedPointId = point.id;
      }
    });
    
    if (clickedPointId) {
      setSelectedPointId(clickedPointId);
      setSelectedHandle(null);
      setSelectedTimingId(null);
      setIsDragging(true);
      return;
    }
    
    // Check if clicking on a timing point
    let clickedTimingId: string | null = null;
    minDist = Infinity;
    
    timingPoints.forEach(tp => {
      const pointOnPath = getPointAtDistance(path, tp.pathPosition);
      if (pointOnPath) {
        const dist = Math.sqrt(Math.pow(pointOnPath.x - x, 2) + Math.pow(pointOnPath.y - y, 2));
        if (dist < 25 && dist < minDist) {
          minDist = dist;
          clickedTimingId = tp.id;
        }
      }
    });
    
    if (clickedTimingId) {
      setSelectedTimingId(clickedTimingId);
      setSelectedPointId(null);
      setSelectedHandle(null);
      setIsDragging(true);
      return;
    }
    
    // Deselect if clicking empty space
    setSelectedPointId(null);
    setSelectedHandle(null);
    setSelectedTimingId(null);
  }, [pathPoints, timingPoints, path]);
  
  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDragging || !svgRef.current) return;
    
    const rect = svgRef.current.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    if (selectedPointId && selectedHandle) {
      // Moving a bezier control handle
      setPathPoints(prev => prev.map(p => {
        if (p.id === selectedPointId) {
          return {
            ...p,
            [selectedHandle]: { 
              x: Math.max(0, Math.min(CANVAS_WIDTH, x)), 
              y: Math.max(0, Math.min(CANVAS_HEIGHT, y)) 
            }
          };
        }
        return p;
      }));
    } else if (selectedPointId) {
      // Moving the anchor point
      setPathPoints(prev => prev.map(p => 
        p.id === selectedPointId 
          ? { ...p, x: Math.max(0, Math.min(CANVAS_WIDTH, x)), y: Math.max(0, Math.min(CANVAS_HEIGHT, y)) }
          : p
      ));
    } else if (selectedTimingId) {
      // Moving a timing point along the path
      if (!path) return;
      
      try {
        const pathElement = document.createElementNS("http://www.w3.org/2000/svg", "path");
        pathElement.setAttribute("d", path);
        const totalLength = pathElement.getTotalLength();
        
        // Find closest point on path
        let closestDistance = 0;
        let minDist = Infinity;
        
        for (let i = 0; i <= 100; i++) {
          const testDist = (i / 100) * totalLength;
          const point = pathElement.getPointAtLength(testDist);
          const dist = Math.sqrt(Math.pow(point.x - x, 2) + Math.pow(point.y - y, 2));
          
          if (dist < minDist) {
            minDist = dist;
            closestDistance = i / 100;
          }
        }
        
        setTimingPoints(prev => prev.map(tp =>
          tp.id === selectedTimingId
            ? { ...tp, pathPosition: closestDistance }
            : tp
        ));
      } catch (e) {
        console.error("Error moving timing point:", e);
      }
    }
  }, [isDragging, selectedPointId, selectedHandle, selectedTimingId, path]);
  
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);
  
  const handleAddPoint = useCallback(() => {
    const newPoint: PathPoint = {
      id: `p${Date.now()}`,
      x: CANVAS_WIDTH / 2,
      y: CANVAS_HEIGHT / 2,
    };
    setPathPoints(prev => [...prev, newPoint]);
  }, []);
  
  const handleAddTimingPoint = useCallback(() => {
    const newTimingPoint: TimingPoint = {
      id: `t${Date.now()}`,
      pathPosition: 0.5,
      time: duration / 2,
    };
    setTimingPoints(prev => [...prev, newTimingPoint].sort((a, b) => a.time - b.time));
  }, [duration]);
  
  const handleDeleteSelected = useCallback(() => {
    if (selectedPointId && pathPoints.length > 2) {
      setPathPoints(prev => prev.filter(p => p.id !== selectedPointId));
      setSelectedPointId(null);
    }
    if (selectedTimingId) {
      setTimingPoints(prev => prev.filter(tp => tp.id !== selectedTimingId));
      setSelectedTimingId(null);
    }
  }, [selectedPointId, selectedTimingId, pathPoints.length]);
  
  const handleConvertToCurve = useCallback(() => {
    if (!selectedPointId) return;
    
    setPathPoints(prev => prev.map(p => {
      if (p.id === selectedPointId && !p.cp1 && !p.cp2) {
        // Add default control handles offset from the anchor point
        return {
          ...p,
          cp1: { x: p.x - 80, y: p.y - 40 },
          cp2: { x: p.x + 80, y: p.y - 40 },
        };
      }
      return p;
    }));
  }, [selectedPointId]);
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedPointId || selectedTimingId) {
          e.preventDefault();
          handleDeleteSelected();
        }
      } else if (e.key === 'Escape') {
        setSelectedPointId(null);
        setSelectedTimingId(null);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDeleteSelected, selectedPointId, selectedTimingId]);
  
  return (
    <div className="w-full h-screen flex flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <div className="bg-slate-900/80 backdrop-blur-sm border-b border-slate-700/50 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Motion Path Editor</h1>
          <p className="text-sm text-slate-400 mt-1">Create and customize CSS motion path animations</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={handleAddPoint}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-all shadow-lg hover:shadow-xl"
          >
            + Add Path Point
          </button>
          
          <button
            onClick={handleAddTimingPoint}
            className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-sm font-medium transition-all shadow-lg hover:shadow-xl"
          >
            + Add Timing Point
          </button>
          
          {selectedPointId && !pathPoints.find(p => p.id === selectedPointId)?.cp1 && (
            <button
              onClick={handleConvertToCurve}
              className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg text-sm font-medium transition-all shadow-lg hover:shadow-xl"
            >
              ↗ Convert to Curve
            </button>
          )}
          
          {(selectedPointId || selectedTimingId) && (
            <button
              onClick={handleDeleteSelected}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-all shadow-lg hover:shadow-xl"
            >
              Delete Selected
            </button>
          )}
          
          <div className="flex items-center gap-2 bg-slate-800/50 rounded-lg px-4 py-2 border border-slate-700/50">
            <label className="text-sm text-slate-300 font-medium">Duration:</label>
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(Math.max(0.5, parseFloat(e.target.value) || 1))}
              min="0.5"
              max="20"
              step="0.5"
              className="w-16 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-sm text-white focus:border-blue-500 focus:outline-none"
            />
            <span className="text-sm text-slate-400">sec</span>
          </div>
        </div>
      </div>
      
      {/* Main Canvas */}
      <div className="flex-1 relative overflow-hidden">
        <Timegroup
          ref={timegroupRef}
          mode="fixed"
          duration={`${duration}s`}
          id="motion-path-preview"
          className="w-full h-full"
        >
          <div 
            className="w-full h-full relative flex items-center justify-center" 
            style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)" }}
          >
            {/* Container that matches SVG viewBox exactly */}
            <div 
              style={{ 
                width: `${CANVAS_WIDTH}px`,
                height: `${CANVAS_HEIGHT}px`,
                position: 'relative',
              }}
            >
              <style dangerouslySetInnerHTML={{ __html: `
                .motion-path-element {
                  offset-path: path("${path}");
                  offset-anchor: 50% 50%;
                  width: 80px;
                  height: 80px;
                  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                  border-radius: 50%;
                  box-shadow: 0 20px 60px rgba(102, 126, 234, 0.6), 0 0 40px rgba(118, 75, 162, 0.4);
                  position: absolute;
                }
                
                @keyframes pulse {
                  0%, 100% { box-shadow: 0 20px 60px rgba(102, 126, 234, 0.6), 0 0 40px rgba(118, 75, 162, 0.4); }
                  50% { box-shadow: 0 20px 80px rgba(102, 126, 234, 0.8), 0 0 60px rgba(118, 75, 162, 0.6); }
                }
                
                .motion-path-element {
                  animation: pulse 2s ease-in-out infinite;
                }
              ` }} />
              
              {/* Animated element */}
              <div
                className="motion-path-element"
                style={{ 
                  offsetDistance: `${offsetDistance}%`,
                  offsetRotate: '0deg',
                }}
              />
            
              {/* SVG Canvas for path editing */}
              <svg
                ref={svgRef}
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
                viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
                preserveAspectRatio="none"
                className="absolute top-0 left-0 cursor-default"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
              {/* Subtle grid */}
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(148, 163, 184, 0.1)" strokeWidth="0.5"/>
                </pattern>
                
                <filter id="glow">
                  <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              
              <rect width="100%" height="100%" fill="url(#grid)" opacity="0.3" />
              
              {/* Motion path with glow */}
              {path && (
                <>
                  <path
                    d={path}
                    fill="none"
                    stroke="rgba(59, 130, 246, 0.3)"
                    strokeWidth="16"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    filter="url(#glow)"
                  />
                  <path
                    d={path}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </>
              )}
              
              {/* Timing points - client-side only to avoid hydration errors */}
              {isMounted && timingPoints.map(tp => {
                const pointOnPath = getPointAtDistance(path, tp.pathPosition);
                if (!pointOnPath) return null;
                
                const isSelected = selectedTimingId === tp.id;
                
                return (
                  <g key={tp.id}>
                    {/* Selection ring */}
                    {isSelected && (
                      <circle
                        cx={pointOnPath.x}
                        cy={pointOnPath.y}
                        r="28"
                        fill="none"
                        stroke="#a855f7"
                        strokeWidth="3"
                        opacity="0.6"
                        className="pointer-events-none"
                      />
                    )}
                    
                    {/* Timing marker */}
                    <circle
                      cx={pointOnPath.x}
                      cy={pointOnPath.y}
                      r={isSelected ? 14 : 12}
                      fill="#0f172a"
                      stroke={isSelected ? "#a855f7" : "#c084fc"}
                      strokeWidth="4"
                      className="cursor-pointer transition-all"
                    />
                    <circle
                      cx={pointOnPath.x}
                      cy={pointOnPath.y}
                      r={isSelected ? 8 : 6}
                      fill={isSelected ? "#a855f7" : "#c084fc"}
                      className="cursor-pointer pointer-events-none"
                    />
                    
                    {/* Time label */}
                    <text
                      x={pointOnPath.x}
                      y={pointOnPath.y - 40}
                      textAnchor="middle"
                      className="pointer-events-none select-none"
                      fill="#c084fc"
                      fontSize="16"
                      fontWeight="bold"
                    >
                      {tp.time.toFixed(1)}s
                    </text>
                  </g>
                );
              })}
              
              {/* Path points */}
              {pathPoints.map((point, index) => {
                const isSelected = selectedPointId === point.id;
                
                return (
                  <g key={point.id}>
                    {/* Bezier control handles */}
                    {isSelected && point.cp1 && (
                      <>
                        <line
                          x1={point.x}
                          y1={point.y}
                          x2={point.cp1.x}
                          y2={point.cp1.y}
                          stroke="#93c5fd"
                          strokeWidth="2"
                          strokeDasharray="4,4"
                          opacity="0.6"
                        />
                        <circle
                          cx={point.cp1.x}
                          cy={point.cp1.y}
                          r={selectedHandle === 'cp1' ? 10 : 8}
                          fill={selectedHandle === 'cp1' ? "#60a5fa" : "#93c5fd"}
                          stroke="white"
                          strokeWidth="2"
                          className="cursor-pointer transition-all"
                        />
                      </>
                    )}
                    
                    {isSelected && point.cp2 && (
                      <>
                        <line
                          x1={point.x}
                          y1={point.y}
                          x2={point.cp2.x}
                          y2={point.cp2.y}
                          stroke="#93c5fd"
                          strokeWidth="2"
                          strokeDasharray="4,4"
                          opacity="0.6"
                        />
                        <circle
                          cx={point.cp2.x}
                          cy={point.cp2.y}
                          r={selectedHandle === 'cp2' ? 10 : 8}
                          fill={selectedHandle === 'cp2' ? "#60a5fa" : "#93c5fd"}
                          stroke="white"
                          strokeWidth="2"
                          className="cursor-pointer transition-all"
                        />
                      </>
                    )}
                    
                    {/* Selection ring */}
                    {isSelected && (
                      <circle
                        cx={point.x}
                        cy={point.y}
                        r="24"
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="3"
                        opacity="0.6"
                        className="pointer-events-none"
                      />
                    )}
                    
                    {/* Path point */}
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r={isSelected ? 14 : 12}
                      fill={isSelected ? "#3b82f6" : "#1e40af"}
                      stroke="white"
                      strokeWidth="4"
                      className="cursor-pointer transition-all hover:r-16"
                    />
                    
                    {/* Point label */}
                    <text
                      x={point.x}
                      y={point.y - 28}
                      textAnchor="middle"
                      className="pointer-events-none select-none"
                      fill="white"
                      fontSize="14"
                      fontWeight="bold"
                    >
                      {index + 1}
                    </text>
                  </g>
                );
              })}
              </svg>
            </div>
          </div>
        </Timegroup>
      </div>
      
      {/* Timeline Controls */}
      <div className="bg-slate-900/80 backdrop-blur-sm border-t border-slate-700/50 px-6 py-4">
        <TimelineControls target="motion-path-preview" />
      </div>
      
      {/* Info Panel */}
      <div className="bg-slate-900/80 backdrop-blur-sm border-t border-slate-700/50 px-6 py-3 flex items-center justify-between text-sm">
        <div className="flex items-center gap-6 text-slate-400">
          <div>
            <span className="font-medium text-slate-300">Path Points:</span> {pathPoints.length}
          </div>
          <div>
            <span className="font-medium text-slate-300">Timing Points:</span> {timingPoints.length}
          </div>
          {selectedPointId && (
            <div className="text-blue-400 font-medium">
              Path point selected
            </div>
          )}
          {selectedTimingId && (
            <div className="text-purple-400 font-medium">
              Timing point selected
            </div>
          )}
        </div>
        
        <div className="text-slate-500 text-xs">
          Click points to select • Drag to move • Delete/Backspace to remove • Esc to deselect
        </div>
      </div>
    </div>
  );
}
