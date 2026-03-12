import { makeTestAgent } from "TEST/util/test";
import {
  processTestVideoAsset,
  renderWithElectronStandalone,
} from "./test-utils";
import { valkey } from "../../../valkey/valkey";

const testAgent = await makeTestAgent("render-test@example.org");
const barsNTone = await processTestVideoAsset("bars-n-tone.mp4", testAgent);
const cardJoker = await processTestVideoAsset("card-joker.mp3", testAgent);

const simpleTemplate = /* HTML */ `
  <ef-timegroup class="w-[480px] h-[270px]" mode="contain">
    <ef-video asset-id="${barsNTone.id}" id="bars-n-tone" class="w-full" sourceIn="0s" sourceOut="4s"></ef-video>
    <h1 style="animation: spin 1s linear infinite;" class="inline-block w-[100px] h-[100px] bg-red-500">HELLO</h1>
    <!-- <ef-waveform target="bars-n-tone" mode="bars" class="color-red-500 absolute top-0 left-0 w-full h-full block"></ef-waveform> -->
  </ef-timegroup>
  <style>
    @keyframes spin {
      from {
        transform: rotate(0deg);
      }
      to {
        transform: rotate(360deg);
      }
    }
  </style>
`;

const waveformAudioTemplate = /* HTML */ `
<ef-timegroup class="w-[160px] h-[90px] relative" mode="fixed" duration="3s">
  <ef-audio asset-id="${cardJoker.id}" id="test-audio"></ef-audio>
  <ef-waveform target="test-audio" mode="bars" class="color-red-500 bg-yellow-100 absolute top-0 left-0 w-full h-full block"></ef-waveform>
  <h1>THE JOKER</h1>
</ef-timegroup>
`;

try {
  // await renderToStill(simpleTemplate, testAgent);
  await renderWithElectronStandalone({ html: simpleTemplate, testAgent });

  console.log("✅ Render test completed successfully");
} catch (error) {
  console.error("❌ Render test failed:", error);
  process.exitCode = 1;
} finally {
  // Clean up resources
  await valkey.quit();
}
