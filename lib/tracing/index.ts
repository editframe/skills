import { inspect } from "node:util";
import opentelemetry, { SpanStatusCode, type Span } from "@opentelemetry/api";

import { logger } from "@/logging";


export const setDottedObjectAttributes = (span: Span, object: Record<string, any>) => {
  const flattenObject = (obj: any, prefix = ''): Record<string, any> => {
    const flattened: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj)) {
      const newKey = prefix ? `${prefix}.${key}` : key;

      if (Buffer.isBuffer(value)) {
        flattened[newKey] = `Buffer(${value.length})`;
      } else if (Array.isArray(value)) {
        flattened[newKey] = value;
      } else if (value !== null && typeof value === 'object') {
        Object.assign(flattened, flattenObject(value, newKey));
      } else {
        flattened[newKey] = value;
      }
    }

    return flattened;
  };

  const flattenedAttributes = flattenObject(object);
  span.setAttributes(flattenedAttributes);
};

export const executeSpan = async <T>(
  name: string,
  fn: (span: Span) => Promise<T>,
): Promise<T> => {
  const tracer = opentelemetry.trace.getTracer("default");
  return await tracer.startActiveSpan(name, async (span) => {
    try {
      return await fn(span);
    } catch (error) {
      if (error instanceof Error) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error.message,
        });
        span.recordException(error);
      } else {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: inspect(error),
        });
        span.recordException(inspect(error));
      }
      throw error;
    } finally {
      span.end();
    }
  });
};

export function setSpanAttributes(attributes: Record<string, any>) {
  const span = opentelemetry.trace.getActiveSpan();
  if (!span) {
    logger.info(attributes, "No active span found, logging attributes");
    return;
  }
  setDottedObjectAttributes(span, attributes);
}

export const executeSpanSync = <T>(name: string, fn: (span: Span) => T): T => {
  const tracer = opentelemetry.trace.getTracer("default");
  return tracer.startActiveSpan(name, (span) => {
    try {
      return fn(span);
    } finally {
      span.end();
    }
  });
};

export const executeRootSpan = async <T>(
  name: string,
  fn: (span: Span) => Promise<T>,
): Promise<T> => {
  const tracer = opentelemetry.trace.getTracer("default");
  // Create a new context with no active span
  const ctx = opentelemetry.context.active();
  const rootCtx = opentelemetry.trace.deleteSpan(ctx);

  // Start a new span (this will be a root span with no parent)
  const span = tracer.startSpan(name, undefined, rootCtx);

  // Make the span active for the duration of the function
  return await opentelemetry.context.with(
    opentelemetry.trace.setSpan(rootCtx, span),
    async () => {
      try {
        return await fn(span);
      } catch (error) {
        if (error instanceof Error) {
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error.message,
          });
          span.recordException(error);
        } else {
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: inspect(error),
          });
          span.recordException(inspect(error));
        }
        // Re-raise error so it can be handled/ignored by the caller.
        throw error;
      } finally {
        span.end();
      }
    },
  );
};

export function WithSpan(name?: string) {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
      const spanName = name || `${target.constructor.name}.${propertyKey}`;
      return executeSpan(spanName, () => originalMethod.apply(this, args));
    };

    return descriptor;
  };
}

export function WithRootSpan(name?: string) {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
      const spanName = name || `${target.constructor.name}.${propertyKey}`;
      return executeRootSpan(spanName, () => originalMethod.apply(this, args));
    };

    return descriptor;
  };
}

export function WithSyncSpan(name?: string) {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
      const spanName = name || `${target.constructor.name}.${propertyKey}`;
      return executeSpanSync(spanName, () => originalMethod.apply(this, args));
    };
  };
}
