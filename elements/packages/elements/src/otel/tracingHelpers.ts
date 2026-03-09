import { type Context, context, propagation, type Span, trace } from "@opentelemetry/api";

export type TraceContext = Record<string, string>;

/**
 * Global flag to enable/disable tracing.
 * When false, all tracing functions become no-ops for zero overhead.
 */
let tracingEnabled = false;

/**
 * Enable tracing globally. Call this during initialization if tracing is requested.
 */
export function enableTracing(): void {
  tracingEnabled = true;
}

/**
 * Check if tracing is currently enabled.
 */
export function isTracingEnabled(): boolean {
  return tracingEnabled;
}

/**
 * Frame-local span storage for rendering.
 * Since rendering is single-threaded and sequential (one frame at a time),
 * we store the active frame span directly and use it as parent for orphaned spans.
 */
let currentFrameSpan: Span | undefined;

/**
 * Set the current frame's span. Call this when starting a frame render.
 * All spans created during this frame will use this as parent if
 * Zone.js doesn't provide one via context.active()
 */
export function setCurrentFrameSpan(span: Span): void {
  currentFrameSpan = span;
}

/**
 * Clear the current frame span. Call this when a frame completes.
 */
export function clearCurrentFrameSpan(): void {
  currentFrameSpan = undefined;
}

export function extractParentContext(traceContext?: TraceContext): Context {
  if (!traceContext) {
    return context.active();
  }

  try {
    return propagation.extract(context.active(), traceContext);
  } catch (_error) {
    return context.active();
  }
}

/**
 * Get the active span's context to pass to child operations
 * Use this when calling functions that create child spans
 */
export function getActiveContext(): Context {
  return context.active();
}

/**
 * Wrapper that passes span context explicitly to the function
 * Use this for operations that need to store or propagate context across boundaries
 */
export async function withSpanAndContext<T>(
  name: string,
  attributes: Record<string, string | number | boolean> | undefined,
  parentContext: Context | undefined,
  fn: (span: Span, activeContext: Context) => Promise<T>,
): Promise<T> {
  // No-op if tracing is disabled
  if (!tracingEnabled) {
    // Create a minimal no-op span for compatibility
    const noopSpan = trace.getTracer("telecine-browser").startSpan(name);
    const ctx = parentContext || context.active();
    const result = await fn(noopSpan, ctx);
    noopSpan.end();
    return result;
  }

  const tracer = trace.getTracer("telecine-browser");

  // Same context resolution as withSpan
  let ctx: Context;

  if (parentContext) {
    ctx = parentContext;
  } else {
    const activeContext = context.active();
    const activeSpan = trace.getSpan(activeContext);

    if (activeSpan?.isRecording?.()) {
      ctx = activeContext;
    } else if (currentFrameSpan) {
      ctx = trace.setSpan(context.active(), currentFrameSpan);
    } else {
      ctx = activeContext;
    }
  }

  const span = tracer.startSpan(
    name,
    {
      attributes,
    },
    ctx,
  );

  // Create context with this span as active
  const spanContext = trace.setSpan(ctx, span);

  try {
    // Pass the spanContext explicitly to the function
    const result = await context.with(spanContext, async () => {
      return fn(span, spanContext);
    });
    span.end();
    return result;
  } catch (error) {
    span.recordException(error as Error);
    span.end();
    throw error;
  }
}

export function createSpan(
  name: string,
  attributes?: Record<string, string | number | boolean>,
  parentContext?: Context,
): Span {
  const tracer = trace.getTracer("telecine-browser");
  const ctx = parentContext || context.active();

  return context.with(ctx, () => {
    const span = tracer.startSpan(name);

    if (attributes) {
      span.setAttributes(attributes);
    }

    return span;
  });
}

export async function withSpan<T>(
  name: string,
  attributes: Record<string, string | number | boolean> | undefined,
  parentContext: Context | undefined,
  fn: (span: Span) => Promise<T>,
): Promise<T> {
  // No-op if tracing is disabled
  if (!tracingEnabled) {
    // Create a minimal no-op span for compatibility
    const noopSpan = trace.getTracer("telecine-browser").startSpan(name);
    const result = await fn(noopSpan);
    noopSpan.end();
    return result;
  }

  const tracer = trace.getTracer("telecine-browser");

  // Context resolution priority:
  // 1. Explicit parentContext (if provided)
  // 2. context.active() from Zone.js (if it has a valid span)
  // 3. Create context from currentFrameSpan (fallback for Lit Task boundaries)
  let ctx: Context;

  if (parentContext) {
    ctx = parentContext;
  } else {
    const activeContext = context.active();
    const activeSpan = trace.getSpan(activeContext);

    // Try to use context.active() if it has a real span
    if (activeSpan?.isRecording?.()) {
      ctx = activeContext;
    } else if (currentFrameSpan) {
      // Create context from the stored frame span
      ctx = trace.setSpan(context.active(), currentFrameSpan);
    } else {
      ctx = activeContext;
    }
  }

  // Start span with explicit parent
  const span = tracer.startSpan(
    name,
    {
      attributes,
    },
    ctx,
  );

  // Create context with this span as active
  const spanContext = trace.setSpan(ctx, span);

  try {
    // Execute function with span context
    const result = await context.with(spanContext, async () => {
      return fn(span);
    });
    span.end();
    return result;
  } catch (error) {
    span.recordException(error as Error);
    span.end();
    throw error;
  }
}

export function withSpanSync<T>(
  name: string,
  attributes: Record<string, string | number | boolean> | undefined,
  parentContext: Context | undefined,
  fn: (span: Span) => T,
): T {
  // No-op if tracing is disabled
  if (!tracingEnabled) {
    // Create a minimal no-op span for compatibility
    const noopSpan = trace.getTracer("telecine-browser").startSpan(name);
    const result = fn(noopSpan);
    noopSpan.end();
    return result;
  }

  const span = createSpan(name, attributes, parentContext);
  const ctx = parentContext || context.active();

  try {
    const result = context.with(trace.setSpan(ctx, span), () => fn(span));
    span.end();
    return result;
  } catch (error) {
    span.recordException(error as Error);
    span.end();
    throw error;
  }
}
