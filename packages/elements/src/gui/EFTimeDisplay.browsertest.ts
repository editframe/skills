import { html, render as litRender, type TemplateResult } from "lit";
import { assert, beforeEach, describe, test, vi } from "vitest";
import { EFTimeDisplay } from "./EFTimeDisplay.js";
import "./EFTimeDisplay.js";
import type { EFTimegroup } from "../elements/EFTimegroup.js";
import "../elements/EFTimegroup.js";
import "./EFPreview.js";

beforeEach(() => {
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (typeof key !== "string") continue;
    localStorage.removeItem(key);
  }
  while (document.body.children.length) {
    document.body.children[0]?.remove();
  }
});

const renderTimeDisplay = (result: TemplateResult) => {
  const container = document.createElement("div");
  litRender(result, container);
  const timeDisplay = container.querySelector("ef-time-display");
  if (!timeDisplay) {
    throw new Error("No ef-time-display found");
  }
  if (!(timeDisplay instanceof EFTimeDisplay)) {
    throw new Error("Element is not an EFTimeDisplay");
  }
  document.body.appendChild(container);
  return { timeDisplay, container };
};

describe("EFTimeDisplay", () => {
  test("shows 0:00 / 0:00 when context is null", async () => {
    const { timeDisplay } = renderTimeDisplay(
      html`<ef-time-display></ef-time-display>`,
    );
    await timeDisplay.updateComplete;

    const timeText = timeDisplay.shadowRoot?.textContent?.trim();
    assert.equal(timeText, "0:00 / 0:00");
  });

  test("works correctly with real EFTimegroup context", async () => {
    const { timeDisplay } = renderTimeDisplay(
      html`<ef-preview>
        <ef-timegroup mode="fixed" duration="5s">
          <ef-time-display></ef-time-display>
        </ef-timegroup>
      </ef-preview>`,
    );

    await timeDisplay.updateComplete;

    const timeText = timeDisplay.shadowRoot?.textContent?.trim();
    assert.equal(
      timeText,
      "0:00 / 0:05",
      "Should work with real timegroup context",
    );
  });

  test("handles undefined currentTimeMs gracefully", async () => {
    const { timeDisplay } = renderTimeDisplay(
      html`<ef-preview>
        <ef-timegroup mode="fixed" duration="5s"></ef-timegroup>
        <ef-time-display></ef-time-display>
      </ef-preview>`,
    );

    // const context = timeDisplay.closest("ef-preview") ;
    await timeDisplay.updateComplete;

    const timeText = timeDisplay.shadowRoot?.textContent?.trim();
    assert.equal(
      timeText,
      "0:00 / 0:05",
      "Should show 0:00 when currentTimeMs is undefined",
    );
  });

  test("handles NaN currentTimeMs gracefully", async () => {
    const { timeDisplay } = renderTimeDisplay(
      html`<ef-preview>
        <ef-timegroup mode="fixed" duration="5s"></ef-timegroup>
        <ef-time-display></ef-time-display>
      </ef-preview>`,
    );

    const context = timeDisplay.closest("ef-preview")!;
    context.currentTimeMs = Number.NaN;
    await timeDisplay.updateComplete;

    const timeText = timeDisplay.shadowRoot?.textContent?.trim();
    assert.equal(
      timeText,
      "0:00 / 0:05",
      "Should show 0:00 when currentTimeMs is NaN",
    );
  });

  test("formats time correctly with valid values", async () => {
    const { timeDisplay } = renderTimeDisplay(
      html`<ef-preview>
        <ef-timegroup mode="fixed" duration="3s"></ef-timegroup>
        <ef-time-display></ef-time-display>
      </ef-preview>`,
    );

    const context = timeDisplay.closest("ef-preview")!;
    const timegroup = context.querySelector("ef-timegroup") as EFTimegroup;

    await timegroup.updateComplete;
    await timegroup.seek(1500); // 1.5 seconds = 0:01

    // Wait for context to update and propagate to time display
    await new Promise((resolve) => requestAnimationFrame(resolve));
    await context.updateComplete;
    await timeDisplay.updateComplete;

    const timeText = timeDisplay.shadowRoot?.textContent?.trim();
    assert.equal(timeText, "0:01 / 0:03");
  });

  test("formats minutes correctly", async () => {
    const { timeDisplay } = renderTimeDisplay(
      html`<ef-preview>
        <ef-timegroup mode="fixed" duration="125s"></ef-timegroup>
        <ef-time-display></ef-time-display>
      </ef-preview>`,
    );

    const context = timeDisplay.closest("ef-preview")!;

    // Create a mock timegroup with longer duration
    const mockTimegroup = document.createElement("ef-timegroup") as EFTimegroup;
    mockTimegroup.setAttribute("mode", "fixed");
    mockTimegroup.setAttribute("duration", "125s"); // 2:05

    context.currentTimeMs = 75000; // 75 seconds = 1:15
    await vi.waitUntil(
      () => timeDisplay.shadowRoot?.textContent?.trim() === "1:15 / 2:05",
    );
  });

  test("updates display when time changes", async () => {
    const { timeDisplay } = renderTimeDisplay(
      html`<ef-preview>
        <ef-timegroup mode="fixed" duration="10s"></ef-timegroup>
        <ef-time-display></ef-time-display>
      </ef-preview>`,
    );

    const context = timeDisplay.closest("ef-preview")!;
    const timegroup = context.querySelector("ef-timegroup") as EFTimegroup;

    await timegroup.updateComplete;

    // Initial time
    await timegroup.seek(2000); // 2 seconds = 0:02
    await new Promise((resolve) => requestAnimationFrame(resolve));
    await context.updateComplete;
    await timeDisplay.updateComplete;

    let timeText = timeDisplay.shadowRoot?.textContent?.trim();
    assert.equal(timeText, "0:02 / 0:10");

    // Update time
    await timegroup.seek(7000); // 7 seconds = 0:07
    await new Promise((resolve) => requestAnimationFrame(resolve));
    await context.updateComplete;
    await timeDisplay.updateComplete;

    timeText = timeDisplay.shadowRoot?.textContent?.trim();
    assert.equal(timeText, "0:07 / 0:10", "Should update when time changes");
  });

  test("handles zero duration", async () => {
    const { timeDisplay } = renderTimeDisplay(
      html`<ef-preview>
        <ef-timegroup mode="fixed" duration="10s"></ef-timegroup>
        <ef-time-display></ef-time-display>
      </ef-preview>`,
    );

    const context = timeDisplay.closest("ef-preview")!;
    const timegroup = context.targetTemporal!;

    (timegroup as unknown as Element).setAttribute("duration", "0s");
    assert.equal(timegroup.durationMs, 0);

    await timegroup.updateComplete;
    await timeDisplay.updateComplete;
    await vi.waitUntil(
      () => timeDisplay.shadowRoot?.textContent?.trim() === "0:00 / 0:00",
    );
  });

  test("handles context changes correctly", async () => {
    const { timeDisplay } = renderTimeDisplay(
      html`<ef-preview>
        <ef-timegroup mode="fixed" duration="10s"></ef-timegroup>
        <ef-time-display></ef-time-display>
      </ef-preview>`,
    );

    const context = timeDisplay.closest("ef-preview")!;

    // Set initial values
    context.currentTimeMs = 1000;
    await timeDisplay.updateComplete;

    let timeText = timeDisplay.shadowRoot?.textContent?.trim();
    assert.equal(timeText, "0:01 / 0:10");

    // Move to a different context (using renderTimeDisplay to get proper TestContext)
    const { timeDisplay: newTimeDisplay, container: newContainer } =
      renderTimeDisplay(
        html`<ef-preview>
        <ef-timegroup mode="fixed" duration="10s"></ef-timegroup>
        <ef-time-display></ef-time-display>
      </ef-preview>`,
      );

    const newContext = newTimeDisplay.closest("ef-preview")!;

    // Set different values in new context
    newContext.currentTimeMs = 3000;
    await newTimeDisplay.updateComplete;

    timeText = newTimeDisplay.shadowRoot?.textContent?.trim();
    assert.equal(timeText, "0:03 / 0:10", "Should work with new context");

    newContainer.remove();
  });
});
