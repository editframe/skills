/**
 * A recorded assertion from a scenario run
 */
export interface Assertion {
  /** Whether the assertion passed */
  passed: boolean;
  /** Human-readable description of what was asserted */
  message: string;
  /** The actual value that was tested */
  actual?: unknown;
  /** The expected value (if applicable) */
  expected?: unknown;
}

/**
 * Runtime context provided to scenario functions
 */
export class SandboxContext {
  private container: HTMLElement;
  private logs: string[] = [];
  private assertions: Assertion[] = [];
  private onLog?: (message: string) => void;

  constructor(container: HTMLElement, onLog?: (message: string) => void) {
    this.container = container;
    this.onLog = onLog;
  }

  /**
   * Record an assertion (called internally by ExpectMatcher)
   */
  recordAssertion(assertion: Assertion): void {
    this.assertions.push(assertion);
  }

  /**
   * Get all recorded assertions
   */
  getAssertions(): readonly Assertion[] {
    return this.assertions;
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
      requestAnimationFrame(() => resolve());
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
    if (this.onLog) {
      this.onLog(message);
    }
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
  private ctx: SandboxContext;

  constructor(actual: T, ctx: SandboxContext) {
    this.actual = actual;
    this.ctx = ctx;
  }

  /**
   * Assert strict equality
   */
  toBe(expected: T): void {
    const passed = this.actual === expected;
    this.ctx.recordAssertion({
      passed,
      message: `${this.stringify(this.actual)} to be ${this.stringify(expected)}`,
      actual: this.actual,
      expected,
    });
    if (!passed) {
      throw new Error(
        `Expected ${this.stringify(this.actual)} to be ${this.stringify(expected)}`,
      );
    }
  }

  /**
   * Assert loose equality
   */
  toEqual(expected: T): void {
    const passed = this.deepEqual(this.actual, expected);
    this.ctx.recordAssertion({
      passed,
      message: `${this.stringify(this.actual)} to equal ${this.stringify(expected)}`,
      actual: this.actual,
      expected,
    });
    if (!passed) {
      throw new Error(
        `Expected ${this.stringify(this.actual)} to equal ${this.stringify(expected)}`,
      );
    }
  }

  /**
   * Assert value is defined (not null or undefined)
   */
  toBeDefined(): void {
    const passed = this.actual !== null && this.actual !== undefined;
    this.ctx.recordAssertion({
      passed,
      message: `value to be defined (got ${this.stringify(this.actual)})`,
      actual: this.actual,
    });
    if (!passed) {
      throw new Error(`Expected value to be defined, but got ${this.stringify(this.actual)}`);
    }
  }

  /**
   * Assert value is null or undefined
   */
  toBeUndefined(): void {
    const passed = this.actual === null || this.actual === undefined;
    this.ctx.recordAssertion({
      passed,
      message: `value to be undefined (got ${this.stringify(this.actual)})`,
      actual: this.actual,
    });
    if (!passed) {
      throw new Error(
        `Expected value to be undefined, but got ${this.stringify(this.actual)}`,
      );
    }
  }

  /**
   * Assert value is null
   */
  toBeNull(): void {
    const passed = this.actual === null;
    this.ctx.recordAssertion({
      passed,
      message: `value to be null (got ${this.stringify(this.actual)})`,
      actual: this.actual,
    });
    if (!passed) {
      throw new Error(
        `Expected value to be null, but got ${this.stringify(this.actual)}`,
      );
    }
  }

  /**
   * Assert value is truthy
   */
  toBeTruthy(): void {
    const passed = Boolean(this.actual);
    this.ctx.recordAssertion({
      passed,
      message: `value to be truthy (got ${this.stringify(this.actual)})`,
      actual: this.actual,
    });
    if (!passed) {
      throw new Error(`Expected value to be truthy, but got ${this.stringify(this.actual)}`);
    }
  }

  /**
   * Assert value is falsy
   */
  toBeFalsy(): void {
    const passed = !this.actual;
    this.ctx.recordAssertion({
      passed,
      message: `value to be falsy (got ${this.stringify(this.actual)})`,
      actual: this.actual,
    });
    if (!passed) {
      throw new Error(`Expected value to be falsy, but got ${this.stringify(this.actual)}`);
    }
  }

  /**
   * Assert number is close to expected value (within tolerance)
   */
  toBeCloseTo(expected: number, precision: number = 2): void {
    if (typeof this.actual !== "number") {
      this.ctx.recordAssertion({
        passed: false,
        message: `${this.stringify(this.actual)} to be a number`,
        actual: this.actual,
      });
      throw new Error(
        `Expected ${this.stringify(this.actual)} to be a number`,
      );
    }
    const diff = Math.abs((this.actual as number) - expected);
    const passed = diff <= precision;
    this.ctx.recordAssertion({
      passed,
      message: `${this.actual} to be close to ${expected} (within ${precision})`,
      actual: this.actual,
      expected,
    });
    if (!passed) {
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
      this.ctx.recordAssertion({
        passed: false,
        message: `${this.stringify(this.actual)} to be a number`,
        actual: this.actual,
      });
      throw new Error(
        `Expected ${this.stringify(this.actual)} to be a number`,
      );
    }
    const passed = (this.actual as number) > expected;
    this.ctx.recordAssertion({
      passed,
      message: `${this.actual} to be greater than ${expected}`,
      actual: this.actual,
      expected,
    });
    if (!passed) {
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
      this.ctx.recordAssertion({
        passed: false,
        message: `${this.stringify(this.actual)} to be a number`,
        actual: this.actual,
      });
      throw new Error(
        `Expected ${this.stringify(this.actual)} to be a number`,
      );
    }
    const passed = (this.actual as number) < expected;
    this.ctx.recordAssertion({
      passed,
      message: `${this.actual} to be less than ${expected}`,
      actual: this.actual,
      expected,
    });
    if (!passed) {
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
      this.ctx.recordAssertion({
        passed: false,
        message: `${this.stringify(this.actual)} to be a number`,
        actual: this.actual,
      });
      throw new Error(
        `Expected ${this.stringify(this.actual)} to be a number`,
      );
    }
    const passed = (this.actual as number) <= expected;
    this.ctx.recordAssertion({
      passed,
      message: `${this.actual} to be less than or equal to ${expected}`,
      actual: this.actual,
      expected,
    });
    if (!passed) {
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
      this.ctx.recordAssertion({
        passed: false,
        message: `${this.stringify(this.actual)} to be a number`,
        actual: this.actual,
      });
      throw new Error(
        `Expected ${this.stringify(this.actual)} to be a number`,
      );
    }
    const passed = (this.actual as number) >= expected;
    this.ctx.recordAssertion({
      passed,
      message: `${this.actual} to be greater than or equal to ${expected}`,
      actual: this.actual,
      expected,
    });
    if (!passed) {
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
      this.ctx.recordAssertion({
        passed: false,
        message: `${this.stringify(this.actual)} to be a string`,
        actual: this.actual,
      });
      throw new Error(
        `Expected ${this.stringify(this.actual)} to be a string`,
      );
    }
    const passed = (this.actual as string).includes(substring);
    this.ctx.recordAssertion({
      passed,
      message: `"${this.actual}" to contain "${substring}"`,
      actual: this.actual,
      expected: substring,
    });
    if (!passed) {
      throw new Error(
        `Expected "${this.actual}" to contain "${substring}"`,
      );
    }
  }

  /**
   * Assert string matches a regular expression
   */
  toMatch(pattern: RegExp | string): void {
    if (typeof this.actual !== "string") {
      this.ctx.recordAssertion({
        passed: false,
        message: `${this.stringify(this.actual)} to be a string`,
        actual: this.actual,
      });
      throw new Error(
        `Expected ${this.stringify(this.actual)} to be a string`,
      );
    }
    const regex = typeof pattern === "string" ? new RegExp(pattern) : pattern;
    const passed = regex.test(this.actual as string);
    this.ctx.recordAssertion({
      passed,
      message: `"${this.actual}" to match ${regex}`,
      actual: this.actual,
      expected: regex.toString(),
    });
    if (!passed) {
      throw new Error(
        `Expected "${this.actual}" to match ${regex}`,
      );
    }
  }

  private stringify(value: unknown): string {
    if (value === null) return "null";
    if (value === undefined) return "undefined";
    
    // Handle HTMLElement instances specially
    if (value instanceof Element) {
      const parts: string[] = [];
      parts.push(value.tagName.toLowerCase());
      
      // Add attributes in a readable format
      const attrs: string[] = [];
      if (value.id) {
        attrs.push(`id="${value.id}"`);
      }
      if (value.className && typeof value.className === "string" && value.className.trim()) {
        const classes = value.className.trim().split(/\s+/).filter(Boolean);
        if (classes.length > 0) {
          attrs.push(`class="${classes.join(" ")}"`);
        }
      }
      
      // Build the element representation
      let result = `<${parts.join("")}`;
      if (attrs.length > 0) {
        result += ` ${attrs.join(" ")}`;
      }
      result += ">";
      
      // Add text content preview if it's short and meaningful
      const textContent = value.textContent?.trim();
      if (textContent && textContent.length > 0 && textContent.length < 50 && !value.querySelector("*")) {
        // Only show text content if element has no child elements
        result += ` "${textContent}"`;
      }
      
      return result;
    }
    
    // Handle NodeList and other array-like objects
    if (value instanceof NodeList || (Array.isArray(value) && value.length > 0 && value[0] instanceof Element)) {
      const arr = Array.from(value as NodeList | Element[]);
      if (arr.length === 0) return "[]";
      if (arr.length === 1) return this.stringify(arr[0]);
      return `[${arr.length} elements]`;
    }
    
    // Handle plain objects and arrays
    try {
      return JSON.stringify(value, null, 0);
    } catch {
      // For objects that can't be stringified, try to show type info
      if (typeof value === "object" && value !== null) {
        const constructorName = value.constructor?.name || "Object";
        return `[${constructorName}]`;
      }
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
