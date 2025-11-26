import { makeTestAgent } from "TEST/util/test";
import {
  processTestVideoAsset,
  renderToBuffersWithMetadata,
  renderToStill,
} from "./test-utils";
import { ElectronEngineManager } from "./shared/ElectronEngineManager";
import { valkey } from "@/valkey/valkey";

const testAgent = await makeTestAgent("render-test@example.org");
const barsNTone = await processTestVideoAsset("bars-n-tone.mp4", testAgent);
const cardJoker = await processTestVideoAsset("card-joker.mp3", testAgent);

const simpleTemplate = /* HTML */ `
  <ef-timegroup class="w-[500px] h-[500px]" mode="contain">
    <ef-video asset-id="${barsNTone.id}" id="bars-n-tone" class="w-full" sourceOut="1s"></ef-video>
    <ef-waveform target="bars-n-tone" mode="bars" class="color-red-500 absolute top-0 left-0 w-full h-full block"></ef-waveform>
  </ef-timegroup>
`;

const waveformAudioTemplate = /* HTML */ `
<ef-timegroup class="w-[160px] h-[90px] relative" mode="fixed" duration="3s">
  <ef-audio asset-id="${cardJoker.id}" id="test-audio"></ef-audio>
  <ef-waveform target="test-audio" mode="bars" class="color-red-500 bg-yellow-100 absolute top-0 left-0 w-full h-full block"></ef-waveform>
  <h1>THE JOKER</h1>
</ef-timegroup>
`;

await renderToStill(simpleTemplate, testAgent);
await renderToBuffersWithMetadata(simpleTemplate, testAgent);

await ElectronEngineManager.closeEngine();
await valkey.quit();
