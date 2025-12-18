import { CanvasAPI } from '@editframe/elements';
import type { EFCanvas } from '../packages/elements/src/canvas/EFCanvas.js';
import type { EFPanZoom } from '../packages/elements/src/elements/EFPanZoom.js';
import type { EFTimegroup } from '../packages/elements/src/elements/EFTimegroup.js';
import type { EFHierarchy } from '../packages/elements/src/gui/hierarchy/EFHierarchy.js';
import type { EFTimeline } from '../packages/elements/src/gui/timeline/EFTimeline.js';

import '../packages/elements/src/canvas/EFCanvas.js';
import '../packages/elements/src/canvas/EFCanvasItem.js';
import '../packages/elements/src/elements/EFPanZoom.js';
import '../packages/elements/src/elements/EFTimegroup.js';
import '../packages/elements/src/elements/EFVideo.js';
import '../packages/elements/src/elements/EFThumbnailStrip.js';
import '../packages/elements/src/gui/hierarchy/EFHierarchy.js';
import '../packages/elements/src/gui/hierarchy/EFHierarchyItem.js';
import '../packages/elements/src/gui/timeline/EFTimeline.js';

import { findRootTemporal } from '../packages/elements/src/elements/findRootTemporal.js';

const canvas = document.getElementById('canvas') as EFCanvas | null;
const hierarchy = document.getElementById('hierarchy') as EFHierarchy | null;
const timeline = document.getElementById('timeline') as EFTimeline | null;
const activeLabel = document.getElementById('active-label');

if (!canvas) {
  throw new Error('Canvas element not found');
}

const api = new CanvasAPI(canvas);

let timegroupCounter = 3;

function updateActiveLabel(): void {
  if (!activeLabel) return;
  
  const selectedIds = api.getSelectedIds();
  if (selectedIds.length === 0) {
    activeLabel.textContent = 'None';
    return;
  }
  
  const selectedElement = document.getElementById(selectedIds[0]);
  if (selectedElement) {
    const rootTemporal = findRootTemporal(selectedElement);
    if (rootTemporal && rootTemporal.id) {
      activeLabel.textContent = rootTemporal.id;
    } else {
      activeLabel.textContent = 'None';
    }
  } else {
    activeLabel.textContent = 'None';
  }
}

function updateActiveContainerClass(): void {
  document.querySelectorAll('ef-timegroup').forEach(el => {
    el.classList.remove('active');
  });
  
  const selectedIds = api.getSelectedIds();
  if (selectedIds.length > 0) {
    const selectedElement = document.getElementById(selectedIds[0]);
    if (selectedElement) {
      // If selected element is a timegroup, mark it active
      if (selectedElement.tagName === 'EF-TIMEGROUP') {
        selectedElement.classList.add('active');
      } else {
        // Otherwise, find parent timegroup
        const timegroup = selectedElement.closest('ef-timegroup');
        if (timegroup) {
          timegroup.classList.add('active');
        }
      }
    }
  }
}

function updateTimelineTarget(): void {
  if (!timeline) return;
  
  const selectedIds = api.getSelectedIds();
  if (selectedIds.length > 0) {
    const selectedElement = document.getElementById(selectedIds[0]);
    if (selectedElement) {
      const rootTemporal = findRootTemporal(selectedElement);
      if (rootTemporal && rootTemporal.id) {
        timeline.target = rootTemporal.id;
      }
    }
  }
}

// Listen to selection change events from canvas
function setupSelectionListener(): void {
  if (canvas.selectionContext && canvas.selectionContext.addEventListener) {
    const handler = () => {
      updateActiveLabel();
      updateActiveContainerClass();
      updateTimelineTarget();
    };
    canvas.selectionContext.addEventListener("selectionchange", handler);
  }
}

if (hierarchy) {
  hierarchy.addEventListener('hierarchy-select', (e: Event) => {
    const customEvent = e as CustomEvent<{ elementId: string | null }>;
    const { elementId } = customEvent.detail;
    
    if (elementId) {
      api.select(elementId);
      updateActiveLabel();
      updateActiveContainerClass();
      updateTimelineTarget();
    }
  });

  hierarchy.addEventListener('hierarchy-reorder', (e: Event) => {
    const customEvent = e as CustomEvent<{
      sourceId: string;
      targetId: string;
      position: 'before' | 'after' | 'inside';
    }>;
    console.log('Hierarchy reorder:', customEvent.detail);
  });
}

// Cross-view hover sync: timeline <-> hierarchy <-> canvas
// Track current hover source to avoid infinite loops
let hoverSource: 'timeline' | 'hierarchy' | null = null;

function syncHover(element: HTMLElement | null, source: 'timeline' | 'hierarchy'): void {
  if (hoverSource && hoverSource !== source) {
    // Already syncing from another source, skip to avoid loops
    return;
  }
  hoverSource = source;
  
  try {
    // Update timeline
    if (timeline && source !== 'timeline') {
      (timeline as any).hoveredElement = element;
    }
    
    // Update hierarchy's hovered element via focusContext (if available)
    if (hierarchy && source !== 'hierarchy' && (hierarchy as any).focusedElement !== undefined) {
      (hierarchy as any).focusedElement = element;
    }
  } finally {
    hoverSource = null;
  }
}

// Listen to timeline hover events
if (timeline) {
  timeline.addEventListener('row-hover', (e: Event) => {
    const customEvent = e as CustomEvent<{ element: HTMLElement | null }>;
    syncHover(customEvent.detail.element, 'timeline');
  });
  
  // Timeline row-select events are handled internally via selectionContext
  // but we can also listen for them if needed
  timeline.addEventListener('row-select', (e: Event) => {
    const customEvent = e as CustomEvent<{ elementId: string; element: HTMLElement }>;
    // Timeline already calls selectionContext.select() internally
    // Update UI labels
    updateActiveLabel();
    updateActiveContainerClass();
    updateTimelineTarget();
  });
}

// Listen to hierarchy hover events
if (hierarchy) {
  hierarchy.addEventListener('hierarchy-hover', (e: Event) => {
    const customEvent = e as CustomEvent<{ element: HTMLElement | null }>;
    syncHover(customEvent.detail.element, 'hierarchy');
  });
}

const addTimegroupBtn = document.getElementById('add-timegroup');
if (addTimegroupBtn) {
  addTimegroupBtn.addEventListener('click', () => {
    timegroupCounter++;
    const id = `timegroup-${timegroupCounter}`;
    
    const timegroup = document.createElement('ef-timegroup');
    timegroup.id = id;
    timegroup.setAttribute('mode', 'fixed');
    timegroup.setAttribute('duration', '5s');
    timegroup.style.left = `${Math.random() * 800 + 100}px`;
    timegroup.style.top = `${Math.random() * 500 + 100}px`;
    timegroup.style.width = '400px';
    timegroup.style.height = '280px';
    timegroup.style.background = 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)';
    timegroup.style.display = 'flex';
    timegroup.style.alignItems = 'center';
    timegroup.style.justifyContent = 'center';
    timegroup.style.color = '#64748b';
    timegroup.style.fontSize = '14px';
    timegroup.textContent = 'Empty Timegroup';
    
    canvas.appendChild(timegroup);
    
    // Wait for timegroup to be ready and initialize it
    timegroup.updateComplete.then(async () => {
      await timegroup.waitForMediaDurations?.();
      if (timegroup.isRootTimegroup) {
        await timegroup.seek(0);
      }
    });
    
    // Select the new timegroup - timeline and hierarchy will derive from this
    api.select(id);
    updateActiveLabel();
    updateActiveContainerClass();
  });
}

const addElementBtn = document.getElementById('add-element');
if (addElementBtn) {
  addElementBtn.addEventListener('click', () => {
    const element = document.createElement('div');
    const id = `element-${Date.now()}`;
    element.id = id;
    element.className = 'canvas-element';
    element.textContent = `Element`;

    const colors = [
      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    ];

    element.style.left = `${Math.random() * 1000 + 100}px`;
    element.style.top = `${Math.random() * 700 + 100}px`;
    element.style.width = `${120 + Math.random() * 80}px`;
    element.style.height = `${80 + Math.random() * 60}px`;
    element.style.background = colors[Math.floor(Math.random() * colors.length)];

    canvas.appendChild(element);
  });
}

const deleteSelectedBtn = document.getElementById('delete-selected');
if (deleteSelectedBtn) {
  deleteSelectedBtn.addEventListener('click', () => {
    const selectedIds = api.getSelectedIds();
    if (selectedIds.length === 0) return;

    selectedIds.forEach(id => {
      const element = document.getElementById(id) || 
                      canvas.querySelector(`[data-element-id="${id}"]`);
      if (element) {
        element.remove();
      }
    });
    api.selectMultiple([]);
    updateActiveLabel();
    updateActiveContainerClass();
  });
}

const resetViewBtn = document.getElementById('reset-view');
if (resetViewBtn) {
  resetViewBtn.addEventListener('click', () => {
    const panZoom = document.getElementById('panzoom') as EFPanZoom | null;
    if (panZoom && panZoom.reset) {
      panZoom.reset();
    }
  });
}

// Initialize: wait for canvas to be ready, then select the first scene and initialize timegroups
async function initialize(): Promise<void> {
  await canvas.updateComplete;
  
  // Wait for all timegroups to be connected and ready
  const timegroups = Array.from(document.querySelectorAll('ef-timegroup')) as EFTimegroup[];
  await Promise.all(timegroups.map(tg => tg.updateComplete));
  
  // Wait for media durations to load
  await Promise.all(timegroups.map(tg => tg.waitForMediaDurations?.() || Promise.resolve()));
  
  // Seek all root timegroups to frame 0 to render first frame
  for (const timegroup of timegroups) {
    if (timegroup.isRootTimegroup) {
      await timegroup.seek(0);
    }
  }
  
  // Wait a bit more for all elements to be registered
  await new Promise(resolve => setTimeout(resolve, 100));
  
  const firstTimegroup = document.getElementById('timegroup-1');
  if (firstTimegroup) {
    api.select('timegroup-1');
  }
  
  // Start listening to selection changes
  setupSelectionListener();
}

initialize();
