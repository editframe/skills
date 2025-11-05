import { test, describe, expect } from "vitest";
import { memoize } from "./memoize.js";

describe("Memoize Error Scenarios", () => {
  describe("basic memoization behavior", () => {
    test("handles simple getter memoization", () => {
      class TestClass {
        callCount = 0;

        @memoize
        get expensiveValue() {
          this.callCount++;
          return Math.random();
        }
      }

      const instance = new TestClass();

      const value1 = instance.expensiveValue;
      const value2 = instance.expensiveValue;

      expect(value1).toBe(value2);
      expect(instance.callCount).toBe(1);
    });

    test("memoization is instance-specific", () => {
      class TestClass {
        callCount = 0;

        @memoize
        get instanceValue() {
          this.callCount++;
          return Math.random();
        }
      }

      const instance1 = new TestClass();
      const instance2 = new TestClass();

      const value1 = instance1.instanceValue;
      const value2 = instance2.instanceValue;

      expect(value1).not.toBe(value2);
      expect(instance1.callCount).toBe(1);
      expect(instance2.callCount).toBe(1);
    });
  });

  describe("edge cases with object lifecycle", () => {
    test("handles object destruction and garbage collection simulation", () => {
      class TestClass {
        callCount = 0;

        @memoize
        get value() {
          this.callCount++;
          return { data: "test" };
        }
      }

      let instance: TestClass | null = new TestClass();
      const firstValue = instance.value;

      // Simulate object becoming eligible for GC
      instance = null;

      // Create new instance with same structure
      const newInstance = new TestClass();
      const newValue = newInstance.value;

      expect(newValue).not.toBe(firstValue);
      expect(newInstance.callCount).toBe(1);
    });

    test("handles multiple instances with rapid creation/destruction", () => {
      class TestClass {
        id: number;
        callCount = 0;

        constructor(id: number) {
          this.id = id;
        }

        @memoize
        get value() {
          this.callCount++;
          return `value-${this.id}`;
        }
      }

      const instances: TestClass[] = [];
      const values: string[] = [];

      // Create many instances rapidly
      for (let i = 0; i < 100; i++) {
        const instance = new TestClass(i);
        instances.push(instance);
        values.push(instance.value);
      }

      // Verify each instance computed its value once
      instances.forEach((instance, index) => {
        expect(instance.callCount).toBe(1);
        expect(instance.value).toBe(`value-${index}`);
        expect(instance.value).toBe(values[index]);
      });
    });
  });

  describe("error handling in getter functions", () => {
    test("handles getter that throws error", () => {
      class TestClass {
        shouldThrow = true;
        callCount = 0;

        @memoize
        get errorProneValue() {
          this.callCount++;
          if (this.shouldThrow) {
            throw new Error("Getter error");
          }
          return "success";
        }
      }

      const instance = new TestClass();

      // First call should throw
      expect(() => instance.errorProneValue).toThrow("Getter error");
      expect(instance.callCount).toBe(1);

      // Second call should also throw (and call getter again)
      expect(() => instance.errorProneValue).toThrow("Getter error");
      expect(instance.callCount).toBe(2);

      // Change state and try again
      instance.shouldThrow = false;
      const value = instance.errorProneValue;
      expect(value).toBe("success");
      expect(instance.callCount).toBe(3);

      // Should now be memoized
      const value2 = instance.errorProneValue;
      expect(value2).toBe("success");
      expect(instance.callCount).toBe(3);
    });

    test("handles getter that returns undefined", () => {
      class TestClass {
        callCount = 0;

        @memoize
        get undefinedValue() {
          this.callCount++;
          return undefined;
        }
      }

      const instance = new TestClass();

      const value1 = instance.undefinedValue;
      const value2 = instance.undefinedValue;

      expect(value1).toBeUndefined();
      expect(value2).toBeUndefined();
      expect(instance.callCount).toBe(1);
    });

    test("handles getter that returns null", () => {
      class TestClass {
        callCount = 0;

        @memoize
        get nullValue() {
          this.callCount++;
          return null;
        }
      }

      const instance = new TestClass();

      const value1 = instance.nullValue;
      const value2 = instance.nullValue;

      expect(value1).toBeNull();
      expect(value2).toBeNull();
      expect(instance.callCount).toBe(1);
    });

    test("handles getter that returns falsy values", () => {
      class TestClass {
        callCount = 0;

        @memoize
        get falsyValue() {
          this.callCount++;
          return 0;
        }

        @memoize
        get emptyString() {
          this.callCount++;
          return "";
        }

        @memoize
        get falseValue() {
          this.callCount++;
          return false;
        }
      }

      const instance = new TestClass();

      // Test 0
      expect(instance.falsyValue).toBe(0);
      expect(instance.falsyValue).toBe(0);

      // Test empty string
      expect(instance.emptyString).toBe("");
      expect(instance.emptyString).toBe("");

      // Test false
      expect(instance.falseValue).toBe(false);
      expect(instance.falseValue).toBe(false);

      expect(instance.callCount).toBe(3);
    });
  });

  describe("complex object scenarios", () => {
    test("handles inheritance hierarchies", () => {
      class BaseClass {
        baseCallCount = 0;

        @memoize
        get baseValue() {
          this.baseCallCount++;
          return "base";
        }
      }

      class DerivedClass extends BaseClass {
        derivedCallCount = 0;

        @memoize
        get derivedValue() {
          this.derivedCallCount++;
          return "derived";
        }

        @memoize
        get overriddenValue() {
          this.derivedCallCount++;
          return `derived-${this.baseValue}`;
        }
      }

      const instance = new DerivedClass();

      const base1 = instance.baseValue;
      const base2 = instance.baseValue;
      expect(base1).toBe(base2);
      expect(instance.baseCallCount).toBe(1);

      const derived1 = instance.derivedValue;
      const derived2 = instance.derivedValue;
      expect(derived1).toBe(derived2);

      const overridden1 = instance.overriddenValue;
      const overridden2 = instance.overriddenValue;
      expect(overridden1).toBe(overridden2);
      expect(overridden1).toBe("derived-base");
      expect(instance.derivedCallCount).toBe(2); // derivedValue + overriddenValue
    });

    test("handles object property modification", () => {
      class TestClass {
        multiplier = 1;
        callCount = 0;

        @memoize
        get calculatedValue() {
          this.callCount++;
          return 42 * this.multiplier;
        }
      }

      const instance = new TestClass();

      const value1 = instance.calculatedValue;
      expect(value1).toBe(42);
      expect(instance.callCount).toBe(1);

      // Modify property (memoized value should not change)
      instance.multiplier = 2;
      const value2 = instance.calculatedValue;
      expect(value2).toBe(42); // Still memoized
      expect(instance.callCount).toBe(1);
    });

    test("handles circular references in returned objects", () => {
      class TestClass {
        callCount = 0;

        @memoize
        get circularObject() {
          this.callCount++;
          const obj: any = { self: null };
          obj.self = obj;
          return obj;
        }
      }

      const instance = new TestClass();

      const obj1 = instance.circularObject;
      const obj2 = instance.circularObject;

      expect(obj1).toBe(obj2);
      expect(obj1.self).toBe(obj1);
      expect(instance.callCount).toBe(1);
    });
  });

  describe("memory-related edge cases", () => {
    test("handles many memoized properties on single object", () => {
      class TestClass {
        callCounts: { [key: string]: number } = {};

        private createGetter(name: string) {
          return () => {
            this.callCounts[name] = (this.callCounts[name] || 0) + 1;
            return `value-${name}`;
          };
        }

        @memoize
        get prop1() { return this.createGetter('prop1')(); }

        @memoize
        get prop2() { return this.createGetter('prop2')(); }

        @memoize
        get prop3() { return this.createGetter('prop3')(); }

        @memoize
        get prop4() { return this.createGetter('prop4')(); }

        @memoize
        get prop5() { return this.createGetter('prop5')(); }
      }

      const instance = new TestClass();

      // Access all properties multiple times
      for (let i = 0; i < 3; i++) {
        expect(instance.prop1).toBe("value-prop1");
        expect(instance.prop2).toBe("value-prop2");
        expect(instance.prop3).toBe("value-prop3");
        expect(instance.prop4).toBe("value-prop4");
        expect(instance.prop5).toBe("value-prop5");
      }

      // Each should have been called only once
      expect(instance.callCounts).toEqual({
        prop1: 1,
        prop2: 1,
        prop3: 1,
        prop4: 1,
        prop5: 1,
      });
    });

    test("handles object with large memoized values", () => {
      class TestClass {
        callCount = 0;

        @memoize
        get largeObject() {
          this.callCount++;
          const large: any = {};
          for (let i = 0; i < 10000; i++) {
            large[`prop${i}`] = `value${i}`;
          }
          return large;
        }
      }

      const instance = new TestClass();

      const large1 = instance.largeObject;
      const large2 = instance.largeObject;

      expect(large1).toBe(large2);
      expect(Object.keys(large1)).toHaveLength(10000);
      expect(instance.callCount).toBe(1);
    });
  });

  describe("decorator edge cases", () => {
    test("handles descriptor without getter", () => {
      class TestClass {
        @memoize
        set setter(value: any) {
          // This should not break the decorator
        }

        @memoize
        regularMethod() {
          return "not a getter";
        }
      }

      const instance = new TestClass();

      // These should not throw errors
      instance.setter = "test";
      expect(typeof instance.regularMethod).toBe("function");
    });

    test("handles multiple decorators on same class", () => {
      function logCalls<T extends object, K extends keyof T>(
        target: T,
        propertyKey: K,
        descriptor: TypedPropertyDescriptor<T[K]>
      ) {
        const originalGet = descriptor.get;
        if (originalGet) {
          descriptor.get = function () {
            console.log(`Getting ${String(propertyKey)}`);
            return originalGet.call(this);
          };
        }
        return descriptor;
      }

      class TestClass {
        callCount = 0;

        @memoize
        @logCalls
        get decoratedValue() {
          this.callCount++;
          return "decorated";
        }
      }

      const instance = new TestClass();

      const value1 = instance.decoratedValue;
      const value2 = instance.decoratedValue;

      expect(value1).toBe("decorated");
      expect(value2).toBe("decorated");
      expect(instance.callCount).toBe(1);
    });
  });
}); 