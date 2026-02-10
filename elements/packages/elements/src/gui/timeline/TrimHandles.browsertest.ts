import { afterEach, describe, expect, test } from "vitest";
import "../../elements/EFVideo.js";
import "./TrimHandles.js";
import type { EFTrimHandles, TrimChangeDetail } from "./TrimHandles.js";

let idCounter = 0;
const nextId = () => `test-${idCounter++}`;

function createContainer(width = 400, height = 100) {
  const container = document.createElement("div");
  container.style.position = "relative";
  container.style.width = `${width}px`;
  container.style.height = `${height}px`;
  document.body.appendChild(container);
  return container;
}

function createTrimHandles(
  container: HTMLElement,
  overrides: Partial<{
    pixelsPerMs: number;
    trimStartMs: number;
    trimEndMs: number;
    intrinsicDurationMs: number;
    mode: "standalone" | "track";
  }> = {},
) {
  const trimHandles = document.createElement("ef-trim-handles") as EFTrimHandles;
  trimHandles.elementId = nextId();
  trimHandles.pixelsPerMs = overrides.pixelsPerMs ?? 0.1;
  trimHandles.trimStartMs = overrides.trimStartMs ?? 0;
  trimHandles.trimEndMs = overrides.trimEndMs ?? 0;
  trimHandles.intrinsicDurationMs = overrides.intrinsicDurationMs ?? 10000;
  if (overrides.mode) trimHandles.mode = overrides.mode;
  container.appendChild(trimHandles);
  return trimHandles;
}

function collectTrimChanges(trimHandles: EFTrimHandles) {
  const changes: TrimChangeDetail[] = [];
  trimHandles.addEventListener("trim-change", ((e: CustomEvent<TrimChangeDetail>) => {
    changes.push(e.detail);
  }) as EventListener);
  return changes;
}

async function simulateDrag(
  handle: HTMLElement,
  container: HTMLElement,
  startX: number,
  endX: number,
  updateComplete: Promise<boolean>,
) {
  const rect = container.getBoundingClientRect();
  handle.dispatchEvent(
    new PointerEvent("pointerdown", {
      bubbles: true,
      cancelable: true,
      clientX: rect.left + startX,
      clientY: rect.top + 50,
      pointerId: 1,
    }),
  );
  await updateComplete;

  handle.dispatchEvent(
    new PointerEvent("pointermove", {
      bubbles: true,
      cancelable: true,
      clientX: rect.left + endX,
      clientY: rect.top + 50,
      pointerId: 1,
    }),
  );
  await updateComplete;
}

describe("EFTrimHandles", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    idCounter = 0;
  });

  // ============================================================================
  // EVENT DETAIL SHAPE
  // ============================================================================

  test("trim-change event includes value for start handle", async () => {
    const container = createContainer();
    const trimHandles = createTrimHandles(container, { trimStartMs: 0, trimEndMs: 2000 });
    await trimHandles.updateComplete;

    const changes = collectTrimChanges(trimHandles);
    const startHandle = trimHandles.shadowRoot?.querySelector(".handle-start") as HTMLElement;

    await simulateDrag(startHandle, container, 10, 50, trimHandles.updateComplete);

    expect(changes.length).toBeGreaterThan(0);
    const detail = changes[changes.length - 1];
    expect(detail.type).toBe("start");
    expect(detail.elementId).toBe(trimHandles.elementId);
    expect(detail.value.startMs).toBeGreaterThanOrEqual(0);
    expect(detail.value.endMs).toBe(2000); // unchanged
  }, 1000);

  test("trim-change event includes value for end handle", async () => {
    const container = createContainer();
    const trimHandles = createTrimHandles(container, { trimStartMs: 2000, trimEndMs: 0 });
    await trimHandles.updateComplete;

    const changes = collectTrimChanges(trimHandles);
    const endHandle = trimHandles.shadowRoot?.querySelector(".handle-end") as HTMLElement;
    const rect = container.getBoundingClientRect();

    await simulateDrag(endHandle, container, rect.width - 10, rect.width - 50, trimHandles.updateComplete);

    expect(changes.length).toBeGreaterThan(0);
    const detail = changes[changes.length - 1];
    expect(detail.type).toBe("end");
    expect(detail.value.startMs).toBe(2000); // unchanged
    expect(detail.value.endMs).toBeGreaterThanOrEqual(0);
  }, 1000);

  // ============================================================================
  // CLAMPING
  // ============================================================================

  test("should constrain trimStartMs to not exceed duration minus trimEndMs", async () => {
    const container = createContainer();
    const trimHandles = createTrimHandles(container, { trimStartMs: 0, trimEndMs: 2000 });
    await trimHandles.updateComplete;

    const changes = collectTrimChanges(trimHandles);
    const startHandle = trimHandles.shadowRoot?.querySelector(".handle-start") as HTMLElement;

    await simulateDrag(startHandle, container, 10, 90000, trimHandles.updateComplete);

    expect(changes.length).toBeGreaterThan(0);
    const lastChange = changes[changes.length - 1];
    expect(lastChange.value.startMs).toBeLessThanOrEqual(
      trimHandles.intrinsicDurationMs - trimHandles.trimEndMs,
    );
  }, 1000);

  test("should constrain trimEndMs to not exceed duration minus trimStartMs", async () => {
    const container = createContainer();
    const trimHandles = createTrimHandles(container, { trimStartMs: 2000, trimEndMs: 0 });
    await trimHandles.updateComplete;

    const changes = collectTrimChanges(trimHandles);
    const endHandle = trimHandles.shadowRoot?.querySelector(".handle-end") as HTMLElement;
    const rect = container.getBoundingClientRect();

    await simulateDrag(endHandle, container, rect.width - 10, rect.width + 90000, trimHandles.updateComplete);

    expect(changes.length).toBeGreaterThan(0);
    const lastChange = changes[changes.length - 1];
    expect(lastChange.value.endMs).toBeLessThanOrEqual(
      trimHandles.intrinsicDurationMs - trimHandles.trimStartMs,
    );
  }, 1000);

  test("should prevent trimStartMs from going below 0", async () => {
    const container = createContainer();
    const trimHandles = createTrimHandles(container, { trimStartMs: 1000 });
    await trimHandles.updateComplete;

    const changes = collectTrimChanges(trimHandles);
    const startHandle = trimHandles.shadowRoot?.querySelector(".handle-start") as HTMLElement;

    await simulateDrag(startHandle, container, 10, -20000, trimHandles.updateComplete);

    expect(changes.length).toBeGreaterThan(0);
    const lastChange = changes[changes.length - 1];
    expect(lastChange.value.startMs).toBeGreaterThanOrEqual(0);
  }, 1000);

  // ============================================================================
  // TRIM-CHANGE-END
  // ============================================================================

  test("should dispatch trim-change-end event when drag ends", async () => {
    const container = createContainer();
    const trimHandles = createTrimHandles(container);
    await trimHandles.updateComplete;

    let endDetail: { elementId: string; type: string } | null = null;
    trimHandles.addEventListener("trim-change-end", ((e: CustomEvent) => {
      endDetail = e.detail;
    }) as EventListener);

    const startHandle = trimHandles.shadowRoot?.querySelector(".handle-start") as HTMLElement;
    const rect = container.getBoundingClientRect();

    startHandle.dispatchEvent(
      new PointerEvent("pointerdown", {
        bubbles: true, cancelable: true,
        clientX: rect.left + 10, clientY: rect.top + 50, pointerId: 1,
      }),
    );
    await trimHandles.updateComplete;

    startHandle.dispatchEvent(
      new PointerEvent("pointerup", { bubbles: true, cancelable: true, pointerId: 1 }),
    );
    await trimHandles.updateComplete;

    expect(endDetail).toBeTruthy();
    expect(endDetail?.elementId).toBe(trimHandles.elementId);
    expect(endDetail?.type).toBe("start");
  }, 1000);

  // ============================================================================
  // STANDALONE MODE (default) — handles positioned at trim boundaries
  // ============================================================================

  test("standalone mode positions start handle at trimStart boundary", async () => {
    const container = createContainer(1000);
    const trimHandles = createTrimHandles(container, {
      pixelsPerMs: 0.1,
      trimStartMs: 2000,
      trimEndMs: 0,
      intrinsicDurationMs: 10000,
    });
    await trimHandles.updateComplete;

    const startHandle = trimHandles.shadowRoot?.querySelector(".handle-start") as HTMLElement;
    // trimStartMs=2000, pixelsPerMs=0.1 → handle at 200px
    expect(startHandle.style.left).toBe("200px");
  }, 1000);

  test("standalone mode positions end handle at trimEnd boundary", async () => {
    const container = createContainer(1000);
    const trimHandles = createTrimHandles(container, {
      pixelsPerMs: 0.1,
      trimStartMs: 0,
      trimEndMs: 3000,
      intrinsicDurationMs: 10000,
    });
    await trimHandles.updateComplete;

    const endHandle = trimHandles.shadowRoot?.querySelector(".handle-end") as HTMLElement;
    // trimEndMs=3000, pixelsPerMs=0.1 → handle at right: 300px
    expect(endHandle.style.right).toBe("300px");
  }, 1000);

  // ============================================================================
  // TRACK MODE — handles pinned at container edges
  // ============================================================================

  test("track mode pins handles at container edges", async () => {
    const container = createContainer();
    const trimHandles = createTrimHandles(container, {
      mode: "track",
      trimStartMs: 2000,
      trimEndMs: 3000,
    });
    await trimHandles.updateComplete;

    const startHandle = trimHandles.shadowRoot?.querySelector(".handle-start") as HTMLElement;
    const endHandle = trimHandles.shadowRoot?.querySelector(".handle-end") as HTMLElement;

    // In track mode, handles stay at edges regardless of trim values
    expect(startHandle.style.left).toBe("");
    expect(endHandle.style.right).toBe("");
  }, 1000);

  // ============================================================================
  // REGION DRAG
  // ============================================================================

  test("standalone mode renders a draggable region zone", async () => {
    const container = createContainer();
    const trimHandles = createTrimHandles(container, {
      trimStartMs: 2000,
      trimEndMs: 2000,
    });
    await trimHandles.updateComplete;

    const region = trimHandles.shadowRoot?.querySelector(".region") as HTMLElement;
    expect(region).toBeTruthy();
  }, 1000);

  test("region drag emits trim-change with type region and both values adjusted", async () => {
    const container = createContainer(1000);
    const trimHandles = createTrimHandles(container, {
      pixelsPerMs: 0.1,
      trimStartMs: 2000,
      trimEndMs: 2000,
      intrinsicDurationMs: 10000,
    });
    await trimHandles.updateComplete;

    const changes = collectTrimChanges(trimHandles);
    const region = trimHandles.shadowRoot?.querySelector(".region") as HTMLElement;
    expect(region).toBeTruthy();

    // Drag region 100px to the right → 1000ms
    await simulateDrag(region, container, 500, 600, trimHandles.updateComplete);

    expect(changes.length).toBeGreaterThan(0);
    const detail = changes[changes.length - 1];
    expect(detail.type).toBe("region");
    // Dragging right: trimStart increases, trimEnd decreases
    expect(detail.value.startMs).toBeGreaterThan(2000);
    expect(detail.value.endMs).toBeLessThan(2000);
    // Kept duration should remain the same
    const originalKept = 10000 - 2000 - 2000;
    const newKept = 10000 - detail.value.startMs - detail.value.endMs;
    expect(newKept).toBeCloseTo(originalKept, 0);
  }, 1000);

  test("region drag clamps at start boundary", async () => {
    const container = createContainer(1000);
    const trimHandles = createTrimHandles(container, {
      pixelsPerMs: 0.1,
      trimStartMs: 1000,
      trimEndMs: 3000,
      intrinsicDurationMs: 10000,
    });
    await trimHandles.updateComplete;

    const changes = collectTrimChanges(trimHandles);
    const region = trimHandles.shadowRoot?.querySelector(".region") as HTMLElement;

    // Drag far to the left — should clamp trimStartMs at 0
    await simulateDrag(region, container, 500, -5000, trimHandles.updateComplete);

    expect(changes.length).toBeGreaterThan(0);
    const detail = changes[changes.length - 1];
    expect(detail.value.startMs).toBe(0);
    expect(detail.value.endMs).toBe(4000); // original kept = 6000, so trimEnd = 10000 - 6000 = 4000
  }, 1000);

  test("region drag clamps at end boundary", async () => {
    const container = createContainer(1000);
    const trimHandles = createTrimHandles(container, {
      pixelsPerMs: 0.1,
      trimStartMs: 3000,
      trimEndMs: 1000,
      intrinsicDurationMs: 10000,
    });
    await trimHandles.updateComplete;

    const changes = collectTrimChanges(trimHandles);
    const region = trimHandles.shadowRoot?.querySelector(".region") as HTMLElement;

    // Drag far to the right — should clamp trimEndMs at 0
    await simulateDrag(region, container, 500, 6000, trimHandles.updateComplete);

    expect(changes.length).toBeGreaterThan(0);
    const detail = changes[changes.length - 1];
    expect(detail.value.endMs).toBe(0);
    expect(detail.value.startMs).toBe(4000); // original kept = 6000, so trimStart = 10000 - 6000 = 4000
  }, 1000);

  // ============================================================================
  // SEEK TARGET
  // ============================================================================

  test("seeks target to 0 when dragging start handle", async () => {
    const container = createContainer(1000);

    // Create a mock seek target with a currentTimeMs property
    const seekTarget = document.createElement("div") as HTMLElement & { currentTimeMs: number };
    seekTarget.id = "seek-target-start";
    (seekTarget as any).currentTimeMs = 5000;
    container.appendChild(seekTarget);

    const trimHandles = createTrimHandles(container, {
      pixelsPerMs: 0.1,
      trimStartMs: 1000,
      trimEndMs: 1000,
      intrinsicDurationMs: 10000,
    });
    trimHandles.seekTarget = seekTarget.id;
    await trimHandles.updateComplete;

    const startHandle = trimHandles.shadowRoot?.querySelector(".handle-start") as HTMLElement;
    await simulateDrag(startHandle, container, 100, 200, trimHandles.updateComplete);

    expect((seekTarget as any).currentTimeMs).toBe(0);
  }, 1000);

  test("seeks target to end of kept duration when dragging end handle", async () => {
    const container = createContainer(1000);

    const seekTarget = document.createElement("div") as HTMLElement & { currentTimeMs: number };
    seekTarget.id = "seek-target-end";
    (seekTarget as any).currentTimeMs = 0;
    container.appendChild(seekTarget);

    const trimHandles = createTrimHandles(container, {
      pixelsPerMs: 0.1,
      trimStartMs: 1000,
      trimEndMs: 1000,
      intrinsicDurationMs: 10000,
    });
    trimHandles.seekTarget = seekTarget.id;
    await trimHandles.updateComplete;

    const endHandle = trimHandles.shadowRoot?.querySelector(".handle-end") as HTMLElement;
    const rect = container.getBoundingClientRect();
    await simulateDrag(endHandle, container, rect.width - 100, rect.width - 200, trimHandles.updateComplete);

    // Should seek to the kept duration (intrinsic - trimStart - new trimEnd)
    expect((seekTarget as any).currentTimeMs).toBeGreaterThan(0);
  }, 1000);

  test("seeks target to 0 when dragging region", async () => {
    const container = createContainer(1000);

    const seekTarget = document.createElement("div") as HTMLElement & { currentTimeMs: number };
    seekTarget.id = "seek-target-region";
    (seekTarget as any).currentTimeMs = 5000;
    container.appendChild(seekTarget);

    const trimHandles = createTrimHandles(container, {
      pixelsPerMs: 0.1,
      trimStartMs: 2000,
      trimEndMs: 2000,
      intrinsicDurationMs: 10000,
    });
    trimHandles.seekTarget = seekTarget.id;
    await trimHandles.updateComplete;

    const region = trimHandles.shadowRoot?.querySelector(".region") as HTMLElement;
    await simulateDrag(region, container, 500, 600, trimHandles.updateComplete);

    expect((seekTarget as any).currentTimeMs).toBe(0);
  }, 1000);

  test("does not seek when no seek-target is set", async () => {
    const container = createContainer(1000);

    // No seekTarget — just verify no error occurs
    const trimHandles = createTrimHandles(container, {
      pixelsPerMs: 0.1,
      trimStartMs: 1000,
      trimEndMs: 1000,
      intrinsicDurationMs: 10000,
    });
    await trimHandles.updateComplete;

    const startHandle = trimHandles.shadowRoot?.querySelector(".handle-start") as HTMLElement;
    // Should not throw
    await simulateDrag(startHandle, container, 100, 200, trimHandles.updateComplete);
  }, 1000);

  test("region zone is not rendered in track mode", async () => {
    const container = createContainer();
    const trimHandles = createTrimHandles(container, {
      mode: "track",
      trimStartMs: 2000,
      trimEndMs: 2000,
    });
    await trimHandles.updateComplete;

    const region = trimHandles.shadowRoot?.querySelector(".region") as HTMLElement;
    expect(region).toBeNull();
  }, 1000);
});
