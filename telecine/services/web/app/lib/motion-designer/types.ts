export interface ElementNode {
  id: string;
  type: string;
  props: Record<string, any>;
  animations: Animation[];
  childIds: string[];
}

export interface Animation {
  id: string;
  property: string;
  fromValue: string;
  toValue: string;
  duration: number;
  delay: number;
  easing: string;
  fillMode: string;
  name: string;
}

export interface MotionDesignerState {
  composition: {
    elements: Record<string, ElementNode>;
    rootTimegroupIds: string[];
  };
  ui: {
    selectedElementId: string | null;
    selectedAnimationId: string | null;
    selectedElementAnimationId: string | null;
    activeRootTimegroupId: string | null;
    currentTime: number;
    placementMode: string | null;
    canvasTransform: {
      x: number;
      y: number;
      scale: number;
    };
    compositionName?: string;
  };
}

