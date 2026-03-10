/**
 * Web worker for JIT Streaming R3F scene.
 *
 * This worker renders the JIT Streaming visualization using React Three Fiber
 * in an offscreen canvas, enabling rendering to continue even when the browser
 * tab is hidden.
 */

import * as React from "react";
import { render } from "@react-three/offscreen";
import { JITStreamingScene } from "./jit-streaming-scene";

// Render the scene in the worker using @react-three/offscreen
render(React.createElement(JITStreamingScene));
