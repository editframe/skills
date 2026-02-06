/**
 * Web worker for Parallel Fragments R3F scene.
 * 
 * This worker renders the Parallel Fragments visualization using React Three Fiber
 * in an offscreen canvas, enabling rendering to continue even when the browser
 * tab is hidden.
 */

import * as React from 'react';
import { renderOffscreen } from '@editframe/react/r3f';
import { ParallelFragmentsR3FScene } from './parallel-fragments-r3f';

// Render the scene in the worker
renderOffscreen(React.createElement(ParallelFragmentsR3FScene));
