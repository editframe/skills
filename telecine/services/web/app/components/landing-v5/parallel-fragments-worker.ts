/**
 * Web worker for Parallel Fragments R3F scene.
 *
 * This worker renders the Parallel Fragments visualization using React Three Fiber
 * in an offscreen canvas, enabling rendering to continue even when the browser
 * tab is hidden.
 */

import * as React from "react";
import { render } from "@react-three/offscreen";
import { ParallelFragmentsR3FScene } from "./parallel-fragments-r3f";

// Render the scene in the worker using @react-three/offscreen
render(React.createElement(ParallelFragmentsR3FScene));
