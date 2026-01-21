export interface ProfileNode {
  id: number;
  callFrame: {
    functionName: string;
    scriptId: string;
    url: string;
    lineNumber: number;
    columnNumber: number;
  };
  hitCount?: number;
  children?: number[];
  positionTicks?: { line: number; ticks: number }[];
}

export interface CPUProfile {
  nodes: ProfileNode[];
  startTime: number;
  endTime: number;
  samples: number[];
  timeDeltas: number[];
}

export interface HotspotInfo {
  functionName: string;
  url: string;
  line: number;
  column: number;
  selfTime: number;
  totalTime: number;
  hitCount: number;
}
