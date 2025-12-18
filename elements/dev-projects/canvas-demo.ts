import { CanvasAPI } from '@editframe/elements';
import type { EFCanvas } from '../packages/elements/src/canvas/EFCanvas.js';
import type { EFPanZoom } from '../packages/elements/src/elements/EFPanZoom.js';
import type { EFTimegroup } from '../packages/elements/src/elements/EFTimegroup.js';
import type { EFHierarchy } from '../packages/elements/src/gui/hierarchy/EFHierarchy.js';

import '../packages/elements/src/canvas/EFCanvas.js';
import '../packages/elements/src/canvas/EFCanvasItem.js';
import '../packages/elements/src/elements/EFPanZoom.js';
import '../packages/elements/src/elements/EFTimegroup.js';
import '../packages/elements/src/elements/EFVideo.js';
import '../packages/elements/src/elements/EFThumbnailStrip.js';
import '../packages/elements/src/gui/hierarchy/EFHierarchy.js';
import '../packages/elements/src/gui/hierarchy/EFHierarchyItem.js';
import '../packages/elements/src/gui/timeline/EFTimeline.js';
import '../packages/elements/src/gui/EFActiveRootTemporal.js';

const canvas = document.getElementById('canvas') as EFCanvas | null;
const hierarchy = document.getElementById('hierarchy') as EFHierarchy | null;

if (!canvas) {
  throw new Error('Canvas element not found');
}

const api = new CanvasAPI(canvas);

let timegroupCounter = 3;

if (hierarchy) {
  // Hierarchy selection is already synced via selectionContext and sync-selection attribute
  // Just listen for reorder events for logging
  hierarchy.addEventListener('hierarchy-reorder', (e: Event) => {
    const customEvent = e as CustomEvent<{
      sourceId: string;
      targetId: string;
      position: 'before' | 'after' | 'inside';
    }>;
    console.log('Hierarchy reorder:', customEvent.detail);
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
    timegroup.setAttribute('auto-init', ''); // Use declarative auto-init
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
    
    // Select the new timegroup - timeline and hierarchy will derive from this automatically
    api.select(id);
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

const firstTimegroup = document.querySelector('ef-timegroup');
if (firstTimegroup.id) {
  api.select(firstTimegroup.id);
}
