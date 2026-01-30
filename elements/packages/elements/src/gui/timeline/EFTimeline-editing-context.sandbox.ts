import { html } from "lit";
import "../../elements/EFTimegroup.js";
import "../../elements/EFVideo.js";
import "../../elements/EFAudio.js";
import "../../elements/EFText.js";
import "../../canvas/EFCanvas.js";
import "./EFTimeline.js";

export default {
  title: "Timeline / Editing Context",
  category: "gui",
  render: () => html`
    <style>
      body {
        margin: 0;
        padding: 20px;
        background: #1e293b;
        font-family: system-ui;
      }
      .container {
        display: flex;
        flex-direction: column;
        gap: 20px;
        height: calc(100vh - 40px);
      }
      .canvas-container {
        flex: 1;
        min-height: 400px;
        border: 1px solid #475569;
        border-radius: 8px;
        overflow: hidden;
      }
      .timeline-container {
        height: 300px;
        border: 1px solid #475569;
        border-radius: 8px;
        overflow: hidden;
      }
      .instructions {
        background: #334155;
        padding: 16px;
        border-radius: 8px;
        color: #e2e8f0;
        font-size: 14px;
        line-height: 1.6;
      }
      .instructions h3 {
        margin: 0 0 12px 0;
        color: #3b82f6;
        font-size: 16px;
      }
      .instructions ul {
        margin: 8px 0;
        padding-left: 20px;
      }
      .instructions li {
        margin: 4px 0;
      }
      .instructions code {
        background: #1e293b;
        padding: 2px 6px;
        border-radius: 4px;
        font-family: 'SF Mono', monospace;
        color: #60a5fa;
      }
    </style>

    <div class="container">
      <div class="instructions">
        <h3>🧪 Testing Editing Context - Hover Blocking During Scrubbing</h3>
        <p><strong>Before the fix:</strong> While scrubbing the playhead, hovering over timeline rows would cause them to flash and highlight.</p>
        <p><strong>After the fix:</strong> Hover interactions are blocked during scrubbing and trimming operations.</p>
        <ul>
          <li><strong>Test scrubbing:</strong> Click and drag the playhead in the ruler or timeline. Move your cursor over different rows while dragging. Rows should NOT highlight.</li>
          <li><strong>Test normal hover:</strong> Release the drag, then hover over rows. They SHOULD highlight normally.</li>
          <li><strong>Test trimming:</strong> Enable trim handles (if visible), drag a trim handle while moving over rows. Rows should NOT highlight.</li>
        </ul>
        <p>Open the browser console to see editing context state changes: <code>idle</code> → <code>scrubbing</code> → <code>idle</code></p>
      </div>

      <div class="canvas-container">
        <ef-canvas id="canvas" style="width: 100%; height: 100%;">
          <ef-timegroup id="composition" mode="fixed" duration="10s">
            <ef-video
              id="video1"
              src="https://editframe-public.s3.us-east-2.amazonaws.com/samples/big-buck-bunny-short.mp4"
              duration="5s"
              start="0s"
            ></ef-video>
            <ef-text
              id="title"
              start="1s"
              duration="3s"
              style="
                font-size: 48px;
                font-weight: bold;
                color: white;
                text-align: center;
                top: 50%;
                transform: translateY(-50%);
              "
            >
              Editing Context Test
            </ef-text>
            <ef-audio
              id="music"
              src="https://editframe-public.s3.us-east-2.amazonaws.com/samples/audio-sample.mp3"
              duration="8s"
              start="0s"
            ></ef-audio>
            <ef-video
              id="video2"
              src="https://editframe-public.s3.us-east-2.amazonaws.com/samples/big-buck-bunny-short.mp4"
              duration="4s"
              start="5s"
            ></ef-video>
          </ef-timegroup>
        </ef-canvas>
      </div>

      <div class="timeline-container">
        <ef-timeline
          control-target="composition"
          show-controls
          show-ruler
          show-hierarchy
          show-playhead
          pixels-per-ms="0.08"
          style="width: 100%; height: 100%;"
        ></ef-timeline>
      </div>
    </div>

    <script type="module">
      // Log editing context state changes for debugging
      const timeline = document.querySelector('ef-timeline');
      
      // Poll editing context state and log changes
      let lastMode = 'idle';
      setInterval(() => {
        const currentMode = timeline._editingContext?.state.mode;
        if (currentMode !== lastMode) {
          console.log(\`🎬 Editing context: \${lastMode} → \${currentMode}\`);
          if (currentMode === 'scrubbing') {
            console.log('   ⛔ Hover interactions BLOCKED');
          } else if (currentMode === 'trimming') {
            console.log('   ⛔ Hover interactions BLOCKED');
          } else if (currentMode === 'idle') {
            console.log('   ✅ Hover interactions ALLOWED');
          }
          lastMode = currentMode;
        }
      }, 100);
    </script>
  `,
};
