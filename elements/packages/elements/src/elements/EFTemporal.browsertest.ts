import { LitElement } from "lit";
import { customElement } from "lit/decorators/custom-element.js";
import { describe, expect, test } from "vitest";
import { EFTemporal } from "./EFTemporal.js";
import "./EFTimegroup.js";
import "./EFVideo.js";
import { state } from "lit/decorators.js";

@customElement("ten-seconds")
class TenSeconds extends EFTemporal(LitElement) {
  get intrinsicDurationMs() {
    return 10_000;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ten-seconds": TenSeconds;
  }
}

describe("sourcein and sourceout", () => {
  test("sourcein and sourceout are parsed correctly", () => {
    const element = document.createElement("ten-seconds");
    element.setAttribute("sourcein", "1s");
    element.setAttribute("sourceout", "5s");
    expect(element.sourceInMs).toBe(1_000);
    expect(element.sourceOutMs).toBe(5_000);
    expect(element.durationMs).toBe(4_000);
  });

  test("sourcein='0s' is parsed correctly as 0", () => {
    const element = document.createElement("ten-seconds");
    element.setAttribute("sourcein", "0s");
    expect(element.sourceInMs).toBe(0);
    expect(element.durationMs).toBe(10_000);
  });

  test("sourcein='0ms' is parsed correctly as 0", () => {
    const element = document.createElement("ten-seconds");
    element.setAttribute("sourcein", "0ms");
    expect(element.sourceInMs).toBe(0);
    expect(element.durationMs).toBe(10_000);
  });

  test("duration is calculated from sourcein when only sourcein is set", () => {
    const element = document.createElement("ten-seconds");
    element.sourceInMs = 1_000;
    expect(element.durationMs).toBe(9_000);
  });

  test("duration is calculated from sourceout when only sourceout is set", () => {
    const element = document.createElement("ten-seconds");
    element.sourceOutMs = 5_000;
    expect(element.durationMs).toBe(5_000);
  });

  test("duration is zero when sourceout precedes sourcein", () => {
    const element = document.createElement("ten-seconds");
    element.sourceInMs = 5_000;
    element.sourceOutMs = 1_000;
    expect(element.durationMs).toBe(0);
  });

  test("negative sourcein is normalized to zero", () => {
    const element = document.createElement("ten-seconds");
    element.sourceInMs = -1_000;
    expect(element.sourceInMs).toBe(0);
    expect(element.durationMs).toBe(10_000);
  });

  test("sourceout beyond intrinsic duration is clamped to intrinsic duration", () => {
    const element = document.createElement("ten-seconds");
    element.sourceOutMs = 15_000;
    expect(element.sourceOutMs).toBe(10_000);
  });
});

describe("trimstart and trimend", () => {
  test("trimstart and trimend attributes are parsed correctly", () => {
    const element = document.createElement("ten-seconds");
    element.setAttribute("trimstart", "1s");
    element.setAttribute("trimend", "5s");
    expect(element.trimStartMs).toBe(1_000);
    expect(element.trimEndMs).toBe(5_000);
    expect(element.durationMs).toBe(4_000);
  });

  test("trimstart beyond intrinsic duration is clamped to intrinsic duration", () => {
    const element = document.createElement("ten-seconds");
    element.trimStartMs = 15_000;
    expect(element.trimStartMs).toBe(10_000);
  });

  test("trimend beyond intrinsic duration is clamped to intrinsic duration", () => {
    const element = document.createElement("ten-seconds");
    element.trimEndMs = 15_000;
    expect(element.trimEndMs).toBe(10_000);
  });
});

describe("duration", () => {
  test("duration is parsed correctly", () => {
    const element = document.createElement("ten-seconds");
    element.setAttribute("duration", "10s");
    expect(element.durationMs).toBe(10_000);
  });

  test("duration can be set directly on the element", () => {
    const element = document.createElement("ten-seconds");
    element.duration = "10s";
    expect(element.durationMs).toBe(10_000);
  });
});

describe("EFVideo sourcein attribute", () => {
  test("sourcein='0s' attribute is parsed to sourceInMs property", async () => {
    const element = document.createElement("ef-video");
    document.body.append(element);
    element.setAttribute("sourcein", "0s");
    await element.updateComplete;
    expect(element.getAttribute("sourcein")).toBe("0s");
    expect(element.sourceInMs).toBe(0);
    element.remove();
  });

  test("multiple EFVideo elements can be created with independent properties", () => {
    const element1 = document.createElement("ef-video");
    const element2 = document.createElement("ef-video");

    element1.src = "test-video-1.mp4";
    element2.src = "test-video-2.mp4";

    expect(element1.src).toBe("test-video-1.mp4");
    expect(element2.src).toBe("test-video-2.mp4");
    expect(element1.tagName).toBe("EF-VIDEO");
    expect(element2.tagName).toBe("EF-VIDEO");
  });
});

@customElement("test-root-lifecycle")
class TestLifecycleChild extends EFTemporal(LitElement) {
  @state()
  role: "root" | "child" | null = null;

  didBecomeRoot() {
    this.role = "root";
  }
  didBecomeChild() {
    this.role = "child";
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "test-root-lifecycle": TestLifecycleChild;
  }
}

describe("Temporal Lifecycle", () => {
  test("standalone temporal element has root role and playback control", async () => {
    const root = document.createElement("test-root-lifecycle");
    document.body.append(root);
    await root.updateComplete;

    expect(root.role).toBe("root");
    expect(root.parentTimegroup).toBeUndefined();
    expect(root.playing).toBe(false);
    expect(() => root.play()).not.toThrow();
    expect(() => root.pause()).not.toThrow();
  });

  test("temporal element in timegroup has child role and parent timegroup reference", async () => {
    const timegroup = document.createElement("ef-timegroup");
    const child = document.createElement("test-root-lifecycle");
    timegroup.append(child);
    document.body.append(timegroup);
    await Promise.all([timegroup.updateComplete, child.updateComplete]);

    expect(timegroup.isRootTimegroup).toBe(true);
    expect(timegroup.parentTimegroup).toBeUndefined();
    expect(child.role).toBe("child");
    expect(child.parentTimegroup).toBe(timegroup);
    expect(child.playing).toBe(false);
  });

  test("nested timegroup has parent timegroup reference and root timegroup", async () => {
    const parentTimegroup = document.createElement("ef-timegroup");
    const childTimegroup = document.createElement("ef-timegroup");
    parentTimegroup.append(childTimegroup);
    document.body.append(parentTimegroup);
    await Promise.all([parentTimegroup.updateComplete, childTimegroup.updateComplete]);

    expect(parentTimegroup.isRootTimegroup).toBe(true);
    expect(parentTimegroup.parentTimegroup).toBeUndefined();
    expect(parentTimegroup.rootTimegroup).toBe(parentTimegroup);
    expect(childTimegroup.isRootTimegroup).toBe(false);
    expect(childTimegroup.parentTimegroup).toBe(parentTimegroup);
    expect(childTimegroup.rootTimegroup).toBe(parentTimegroup);
  });
});

describe("contentReadyState protocol", () => {
  test("unconnected element starts as idle", () => {
    const element = document.createElement("ten-seconds");
    expect(element.contentReadyState).toBe("idle");
  });

  test("connected element transitions to ready after updateComplete", async () => {
    const element = document.createElement("ten-seconds");
    document.body.append(element);
    await element.updateComplete;
    expect(element.contentReadyState).toBe("ready");
    element.remove();
  });

  test("contentReadyState reflects to attribute", async () => {
    const element = document.createElement("ten-seconds");
    document.body.append(element);
    // First updateComplete triggers the idle→ready transition;
    // wait for the second cycle to let Lit reflect the attribute.
    await element.updateComplete;
    await element.updateComplete;
    expect(element.getAttribute("content-ready-state")).toBe("ready");
    element.remove();
  });

  test("readystatechange fires on transition to ready", async () => {
    const element = document.createElement("ten-seconds");
    const states: string[] = [];
    element.addEventListener("readystatechange", ((e: CustomEvent) => {
      states.push(e.detail.state);
    }) as EventListener);
    document.body.append(element);
    await element.updateComplete;
    expect(states).toContain("ready");
    element.remove();
  });

  test("readystatechange does not fire when state is set to current value", async () => {
    const element = document.createElement("ten-seconds");
    document.body.append(element);
    await element.updateComplete;
    expect(element.contentReadyState).toBe("ready");
    const states: string[] = [];
    element.addEventListener("readystatechange", ((e: CustomEvent) => {
      states.push(e.detail.state);
    }) as EventListener);
    // Setting to same value should not fire
    element.setContentReadyState("ready");
    expect(states).toHaveLength(0);
    element.remove();
  });

  test("readystatechange does not bubble", async () => {
    const container = document.createElement("div");
    const element = document.createElement("ten-seconds");
    container.append(element);
    const bubbled: string[] = [];
    container.addEventListener("readystatechange", ((e: CustomEvent) => {
      bubbled.push(e.detail.state);
    }) as EventListener);
    document.body.append(container);
    await element.updateComplete;
    expect(bubbled).toHaveLength(0);
    container.remove();
  });

  test("contentchange does not bubble", async () => {
    const container = document.createElement("div");
    const element = document.createElement("ten-seconds");
    container.append(element);
    document.body.append(container);
    await element.updateComplete;
    const bubbled: string[] = [];
    container.addEventListener("contentchange", ((e: CustomEvent) => {
      bubbled.push(e.detail.reason);
    }) as EventListener);
    element.emitContentChange("bounds");
    expect(bubbled).toHaveLength(0);
    container.remove();
  });

  test("contentchange fires with correct reason", async () => {
    const element = document.createElement("ten-seconds");
    document.body.append(element);
    await element.updateComplete;
    const reasons: string[] = [];
    element.addEventListener("contentchange", ((e: CustomEvent) => {
      reasons.push(e.detail.reason);
    }) as EventListener);
    element.emitContentChange("bounds");
    expect(reasons).toEqual(["bounds"]);
    element.remove();
  });

  test("contentReadyState is queryable without event subscription (late subscriber)", async () => {
    const element = document.createElement("ten-seconds");
    document.body.append(element);
    await element.updateComplete;
    // No event listener attached — just read the property
    expect(element.contentReadyState).toBe("ready");
    element.remove();
  });
});
