import React from "react";
import { createRoot, type Root } from "react-dom/client";
import { describe, test, expect, vi, afterEach } from "vitest";
import { Preview, Timegroup, Text } from "../index";

describe("Text React component", () => {
  let container: HTMLElement;
  let root: Root;
  const testStyles: HTMLStyleElement[] = [];

  function createTestStyle(content: string): HTMLStyleElement {
    const style = document.createElement("style");
    style.textContent = content;
    document.head.appendChild(style);
    testStyles.push(style);
    return style;
  }

  afterEach(() => {
    root?.unmount();
    container?.remove();
    testStyles.forEach((s) => s.remove());
    testStyles.length = 0;
  });

  test("inline style animation propagates to segments", async () => {
    createTestStyle(`
      @keyframes react-fade {
        from { opacity: 0; }
        to { opacity: 1; }
      }
    `);

    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    root.render(
      <Preview id="test-preview-1">
        <Timegroup mode="contain" duration="5s">
          <Text
            split="word"
            staggerMs={100}
            duration="3s"
            style={{
              animationName: "react-fade",
              animationDuration: "0.4s",
              animationTimingFunction: "ease-out",
              animationFillMode: "both",
            }}
          >
            HELLO WORLD
          </Text>
        </Timegroup>
      </Preview>,
    );

    const textEl = await vi.waitUntil(
      () => container.querySelector("ef-text"),
      { timeout: 3000 },
    );

    expect(textEl).toBeTruthy();

    // Wait for segments
    await vi.waitUntil(
      () => textEl!.querySelectorAll("ef-text-segment").length > 0,
      { timeout: 3000 },
    );

    // Wait for propagation
    await new Promise((resolve) => requestAnimationFrame(resolve));
    await new Promise((resolve) => requestAnimationFrame(resolve));

    const segments = Array.from(textEl!.querySelectorAll("ef-text-segment"));
    const wordSegments = segments.filter(
      (seg) => !/^\s+$/.test((seg as any).segmentText),
    );

    expect(wordSegments.length).toBe(2);

    for (const seg of wordSegments) {
      expect((seg as HTMLElement).style.animationName).toBe("react-fade");
      expect((seg as HTMLElement).style.animationDuration).toBe("0.4s");
      expect((seg as HTMLElement).style.animationFillMode).toBe("both");
    }
  });

  test("className animation propagates to segments", async () => {
    createTestStyle(`
      @keyframes react-slide {
        from { opacity: 0; transform: translateY(100%); }
        to { opacity: 1; transform: translateY(0); }
      }
      .react-slide-anim {
        animation-name: react-slide;
        animation-duration: 0.4s;
        animation-timing-function: ease-out;
        animation-fill-mode: both;
      }
    `);

    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    root.render(
      <Preview id="test-preview-2">
        <Timegroup mode="contain" duration="5s">
          <Text
            split="char"
            staggerMs={50}
            duration="3s"
            className="react-slide-anim"
          >
            ABC
          </Text>
        </Timegroup>
      </Preview>,
    );

    const textEl = await vi.waitUntil(
      () => container.querySelector("ef-text"),
      { timeout: 3000 },
    );

    expect(textEl).toBeTruthy();

    await vi.waitUntil(
      () => textEl!.querySelectorAll("ef-text-segment").length > 0,
      { timeout: 3000 },
    );

    await new Promise((resolve) => requestAnimationFrame(resolve));
    await new Promise((resolve) => requestAnimationFrame(resolve));

    const segments = Array.from(textEl!.querySelectorAll("ef-text-segment"));
    expect(segments.length).toBe(3);

    for (const seg of segments) {
      const anims = seg.getAnimations();
      expect(anims.length).toBeGreaterThan(0);
    }
  });

  test("animation-delay is not propagated to segments", async () => {
    createTestStyle(`
      @keyframes react-fade {
        from { opacity: 0; }
        to { opacity: 1; }
      }
    `);

    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    root.render(
      <Preview id="test-preview-3">
        <Timegroup mode="contain" duration="5s">
          <Text
            split="word"
            staggerMs={100}
            duration="3s"
            style={{
              animationName: "react-fade",
              animationDuration: "0.4s",
              animationFillMode: "both",
              animationDelay: "500ms",
            }}
          >
            A B
          </Text>
        </Timegroup>
      </Preview>,
    );

    const textEl = await vi.waitUntil(
      () => container.querySelector("ef-text"),
      { timeout: 3000 },
    );

    await vi.waitUntil(
      () => textEl!.querySelectorAll("ef-text-segment").length > 0,
      { timeout: 3000 },
    );

    await new Promise((resolve) => requestAnimationFrame(resolve));
    await new Promise((resolve) => requestAnimationFrame(resolve));

    const segments = Array.from(textEl!.querySelectorAll("ef-text-segment"));
    const wordSegments = segments.filter(
      (seg) => !/^\s+$/.test((seg as any).segmentText),
    );

    for (const seg of wordSegments) {
      expect((seg as HTMLElement).style.animationDelay).toBe("");
    }
  });
});
