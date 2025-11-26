import { test as baseTest } from "vitest";
import type { Selectable } from "kysely";

import {
  processTestVideoAsset,
  type RenderOutput,
  renderWithElectronRPC,
  renderStillWithElectronRPC,
  ElectronRenderOptionsInput,
  getRenderInfoWithElectronRPC,
} from "../test-utils";
import { makeTestAgent, type TestAgent } from "TEST/util/test";
import type { Video2IsobmffFiles } from "@/sql-client.server/kysely-codegen";
import { createElectronRPC, type ElectronRPC } from "../ElectronRPCClient";
import { GetRenderInfoResult } from "../ElectronRPCServer";

// IMPLEMENTATION GUIDELINES: These tests use worker-scoped fixtures for performance.
// The fixtures involve expensive operations (video processing, Electron RPC setup).
// The first test in each major test group has a 30s timeout to accommodate fixture
// initialization on first use. Subsequent tests use default timeout (1s) to fail fast
// since fixtures are already initialized.
export const test = baseTest.extend<{
  electronRPC: ElectronRPC;
  testAgent: Selectable<TestAgent>;
  barsNTone: Selectable<Video2IsobmffFiles>;
  cardJoker: Selectable<Video2IsobmffFiles>;
  testWav: Selectable<Video2IsobmffFiles>;
  videoOnly: Selectable<Video2IsobmffFiles>;
  remoteVideo: Selectable<Video2IsobmffFiles>;
  remoteAudio: Selectable<Video2IsobmffFiles>;
  renderOutput: RenderOutput;
  getRenderInfo: (
    html: string,
    testTitle?: string,
  ) => Promise<GetRenderInfoResult>;
  audioRenderOutput: RenderOutput;
  wavRenderInfo: GetRenderInfoResult;
  wavRenderOutput: RenderOutput;
  videoOnlyRenderOutput: RenderOutput;
  videoOnlyStillOutput: {
    imageBuffer: Uint8Array;
    imagePath: string;
    renderInfo: GetRenderInfoResult;
    templateHash: string;
  };
  complexFilterRenderOutput: RenderOutput;
  render: (
    html: string,
    renderOptions?: ElectronRenderOptionsInput,
    testTitle?: string,
  ) => Promise<RenderOutput>;
}>({
  // Worker-scoped: Created once per worker, shared across all tests
  electronRPC: [
    async ({}, use) => {
      const electronRPC = await createElectronRPC();
      await use(electronRPC);
      await electronRPC.rpc.call("terminate");
    },
    { scope: "worker" },
  ],

  // Worker-scoped: Created once per worker
  testAgent: [
    async ({}, use) => {
      const testAgent = await makeTestAgent("render-test@example.org");
      await use(testAgent);
    },
    { scope: "worker" },
  ],

  // Worker-scoped: Expensive video processing, safe to reuse
  barsNTone: [
    async ({ testAgent }, use) => {
      const barsNTone = await processTestVideoAsset(
        "bars-n-tone.mp4",
        testAgent,
      );
      await use(barsNTone);
    },
    { scope: "worker" },
  ],

  // Worker-scoped: Expensive audio processing, safe to reuse
  cardJoker: [
    async ({ testAgent }, use) => {
      const cardJoker = await processTestVideoAsset(
        "card-joker.mp3",
        testAgent,
      );
      await use(cardJoker);
    },
    { scope: "worker" },
  ],

  // Worker-scoped: WAV file processing to test conforming stream system
  testWav: [
    async ({ testAgent }, use) => {
      const testWav = await processTestVideoAsset("test-sample.wav", testAgent);
      await use(testWav);
    },
    { scope: "worker" },
  ],

  // Worker-scoped: Video-only asset for still rendering tests
  videoOnly: [
    async ({ testAgent }, use) => {
      const videoOnly = await processTestVideoAsset(
        "video-only-test.mp4",
        testAgent,
      );
      await use(videoOnly);
    },
    { scope: "worker" },
  ],

  // Worker-scoped: Remote video asset for complex rendering tests
  remoteVideo: [
    async ({ testAgent }, use) => {
      const remoteVideo = await processTestVideoAsset(
        "https://nftrrevvuwkedwrbrqce.supabase.co/storage/v1/object/public/user-templates/6d6167f0-6040-4ff0-a03b-a2c41dd6c30e/templates/5d8b8ba2-126d-4e47-b850-4529ce25a2ab.mp4",
        testAgent,
      );
      await use(remoteVideo);
    },
    { scope: "worker" },
  ],

  // Worker-scoped: Remote audio asset for complex rendering tests
  remoteAudio: [
    async ({ testAgent }, use) => {
      const remoteAudio = await processTestVideoAsset(
        "https://nftrrevvuwkedwrbrqce.supabase.co/storage/v1/object/public/user-templates/6d6167f0-6040-4ff0-a03b-a2c41dd6c30e/sounds/70c0f129-f261-48fc-832b-eb467130b4ec.mp3",
        testAgent,
      );
      await use(remoteAudio);
    },
    { scope: "worker" },
  ],

  // Worker-scoped: Just a function wrapper
  render: [
    async ({ electronRPC, testAgent }, use) => {
      const render = (
        html: string,
        renderOptions?: ElectronRenderOptionsInput,
        testTitle?: string,
      ) =>
        renderWithElectronRPC({
          html,
          electronRpc: electronRPC,
          renderOptions: renderOptions ?? {},
          testAgent,
          testTitle,
        });
      await use(render);
    },
    { scope: "worker" },
  ],

  getRenderInfo: [
    async ({ electronRPC, testAgent }, use) => {
      const getRenderInfo = (html: string, testTitle?: string) =>
        getRenderInfoWithElectronRPC({
          html,
          electronRpc: electronRPC,
          testAgent: testAgent,
          testTitle,
        });
      await use(getRenderInfo);
    },
    { scope: "worker" },
  ],

  // Worker-scoped: These render outputs can be reused since they're deterministic
  renderOutput: [
    async ({ barsNTone, render }, use) => {
      const renderOutput = await render(
        /* HTML */ `
        <ef-timegroup class="w-[480px] h-[270px]" mode="contain">
          <ef-video asset-id="${barsNTone.id}" class="w-full" sourceOut="2s"></ef-video>
        </ef-timegroup>
      `,
        { renderSliceMs: 500 },
        "bars-n-tone-video",
      );
      await use(renderOutput);
    },
    { scope: "worker" },
  ],

  audioRenderOutput: [
    async ({ cardJoker, render }, use) => {
      const audioRenderOutput = await render(
        /* HTML */ `
        <ef-timegroup class="w-[480px] h-[270px] relative" mode="fixed" duration="2s">
          <ef-audio asset-id="${cardJoker.id}" id="test-audio"></ef-audio>
          <ef-waveform target="test-audio" mode="bars" class="color-red-500 bg-yellow-100 absolute top-0 left-0 w-full h-full"></ef-waveform>
        </ef-timegroup>
      `,
        {},
        "audio-waveform",
      );
      await use(audioRenderOutput);
    },
    { scope: "worker" },
  ],

  wavRenderOutput: [
    async ({ testWav, render }, use) => {
      const wavRenderOutput = await render(
        /* HTML */ `
        <ef-timegroup class="w-[480px] h-[270px] relative" mode="fixed" duration="2s">
          <ef-audio asset-id="${testWav.id}" id="wav-audio"></ef-audio>
          <ef-waveform target="wav-audio" mode="bars" class="color-blue-500 bg-gray-100 absolute top-0 left-0 w-full h-full"></ef-waveform>
        </ef-timegroup>
      `,
        {},
        "wav-audio-waveform",
      );
      await use(wavRenderOutput);
    },
    { scope: "worker" },
  ],

  wavRenderInfo: [
    async ({ testWav, getRenderInfo }, use) => {
      const wavRenderInfo = await getRenderInfo(
        /* HTML */ `
        <ef-timegroup class="w-[480px] h-[270px] relative" mode="fixed" duration="2s">
          <ef-audio asset-id="${testWav.id}" id="wav-audio"></ef-audio>
          <ef-waveform target="wav-audio" mode="bars" class="color-blue-500 bg-gray-100 absolute top-0 left-0 w-full h-full"></ef-waveform>
        </ef-timegroup>
      `,
        "wav-render-info",
      );
      await use(wavRenderInfo);
    },
    { scope: "worker" },
  ],

  videoOnlyRenderOutput: [
    async ({ videoOnly, render }, use) => {
      const videoOnlyRenderOutput = await render(
        /* HTML */ `
        <ef-timegroup class="w-[480px] h-[270px]" mode="contain">
          <ef-video asset-id="${videoOnly.id}" class="w-full" sourceOut="2s"></ef-video>
        </ef-timegroup>
      `,
        { renderSliceMs: 500 },
        "video-only-no-audio",
      );
      await use(videoOnlyRenderOutput);
    },
    { scope: "worker" },
  ],

  videoOnlyStillOutput: [
    async ({ videoOnly, testAgent, electronRPC }, use) => {
      const videoOnlyStillOutput = await renderStillWithElectronRPC({
        html: /* HTML */ `
          <ef-timegroup class="w-[480px] h-[270px]" mode="contain">
            <ef-video asset-id="${videoOnly.id}" class="w-full"></ef-video>
          </ef-timegroup>
        `,
        testAgent,
        electronRpc: electronRPC,
        outputFormat: "webp",
        testTitle: "still-video-only-asset",
      });
      await use(videoOnlyStillOutput);
    },
    { scope: "worker" },
  ],

  complexFilterRenderOutput: [
    async ({ remoteVideo, remoteAudio, render }, use) => {
      const complexFilterRenderOutput = await render(
        /* HTML */ `
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
        <svg width="0" height="0">
          <filter id="5px-outline-black" x="-50%" y="-50%" width="200%" height="200%">
            <feMorphology in="SourceAlpha" result="DILATED" operator="dilate" radius="5"/>
            <feFlood flood-color="black" result="OUTLINE_COLOR"/>
            <feComposite in="OUTLINE_COLOR" in2="DILATED" operator="in" result="OUTLINE"/>
            <feMerge>
              <feMergeNode in="OUTLINE"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </svg>
        <ef-timegroup
          mode="contain"
          class="w-[1080px] h-[1920px] flex items-center justify-center bg-black overflow-hidden"
        >
          <ef-timegroup mode="fit">
            <ef-audio asset-id="${remoteAudio.id}"></ef-audio>
          </ef-timegroup>
          <ef-timegroup
            mode="sequence"
            class="w-[1080px] h-[1920px] flex items-center justify-center bg-black overflow-hidden"
          >
            <ef-timegroup class="flex flex-col items-center justify-center relative">
              <ef-video
                asset-id="${remoteVideo.id}"
                class="z-0 absolute top-0 left-0 size-full object-cover"
                sourceIn="0s"
                sourceOut="5s"
              ></ef-video>
              <h1
                class="absolute left-16 right-16 text-center text-6xl font-medium leading-[1.3] text-white font-['Inter'] top-1/2 -translate-y-1/2"
                style="filter: url(#5px-outline-black);"
              >
                generate again
              </h1>
            </ef-timegroup>
          </ef-timegroup>
        </ef-timegroup>
      `,
        { renderSliceMs: 4000 },
        "complex-svg-filter-remote-video",
      );
      await use(complexFilterRenderOutput);
    },
    { scope: "worker" },
  ],
});
