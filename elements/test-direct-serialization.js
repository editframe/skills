/**
 * Quick test function for direct serialization
 *
 * Usage in console:
 *   testDirectSerialization(500)  // Test at 500ms
 */
window.testDirectSerialization = async function (timeMs = 0) {
  // Remove any existing test overlay
  const existing = document.getElementById("test-frame-overlay");
  if (existing) {
    existing.remove();
  }

  // Get the timegroup from the workbench
  const workbench = document.querySelector("ef-workbench");
  if (!workbench) {
    console.error("No ef-workbench found");
    return;
  }

  const timegroup = workbench.querySelector("ef-timegroup");
  if (!timegroup) {
    console.error("No ef-timegroup found");
    return;
  }

  console.log(
    `[testDirectSerialization] Testing at ${timeMs}ms on timegroup:`,
    timegroup,
  );

  // Import the serialization module
  const { serializeTimelineToDataUri } =
    await import("./packages/elements/src/preview/rendering/serializeTimelineDirect.js");
  const { RenderContext } =
    await import("./packages/elements/src/preview/RenderContext.js");

  try {
    // Create a render clone
    const renderClone = timegroup.cloneForRender();

    // Create a container and attach to document
    const container = document.createElement("div");
    container.style.cssText = `
      position: fixed;
      width: 1920px;
      height: 1080px;
      overflow: hidden;
      background: #000;
    `;
    container.appendChild(renderClone);
    document.body.appendChild(container);

    // Force layout
    void renderClone.offsetHeight;

    // Seek to the specified time
    await renderClone.seekForRender(timeMs);

    // Serialize
    const renderContext = new RenderContext();
    const startTime = performance.now();

    const dataUri = await serializeTimelineToDataUri(renderClone, 1920, 1080, {
      renderContext,
      canvasScale: 1,
      timeMs: timeMs,
    });

    const serializeTime = performance.now() - startTime;
    console.log(
      `[testDirectSerialization] Serialized in ${serializeTime.toFixed(1)}ms, data URI length: ${dataUri.length}`,
    );

    // Clean up container
    container.remove();
    renderContext.dispose();

    // Create overlay to display the result
    const overlay = document.createElement("div");
    overlay.id = "test-frame-overlay";
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.9);
      z-index: 999999;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 20px;
      box-sizing: border-box;
    `;

    // Create close button
    const closeBtn = document.createElement("button");
    closeBtn.textContent = "Close (ESC)";
    closeBtn.style.cssText = `
      position: absolute;
      top: 20px;
      right: 20px;
      padding: 10px 20px;
      background: #f44336;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      font-weight: bold;
      z-index: 10;
    `;
    closeBtn.onclick = () => overlay.remove();

    // Create info panel
    const info = document.createElement("div");
    info.style.cssText = `
      position: absolute;
      top: 20px;
      left: 20px;
      background: rgba(255, 255, 255, 0.1);
      color: white;
      padding: 10px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 12px;
      z-index: 10;
    `;
    info.innerHTML = `
      <div><strong>Direct Serialization Test</strong></div>
      <div>Time: ${timeMs}ms</div>
      <div>Serialize: ${serializeTime.toFixed(1)}ms</div>
      <div>Data URI: ${(dataUri.length / 1024 / 1024).toFixed(2)}MB</div>
    `;

    // Create image
    const img = document.createElement("img");
    img.style.cssText = `
      max-width: 90vw;
      max-height: 90vh;
      object-fit: contain;
      border: 2px solid #4CAF50;
      box-shadow: 0 4px 20px rgba(0,0,0,0.5);
    `;

    img.onload = () => {
      console.log(
        `[testDirectSerialization] Image rendered: ${img.naturalWidth}x${img.naturalHeight}`,
      );
    };

    img.onerror = (e) => {
      console.error(`[testDirectSerialization] Image load failed:`, e);
      info.innerHTML += `<div style="color: #f44336">ERROR: Image failed to load</div>`;
    };

    img.src = dataUri;

    overlay.appendChild(closeBtn);
    overlay.appendChild(info);
    overlay.appendChild(img);
    document.body.appendChild(overlay);

    // ESC to close
    const escHandler = (e) => {
      if (e.key === "Escape") {
        overlay.remove();
        document.removeEventListener("keydown", escHandler);
      }
    };
    document.addEventListener("keydown", escHandler);

    console.log(
      `[testDirectSerialization] ✓ Test frame displayed. Press ESC or click Close to remove.`,
    );
  } catch (error) {
    console.error("[testDirectSerialization] Error:", error);
    throw error;
  }
};

console.log(
  "✓ testDirectSerialization() function loaded. Usage: testDirectSerialization(500)",
);
