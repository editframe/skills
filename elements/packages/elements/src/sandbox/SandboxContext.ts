/**
 * Runtime context provided to scenario functions
 */
export class SandboxContext {
  private container: HTMLElement;
  private logs: string[] = [];

  constructor(container: HTMLElement) {
    this.container = container;
  }

  /**
   * Get the container element that holds the sandbox
   */
  getContainer(): HTMLElement {
    return this.container;
  }

  /**
   * Query for an element within the sandbox container
   */
  querySelector<T extends Element = Element>(selector: string): T | null {
    return this.container.querySelector<T>(selector);
  }

  /**
   * Query for all elements matching a selector
   */
  querySelectorAll<T extends Element = Element>(selector: string): NodeListOf<T> {
    return this.container.querySelectorAll<T>(selector);
  }

  /**
   * Wait for the next animation frame
   */
  async frame(): Promise<void> {
    return new Promise((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve());
      });
    });
  }

  /**
   * Wait for a specified number of milliseconds
   */
  async wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Simulate a drag interaction on an element
   */
  async drag(
    element: Element,
    options: {
      from: [number, number];
      to: [number, number];
      steps?: number;
    },
  ): Promise<void> {
    const steps = options.steps || 10;
    const [fromX, fromY] = options.from;
    const [toX, toY] = options.to;
    const deltaX = (toX - fromX) / steps;
    const deltaY = (toY - fromY) / steps;

    const rect = element.getBoundingClientRect();
    const startX = rect.left + fromX;
    const startY = rect.top + fromY;

    // Pointer down
    const downEvent = new PointerEvent("pointerdown", {
      clientX: startX,
      clientY: startY,
      bubbles: true,
      composed: true,
      pointerId: 1,
      button: 0,
    });
    element.dispatchEvent(downEvent);

    await this.frame();

    // Move steps
    for (let i = 1; i <= steps; i++) {
      const currentX = startX + deltaX * i;
      const currentY = startY + deltaY * i;

      const moveEvent = new PointerEvent("pointermove", {
        clientX: currentX,
        clientY: currentY,
        bubbles: true,
        composed: true,
        pointerId: 1,
        button: 0,
      });
      element.dispatchEvent(moveEvent);

      await this.frame();
    }

    // Pointer up
    const upEvent = new PointerEvent("pointerup", {
      clientX: startX + deltaX * steps,
      clientY: startY + deltaY * steps,
      bubbles: true,
      composed: true,
      pointerId: 1,
      button: 0,
    });
    element.dispatchEvent(upEvent);

    await this.frame();
  }

  /**
   * Simulate a wheel event on an element
   */
  async wheel(
    element: Element,
    options: {
      deltaX?: number;
      deltaY?: number;
      ctrlKey?: boolean;
      metaKey?: boolean;
      shiftKey?: boolean;
    },
  ): Promise<void> {
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const wheelEvent = new WheelEvent("wheel", {
      deltaX: options.deltaX ?? 0,
      deltaY: options.deltaY ?? 0,
      ctrlKey: options.ctrlKey ?? false,
      metaKey: options.metaKey ?? false,
      shiftKey: options.shiftKey ?? false,
      clientX: centerX,
      clientY: centerY,
      bubbles: true,
      cancelable: true,
    });
    element.dispatchEvent(wheelEvent);

    await this.frame();
  }

  /**
   * Log a message (visible in scenario output)
   */
  log(message: string): void {
    this.logs.push(message);
    console.log(`[Sandbox] ${message}`);
  }

  /**
   * Get all logs from this context
   */
  getLogs(): readonly string[] {
    return this.logs;
  }

  /**
   * Assertion API - throws on failure
   */
  expect<T>(actual: T): ExpectMatcher<T> {
    return new ExpectMatcher(actual, this);
  }
}

/**
 * Expect matcher for assertions
 */
class ExpectMatcher<T> {
  private actual: T;

  constructor(actual: T, _ctx: SandboxContext) {
    this.actual = actual;
  }

  /**
   * Assert strict equality
   */
  toBe(expected: T): void {
    if (this.actual !== expected) {
      throw new Error(
        `Expected ${this.stringify(this.actual)} to be ${this.stringify(expected)}`,
      );
    }
  }

  /**
   * Assert loose equality
   */
  toEqual(expected: T): void {
    if (!this.deepEqual(this.actual, expected)) {
      throw new Error(
        `Expected ${this.stringify(this.actual)} to equal ${this.stringify(expected)}`,
      );
    }
  }

  /**
   * Assert value is defined (not null or undefined)
   */
  toBeDefined(): void {
    if (this.actual === null || this.actual === undefined) {
      throw new Error(`Expected value to be defined, but got ${this.stringify(this.actual)}`);
    }
  }

  /**
   * Assert value is null or undefined
   */
  toBeUndefined(): void {
    if (this.actual !== null && this.actual !== undefined) {
      throw new Error(
        `Expected value to be undefined, but got ${this.stringify(this.actual)}`,
      );
    }
  }

  /**
   * Assert value is truthy
   */
  toBeTruthy(): void {
    if (!this.actual) {
      throw new Error(`Expected value to be truthy, but got ${this.stringify(this.actual)}`);
    }
  }

  /**
   * Assert value is falsy
   */
  toBeFalsy(): void {
    if (this.actual) {
      throw new Error(`Expected value to be falsy, but got ${this.stringify(this.actual)}`);
    }
  }

  /**
   * Assert number is close to expected value (within tolerance)
   */
  toBeCloseTo(expected: number, precision: number = 2): void {
    if (typeof this.actual !== "number") {
      throw new Error(
        `Expected ${this.stringify(this.actual)} to be a number`,
      );
    }
    const diff = Math.abs((this.actual as number) - expected);
    if (diff > precision) {
      throw new Error(
        `Expected ${this.actual} to be close to ${expected} (within ${precision})`,
      );
    }
  }

  /**
   * Assert value is greater than expected
   */
  toBeGreaterThan(expected: number): void {
    if (typeof this.actual !== "number") {
      throw new Error(
        `Expected ${this.stringify(this.actual)} to be a number`,
      );
    }
    if ((this.actual as number) <= expected) {
      throw new Error(
        `Expected ${this.actual} to be greater than ${expected}`,
      );
    }
  }

  /**
   * Assert value is less than expected
   */
  toBeLessThan(expected: number): void {
    if (typeof this.actual !== "number") {
      throw new Error(
        `Expected ${this.stringify(this.actual)} to be a number`,
      );
    }
    if ((this.actual as number) >= expected) {
      throw new Error(
        `Expected ${this.actual} to be less than ${expected}`,
      );
    }
  }

  /**
   * Assert value is less than or equal to expected
   */
  toBeLessThanOrEqual(expected: number): void {
    if (typeof this.actual !== "number") {
      throw new Error(
        `Expected ${this.stringify(this.actual)} to be a number`,
      );
    }
    if ((this.actual as number) > expected) {
      throw new Error(
        `Expected ${this.actual} to be less than or equal to ${expected}`,
      );
    }
  }

  /**
   * Assert value is greater than or equal to expected
   */
  toBeGreaterThanOrEqual(expected: number): void {
    if (typeof this.actual !== "number") {
      throw new Error(
        `Expected ${this.stringify(this.actual)} to be a number`,
      );
    }
    if ((this.actual as number) < expected) {
      throw new Error(
        `Expected ${this.actual} to be greater than or equal to ${expected}`,
      );
    }
  }

  /**
   * Assert string contains substring
   */
  toContain(substring: string): void {
    if (typeof this.actual !== "string") {
      throw new Error(
        `Expected ${this.stringify(this.actual)} to be a string`,
      );
    }
    if (!(this.actual as string).includes(substring)) {
      throw new Error(
        `Expected "${this.actual}" to contain "${substring}"`,
      );
    }
  }

  private stringify(value: unknown): string {
    if (value === null) return "null";
    if (value === undefined) return "undefined";
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  private deepEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true;
    if (a === null || b === null) return false;
    if (a === undefined || b === undefined) return false;
    if (typeof a !== typeof b) return false;
    if (typeof a !== "object") return false;

    const aObj = a as Record<string, unknown>;
    const bObj = b as Record<string, unknown>;

    const aKeys = Object.keys(aObj);
    const bKeys = Object.keys(bObj);

    if (aKeys.length !== bKeys.length) return false;

    for (const key of aKeys) {
      if (!(key in bObj)) return false;
      if (!this.deepEqual(aObj[key], bObj[key])) return false;
    }

    return true;
  }
}
