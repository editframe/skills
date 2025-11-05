/**
 * This file is not used in the app, but is used to test the editor in the browser.
 * Having unused variables is useful for switching between example definitions.
 */
import { Editor } from "./model/Editor";
import { registerRootStore } from "mobx-keystone";
import { autorun } from "mobx";
import { Encoder } from "./model/Encoder";
import { StreamTarget } from "mp4-muxer";
import { LayerComposition } from "./model/LayerComposition";
// import deckOfCards from "./demoModels/deckOfCards";
// import feelgoodinc from "./demoModels/feelgoodinc";
// import coolvideo from "./demoModels/coolvideo";
// import framecount from "./demoModels/frame-count";
// const composition = await deckOfCards();

const composition = new LayerComposition({});
export const editor = new Editor({ composition });
registerRootStore(editor);

// @ts-expect-error useful for debugging
window.$e = editor;
// window.$k = keystone;
// window.$m = mobx;

// @ts-expect-error useful for debugging
window.$Exporter = Encoder;
// @ts-expect-error useful for debugging
window.$StreamTarget = StreamTarget;

autorun(() => {
  // @ts-expect-error useful for debugging
  window.$c = editor.composition;
  // @ts-expect-error useful for debugging
  window.$t = editor.selectedTemporalLayer;
  // @ts-expect-error useful for debugging
  window.$l = editor.selectedLayers[0];
});

// VideoLayer.createFromURL("/video/CoolVideo.mp4", {
//   widthMode: SizeMode.Fill,
//   heightMode: SizeMode.Fill,
// }),
// VideoLayer.createFromURL("/video/10s-bars.mp4", {
//   widthMode: SizeMode.Fill,
//   heightMode: SizeMode.Fill,
// }),
// VideoLayer.createFromURL("/video/feelgoodinc.mp4", {
//   widthMode: SizeMode.Fill,
//   heightMode: SizeMode.Fill,
// }),

// // @ts-ignore
// const aCatLayer = new HTMLLayer({
//   fixedStartMs: 0,
//   widthMode: SizeMode.Fill,
//   heightMode: SizeMode.Fill,
//   intrinsicDurationMs: 2000,
//   timeMode: TimeMode.Fill,
//   html: html`
//     <img src="/kitten-100.jpeg" />
//     <h1 id="title">A cat</h1>
//   `,
// });

// // @ts-ignore
// const timeGroup = new TimeGroup({
//   containerTimeMode: ContainerTimeMode.Fit,
//   fixedWidth: 1920,
//   fixedHeight: 1080,
// });

// onPatches(composition, (patches) => {
//   for (const patch of patches) {
//     console.log("composition patches", patch);
//   }
// });

// composition.pushLayers(coolVideo, barsAndTone, feelGoodInc);

// composition.pushLayers(timeGroup);
// timeGroup.pushLayers(coolVideo, barsAndTone, feelGoodInc);
// composition.pushLayers(coolVideo);

// const composition = new LayerComposition({
//   layers: [
//     // timeGroup,
//     // timeGroup2,
//     // coolVideo,
//     // barsAndTone,
//     // feelGoodInc,
//     // new HTMLLayer({
//     //   startMs: 0,
//     //   intrinsicDurationMs: 2000,
//     //   html: html`
//     //     <img src="/kitten-100.jpeg" />
//     //     <h1 id="title">A cat</h1>
//     //   `,
//     / / }),
//   ],
// });
