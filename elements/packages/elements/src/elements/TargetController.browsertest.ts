import { html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { afterEach, describe, expect, test } from "vitest";
import { EFTargetable, TargetController } from "./TargetController.ts";

let id = 0;

const nextId = () => {
  return `targetable-test-${id++}`;
};

@customElement("targetable-test")
class TargetableTest extends EFTargetable(LitElement) {
  @property()
  value = "initial";

  render() {
    return html`<div>${this.value}</div>`;
  }
}

@customElement("targeter-test")
class TargeterTest extends LitElement {
  // @ts-expect-error this controller is needed, but never referenced
  // biome-ignore lint/correctness/noUnusedPrivateClassMembers: Used for side effects
  private targetController: TargetController = new TargetController(this);

  @state()
  targetElement: Element | null = null;

  @property()
  target = "";

  render() {
    const target = this.targetElement;
    return html`
      <div>
        ${target ? html`Found: ${target.tagName}` : html`Finding target...`}
      </div>
    `;
  }
}

describe("target", () => {
  afterEach(() => {
    // Clean up all test elements from the document body
    document.body.innerHTML = "";
  });

  test("should be able to get the target element", async () => {
    const target = document.createElement("targetable-test");
    const element = document.createElement("targeter-test");
    document.body.appendChild(target);
    document.body.appendChild(element);

    const id = nextId();
    target.id = id;
    element.target = id;

    await element.updateComplete;
    expect(element.targetElement).toBe(target);
  });

  test("should update when document changes", async () => {
    const target = document.createElement("targetable-test");
    const element = document.createElement("targeter-test");
    document.body.appendChild(element);

    const id = nextId();
    element.target = id;

    expect(element.targetElement).toBe(null);

    target.id = id;
    document.body.appendChild(target);
    await element.updateComplete;
    expect(element.targetElement).toBe(target);
  });

  test("should update when attribute changes", async () => {
    const target = document.createElement("targetable-test");
    const element = document.createElement("targeter-test");
    document.body.appendChild(element);
    document.body.appendChild(target);

    const id = nextId();
    target.id = id;
    element.target = id;

    await element.updateComplete;
    expect(element.targetElement).toBe(target);

    target.id = nextId();
    await element.updateComplete;
    expect(element.targetElement).toBe(null);
  });

  test("should update when target is set before id exists", async () => {
    const target = document.createElement("targetable-test");
    const element = document.createElement("targeter-test");
    document.body.appendChild(target);
    document.body.appendChild(element);

    const id = nextId();
    element.target = id;
    expect(element.targetElement).toBe(null);

    target.id = id;
    await element.updateComplete;
    expect(element.targetElement).toBe(target);
  });

  test("should update when target changes to match existing id", async () => {
    const target = document.createElement("targetable-test");
    const element = document.createElement("targeter-test");
    document.body.appendChild(target);
    document.body.appendChild(element);

    const id = nextId();
    target.id = id;
    expect(element.targetElement).toBe(null);

    element.target = id;
    await element.updateComplete;
    expect(element.targetElement).toBe(target);
  });

  test("should handle target being cleared", async () => {
    const target = document.createElement("targetable-test");
    const element = document.createElement("targeter-test");
    document.body.appendChild(target);
    document.body.appendChild(element);

    const id = nextId();
    target.id = id;
    element.target = id;

    await element.updateComplete;
    expect(element.targetElement).toBe(target);

    element.target = "";
    await element.updateComplete;
    expect(element.targetElement).toBe(null);
  });

  test("should handle multiple elements targeting the same id", async () => {
    const target = document.createElement("targetable-test");
    const element1 = document.createElement("targeter-test");
    const element2 = document.createElement("targeter-test");
    document.body.appendChild(target);
    document.body.appendChild(element1);
    document.body.appendChild(element2);

    const id = nextId();
    target.id = id;
    element1.target = id;
    element2.target = id;

    await Promise.all([element1.updateComplete, element2.updateComplete]);
    expect(element1.targetElement).toBe(target);
    expect(element2.targetElement).toBe(target);
  });

  test("should handle element removal from DOM", async () => {
    const target = document.createElement("targetable-test");
    const element = document.createElement("targeter-test");
    document.body.appendChild(target);
    document.body.appendChild(element);

    const id = nextId();
    target.id = id;
    element.target = id;

    await element.updateComplete;
    expect(element.targetElement).toBe(target);

    document.body.removeChild(target);
    await element.updateComplete;
    expect(element.targetElement).toBe(null);
  });

  test("should handle rapid target id changes", async () => {
    const target = document.createElement("targetable-test");
    const element = document.createElement("targeter-test");
    document.body.appendChild(target);
    document.body.appendChild(element);

    const id1 = nextId();
    const id2 = nextId();
    const id3 = nextId();

    target.id = id1;
    element.target = id1;
    await element.updateComplete;
    expect(element.targetElement).toBe(target);

    target.id = id2;
    target.id = id3; // Immediately change again
    await element.updateComplete;
    expect(element.targetElement).toBe(null);
  });

  test("should not trigger unnecessary updates when setting same id multiple times", async () => {
    const target = document.createElement("targetable-test");
    const element = document.createElement("targeter-test");
    document.body.appendChild(target);
    document.body.appendChild(element);

    const id = nextId();
    target.id = id;
    element.target = id;

    await element.updateComplete;
    expect(element.targetElement).toBe(target);

    // Set the same ID again
    target.id = id;
    await element.updateComplete;

    // The target element should remain stable
    expect(element.targetElement).toBe(target);
  });
});

describe("TargetUpdateController opt-in", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  test("target updates do NOT trigger host requestUpdate by default", async () => {
    const target = document.createElement("targetable-test");
    const element = document.createElement("targeter-test");
    document.body.appendChild(target);
    document.body.appendChild(element);

    const targetId = nextId();
    target.id = targetId;
    element.target = targetId;
    await element.updateComplete;
    expect(element.targetElement).toBe(target);

    // Count host updates
    let updateCount = 0;
    const origRequestUpdate = element.requestUpdate.bind(element);
    element.requestUpdate = (...args: any) => {
      updateCount++;
      return origRequestUpdate(...args);
    };

    // Trigger multiple target updates
    target.value = "changed-1";
    await target.updateComplete;
    target.value = "changed-2";
    await target.updateComplete;

    // Host should NOT have been updated by TargetUpdateController
    expect(updateCount).toBe(0);
  });
});

declare global {
  interface HTMLElementTagNameMap {
    "targetable-test": TargetableTest & Element;
    "targeter-test": TargeterTest & Element;
  }
}
