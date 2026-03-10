import React from "react";
import { createRoot, hydrateRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { test as baseTest, describe, vi } from "vitest";
import { Timegroup } from "../elements/Timegroup";
import { setIsomorphicEffect } from "../hooks/create-element";
import { Configuration } from "./Configuration";
import { Controls } from "./Controls";
import { Preview } from "./Preview";
import { TogglePlay } from "./TogglePlay";

const test = baseTest.extend<{
  root: Root;
  markup: JSX.Element;
  stringMarkup: string;
  hydratedContainer: HTMLElement;
  renderedContainer: HTMLElement;
}>({
  // biome-ignore lint/correctness/noEmptyPattern: Required by Vitest fixture syntax
  markup: async ({}, use) => {
    const markup = (
      <>
        <Configuration>
          {/* biome-ignore lint/correctness/useUniqueElementIds: OK for test fixture with single instance */}
          <Preview id="test-preview">
            <Timegroup mode="fixed" duration="10s" />
          </Preview>
          <Controls target="test-preview">
            <TogglePlay />
          </Controls>
        </Configuration>
      </>
    );
    await use(markup);
  },
  stringMarkup: async ({ markup }, use) => {
    setIsomorphicEffect(React.useEffect);
    const stringMarkup = renderToString(markup);
    setIsomorphicEffect(React.useLayoutEffect);
    await use(stringMarkup);
  },
  hydratedContainer: async ({ stringMarkup, markup }, use) => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    container.innerHTML = stringMarkup;
    hydrateRoot(container, markup);
    await use(container);
    container.remove();
  },
  // biome-ignore lint/correctness/noEmptyPattern: Required by Vitest fixture syntax
  renderedContainer: async ({}, use) => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    await use(container);
    container.remove();
  },
  root: async ({ renderedContainer, markup }, use) => {
    const root = createRoot(renderedContainer);
    root.render(markup);
    await use(root);
    root.unmount();
  },
});

describe("Controls", () => {
  describe("renderedContainer", () => {
    test.skip("works", async ({ renderedContainer, expect }) => {
      await vi.waitUntil(
        () => {
          return renderedContainer.innerHTML.includes("ef-controls");
        },
        { timeout: 5000 },
      );
      const controls =
        // biome-ignore lint/style/noNonNullAssertion: Safe in tests where elements are guaranteed to exist
        renderedContainer.getElementsByTagName("ef-controls")[0]!;
      const preview =
        // biome-ignore lint/style/noNonNullAssertion: Safe in tests where elements are guaranteed to exist
        renderedContainer.getElementsByTagName("ef-preview")[0]!;
      const togglePlay =
        // biome-ignore lint/style/noNonNullAssertion: Safe in tests where elements are guaranteed to exist
        renderedContainer.getElementsByTagName("ef-toggle-play")[0]!;

      expect(controls.targetElement).toBe(preview);
      expect(togglePlay.efContext).toBe(preview);
    }, 5000);
  });

  describe("hydratedContainer", () => {
    test.skip("proxies contexts following hydration", async ({ hydratedContainer, expect }) => {
      await vi.waitUntil(() => hydratedContainer.innerHTML.includes("ef-controls"), {
        timeout: 5000,
      });
      const controls =
        // biome-ignore lint/style/noNonNullAssertion: Safe in tests where elements are guaranteed to exist
        hydratedContainer.getElementsByTagName("ef-controls")[0]!;
      const preview =
        // biome-ignore lint/style/noNonNullAssertion: Safe in tests where elements are guaranteed to exist
        hydratedContainer.getElementsByTagName("ef-preview")[0]!;
      const togglePlay =
        // biome-ignore lint/style/noNonNullAssertion: Safe in tests where elements are guaranteed to exist
        hydratedContainer.getElementsByTagName("ef-toggle-play")[0]!;

      expect(controls.targetElement).toBe(preview);
      expect(togglePlay.efContext).toBe(preview);
    }, 5000);
  });
});
