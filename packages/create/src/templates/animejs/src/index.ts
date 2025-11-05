import "@editframe/elements";
import "@editframe/elements/styles.css";
import { animate, svg, splitText, stagger, createTimeline, waapi } from "animejs";
import Prism from "prismjs";
import "prismjs/themes/prism-tomorrow.css";
import "prismjs/components/prism-javascript";

// ============================================================================
// Section 1: Text intro animation
// ============================================================================
const { chars } = splitText("#text-intro h2", { words: false, chars: true });

const textAnimation = animate(chars, {
  y: [
    { to: "-2.75rem", ease: "outExpo", duration: 600 },
    { to: 0, ease: "outBounce", duration: 800, delay: 100 },
  ],
  rotate: {
    from: "-1turn",
    delay: 0,
  },
  delay: stagger(50),
  ease: "inOutCirc",
  autoplay: false,
});

const textIntroTimegroup = document.querySelector("#text-intro")!;
textIntroTimegroup.addFrameTask(({ ownCurrentTimeMs }) => {
  textAnimation.currentTime = ownCurrentTimeMs;
});

// ============================================================================
// Section 2: Timeline animation with pyramid shapes
// ============================================================================
const timeline = createTimeline({
  defaults: { duration: 750 },
  autoplay: false,
});

timeline
  .label("start")
  .add(".square", { x: "15rem" }, 500)
  .add(".circle", { x: "15rem" }, "start")
  .add(".triangle", { x: "15rem", rotate: "1turn" }, "<-=500");

const pyramidTimegroup = document.querySelector("#pyramid")!;
pyramidTimegroup.addFrameTask(({ ownCurrentTimeMs }) => {
  timeline.currentTime = ownCurrentTimeMs;
});

// ============================================================================
// Section 3: WAAPI animation
// ============================================================================
const { chars: waapiChars } = splitText("#waapi-demo h2", { words: false, chars: true });

const waapiAnimation = waapi.animate(waapiChars, {
  translate: `0 -2rem`,
  delay: stagger(100),
  duration: 600,
  alternate: true,
  loop: true,
  ease: "inOut(2)",
  autoplay: false,
});

const waapiTimegroup = document.querySelector("#waapi-demo")!;
waapiTimegroup.addFrameTask(({ ownCurrentTimeMs }) => {
  waapiAnimation.currentTime = ownCurrentTimeMs;
});

// ============================================================================
// Section 4: Motion path and line drawing animations
// ============================================================================
const carAnimation = animate(".car", {
  ease: "linear",
  duration: 5000,
  autoplay: false,
  ...svg.createMotionPath("#suzuka"),
});

const lineAnimation = animate(svg.createDrawable("#suzuka"), {
  draw: "0 1",
  ease: "linear",
  duration: 5000,
  autoplay: false,
});

const racetrackTimegroup = document.querySelector("#racetrack")!;
racetrackTimegroup.addFrameTask(({ ownCurrentTimeMs }) => {
  carAnimation.currentTime = ownCurrentTimeMs;
  lineAnimation.currentTime = ownCurrentTimeMs;
});

// ============================================================================
// Transitions timeline controlling all section slide animations
// ============================================================================
const transitionsTimeline = createTimeline({
  autoplay: false,
  defaults: {
    ease: "linear"
  }
});

// Add all transitions to the timeline with proper timing
// text-intro: starts at 0, stays until 2750ms, slides out
transitionsTimeline
  .add("#text-intro", {
    keyframes: [
      { x: "0%", duration: 2750 },
      { x: "-100%", duration: 250 }
    ]
  }, 0)
  // pyramid: starts at 2500ms (0.5s overlap), slides in, stays, slides out
  .add("#pyramid", {
    keyframes: [
      { x: "100%", duration: 0 },
      { x: "0%", duration: 250 },
      { x: "0%", duration: 2500 },
      { x: "-100%", duration: 250 }
    ]
  }, 2500)
  // waapi-demo: starts at 5000ms, slides in, stays, slides out
  .add("#waapi-demo", {
    keyframes: [
      { x: "100%", duration: 0 },
      { x: "0%", duration: 250 },
      { x: "0%", duration: 2500 },
      { x: "-100%", duration: 250 }
    ]
  }, 5000)
  // racetrack: starts at 7500ms, slides in, stays
  .add("#racetrack", {
    keyframes: [
      { x: "100%", duration: 0 },
      { x: "0%", duration: 250 },
      { x: "0%", duration: 5750 }
    ]
  }, 7500);

const rootTimegroup = document.querySelector('ef-timegroup[mode="sequence"]')!;
rootTimegroup.addFrameTask(({ currentTimeMs }) => {
  transitionsTimeline.currentTime = currentTimeMs;
});

// ============================================================================
// Highlight all code snippets with Prism
// ============================================================================
Prism.highlightAll();
