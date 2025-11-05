// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("FRAMEGEN_BRIDGE", {
  onInitialize: (callback) => {
    console.log("trace: [BRIDGE] onInitialize registering callback");
    ipcRenderer.on(
      "initialize",
      (_event, renderOptions, traceContext, otelEndpoint) => {
        console.log(
          "trace: [BRIDGE] initialize",
          JSON.stringify(renderOptions, null, 2),
        );
        callback(renderOptions, traceContext, otelEndpoint);
      },
    );
  },
  initialized: () => {
    console.log("trace: [BRIDGE] initialized");
    ipcRenderer.send("initialized");
  },
  onBeginFrame: (callback) => {
    console.log("trace: [BRIDGE] onBeginFrame registering callback");
    ipcRenderer.on(
      "beginFrame",
      (_event, frameNumber, isLast, traceContext) => {
        console.log("trace: [BRIDGE] beginFrame", frameNumber, isLast);
        callback(frameNumber, isLast, traceContext);
      },
    );
  },
  onTriggerCanvas: (callback) => {
    console.log("trace: [BRIDGE] onTriggerCanvas registering callback");
    ipcRenderer.on("triggerCanvas", (_event, traceContext) => {
      console.log("trace: [BRIDGE] triggerCanvas");
      callback(traceContext);
    });
  },
  frameReady: (frameNumber, audioSamples) => {
    console.log("trace: [BRIDGE] frameReady", frameNumber, audioSamples);
    ipcRenderer.send("frame", frameNumber, audioSamples);
  },
  error: (error) => {
    console.log("trace: [BRIDGE] error", error);
    ipcRenderer.send("error", error);
  },
  uncaughtError: (error) => {
    console.log("trace: [BRIDGE] uncaughtError", error);
    ipcRenderer.send("uncaughtError", error);
  },
  syncLog: (sequence, message, callback) => {
    ipcRenderer.send("syncLog", sequence, message);
    ipcRenderer.once(`syncLogAck-${sequence}`, () => {
      callback();
    });
  },
  exportSpans: (endpoint, spans) => {
    ipcRenderer.send("exportSpans", endpoint, spans);
  },
});
