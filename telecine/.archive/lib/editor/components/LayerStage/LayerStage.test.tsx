import { StageContents } from "./LayerStage";
import { ContainerTimeMode, SizeMode } from "../../model/types";
import { TimeGroup } from "../../model/TimeGroup/TimeGroup";
import { fixedRender } from "@test/fixedRender";
import { VideoLayer } from "../../model/VideoLayer/VideoLayer";
import { HTMLLayer } from "../../model/HTMLLayer/HTMLLayer";
import { InstanceLayer } from "../../model/InstanceLayer/InstanceLayer";
import { ImageLayer } from "../../model/ImageLayer/ImageLayer";
import { Editor } from "../../model/Editor";
import { testRender } from "@test/testRender";

let editor = new Editor({});

describe("<StageContents>", () => {
  beforeEach(() => {
    editor = new Editor({});
  });

  it("renders TimeGroup", () => {
    const timeGroup = new TimeGroup({
      containerTimeMode: ContainerTimeMode.Fixed,
      intrinsicDurationMs: 2000,
      widthMode: SizeMode.Fixed,
      fixedHeight: 100,
      heightMode: SizeMode.Fixed,
      fixedWidth: 100,
    });
    editor.composition.pushLayers(timeGroup);
    const { container } = fixedRender(testRender(editor, <StageContents />));
    // @ts-expect-error Test will fail stageRef is null
    assert.isTrue(container.contains(timeGroup.stageRef));
    assert.isTrue(timeGroup.stageRef?.matches("div"));
    assert.include(timeGroup.stageRef?.getBoundingClientRect(), {
      top: 0,
      left: 0,
      width: 100,
      height: 100,
    });
  });

  it("renders ImageLayer", () => {
    const imageLayer = new ImageLayer({
      intrinsicDurationMs: 2000,
      intrinsicWidth: 100,
      intrinsicHeight: 100,
      widthMode: SizeMode.Fixed,
      fixedHeight: 100,
      heightMode: SizeMode.Fixed,
      fixedWidth: 100,
      srcUrl: "https://example.com/",
    });
    editor.composition.pushLayers(imageLayer);
    const { container } = fixedRender(testRender(editor, <StageContents />));
    // @ts-expect-error Test will fail stageRef is null
    assert.isTrue(container.contains(imageLayer.stageRef));
    assert.equal(
      imageLayer.stageRef?.getAttribute("src"),
      "https://example.com/",
    );
    assert.isTrue(imageLayer.stageRef?.matches("img"));
    assert.include(imageLayer.stageRef?.getBoundingClientRect(), {
      top: 0,
      left: 0,
      width: 100,
      height: 100,
    });
  });

  it("renders VideoLayer", () => {
    const videoLayer = new VideoLayer({
      intrinsicDurationMs: 2000,
      intrinsicWidth: 100,
      intrinsicHeight: 100,
      widthMode: SizeMode.Fixed,
      fixedHeight: 100,
      heightMode: SizeMode.Fixed,
      fixedWidth: 100,
      srcUrl: "https://example.com/",
    });
    editor.composition.pushLayers(videoLayer);
    const { container } = fixedRender(testRender(editor, <StageContents />));
    // @ts-expect-error Test will fail stageRef is null
    assert.isTrue(container.contains(videoLayer.stageRef));
    assert.equal(
      videoLayer.stageRef?.getAttribute("src"),
      "https://example.com/",
    );
    assert.isTrue(videoLayer.stageRef?.matches("video"));
    assert.include(videoLayer.stageRef?.getBoundingClientRect(), {
      top: 0,
      left: 0,
      width: 100,
      height: 100,
    });
  });

  it("renders HTMLLayer", () => {
    const htmlLayer = new HTMLLayer({
      intrinsicDurationMs: 2000,
      html: "<div>hello</div>",
      widthMode: SizeMode.Fixed,
      fixedHeight: 100,
      heightMode: SizeMode.Fixed,
      fixedWidth: 100,
    });
    editor.composition.pushLayers(htmlLayer);
    const { container } = fixedRender(testRender(editor, <StageContents />));
    // @ts-expect-error Test will fail stageRef is null
    assert.isTrue(container.contains(htmlLayer.stageRef));
    assert.isTrue(htmlLayer.stageRef?.matches("div"));
    assert.include(htmlLayer.stageRef?.getBoundingClientRect(), {
      top: 0,
      left: 0,
      width: 100,
      height: 100,
    });
    assert.equal(htmlLayer.stageRef?.innerHTML, "<div>hello</div>");
  });

  // components/instances are currently not working
  it.skip("renders simple component instances", () => {
    const videoLayer = new VideoLayer({
      intrinsicDurationMs: 2000,
      intrinsicWidth: 100,
      intrinsicHeight: 100,
      widthMode: SizeMode.Fixed,
      fixedHeight: 100,
      heightMode: SizeMode.Fixed,
      fixedWidth: 100,
      isComponent: true,
    });
    editor.composition.pushLayers(videoLayer);

    const videoInstance = InstanceLayer.createFromLayer(videoLayer);
    editor.composition.pushLayers(videoInstance);

    const { container } = fixedRender(testRender(editor, <StageContents />));
    // @ts-expect-error Test will fail stageRef is null
    assert.isTrue(container.contains(videoLayer.stageRef));
    assert.include(videoLayer.stageRef?.getBoundingClientRect(), {
      top: 0,
      left: 0,
      width: 100,
      height: 100,
    });

    // @ts-expect-error Test will fail stageRef is null
    assert.isTrue(container.contains(videoInstance.stageRef));
    assert.include(videoInstance.stageRef?.getBoundingClientRect(), {
      top: 0,
      left: 0,
      width: 100,
      height: 100,
    });
  });

  it("renders children of temporal roots", () => {
    const timeGroup = new TimeGroup({
      containerTimeMode: ContainerTimeMode.Fixed,
      intrinsicDurationMs: 2000,
      widthMode: SizeMode.Fixed,
      fixedHeight: 100,
      heightMode: SizeMode.Fixed,
      fixedWidth: 100,
    });
    const videoLayer = new VideoLayer({
      intrinsicDurationMs: 2000,
      intrinsicWidth: 100,
      intrinsicHeight: 100,
      widthMode: SizeMode.Fixed,
      fixedHeight: 100,
      heightMode: SizeMode.Fixed,
      fixedWidth: 100,
    });
    editor.composition.pushLayers(timeGroup);
    timeGroup.pushLayers(videoLayer);

    fixedRender(testRender(editor, <StageContents />));
    // @ts-expect-error Test will fail stageRef is null
    assert.isTrue(timeGroup.stageRef.contains(videoLayer.stageRef));
    assert.include(videoLayer.stageRef?.getBoundingClientRect(), {
      top: 0,
      left: 0,
      width: 100,
      height: 100,
    });
  });

  it("does not render children of temporal roots if they fall outside currentTime", () => {
    const timeGroup = new TimeGroup({
      containerTimeMode: ContainerTimeMode.Fixed,
      intrinsicDurationMs: 2000,
      widthMode: SizeMode.Fixed,
      fixedHeight: 100,
      heightMode: SizeMode.Fixed,
      fixedWidth: 100,
    });
    const videoLayer = new VideoLayer({
      intrinsicDurationMs: 1000,
      intrinsicWidth: 100,
      intrinsicHeight: 100,
      widthMode: SizeMode.Fixed,
      fixedHeight: 100,
      heightMode: SizeMode.Fixed,
      fixedWidth: 100,
    });
    editor.composition.pushLayers(timeGroup);
    timeGroup.pushLayers(videoLayer);
    timeGroup.setCurrentTimeMs(1500);

    fixedRender(testRender(editor, <StageContents />));
    // @ts-expect-error Test will fail stageRef is null
    assert.isFalse(timeGroup.stageRef.contains(videoLayer.stageRef));
  });
});
