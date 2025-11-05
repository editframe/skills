import opentelemetry, { SpanStatusCode } from "@opentelemetry/api";
import { logger } from "@/logging";
import { WorkController, type WorkSlice } from "./WorkController";
import { PermanentFailure, type OrgId, type WorkSystem } from "./WorkSystem";
import { inspect } from "node:util";
export interface HTTPWorkSlice extends WorkSlice {
  url: string;
  method: string;
  headers: HeadersInit;
  body?: BodyInit;
}

interface HTTPWorkSliceControllerOptions {
  system: WorkSystem;
  orgId: OrgId;
  id: string;
  slices: HTTPWorkSlice[];
  failureLimit: number;
}
export class HTTPWorkSliceController extends WorkController<HTTPWorkSlice> {
  constructor(options: HTTPWorkSliceControllerOptions) {
    super({
      ...options,
      executeSlice: async (slice, _attemptNumber, abortSignal) => {
        const tracer = opentelemetry.trace.getTracer("default");
        const span = tracer.startSpan("HTTPWorkSliceController.executeSlice");
        span.setAttributes({
          slice: inspect(slice),
        });
        logger.info(slice, "Executing slice");
        // Try/catch is not needed here because WorkController wraps the execution
        // and detects permanent failures.
        // If we need to add extra logic to detect permenant failures, we can
        // override the `isPermanentFailure` method in this class.
        const response = await fetch(slice.url, {
          method: slice.method,
          headers: slice.headers,
          body: slice.body,
          signal: abortSignal,
        });
        logger.info(
          {
            url: slice.url,
            status: response.status,
            statusText: response.statusText,
          },
          "Response",
        );
        switch (true) {
          case response.status >= 200 && response.status < 300: {
            span.setStatus({
              code: SpanStatusCode.OK,
              message: "Slice completed",
            });
            span.end();
            return response.json();
          }
          case response.status === 404: {
            span.setStatus({
              code: SpanStatusCode.ERROR,
              message: "Not found",
            });
            span.end();
            throw new PermanentFailure("Not found");
          }
          case response.status === 429: {
            // Allow retry for rate limiting
            span.setStatus({
              code: SpanStatusCode.ERROR,
              message: "Too many requests, retry after some time",
            });
            span.end();
            throw new Error("Too many requests, retry after some time");
          }
          case response.status >= 400 && response.status < 500: {
            span.setStatus({
              code: SpanStatusCode.ERROR,
              message: `Client error: ${response.status} ${response.statusText}`,
            });
            span.end();
            throw new PermanentFailure(
              `Client error: ${response.status} ${response.statusText}`,
            );
          }
          case response.status >= 500: {
            // Allow retry for server errors
            span.setStatus({
              code: SpanStatusCode.ERROR,
              message: `Server error: ${response.status} ${response.statusText}`,
            });
            span.end();
            throw new Error(
              `Server error: ${response.status} ${response.statusText}`,
            );
          }
          default: {
            span.setStatus({
              code: SpanStatusCode.ERROR,
              message: `Unknown HTTP error! status: ${response.status}`,
            });
            span.end();
            throw new PermanentFailure(
              `Unknown HTTP error! status: ${response.status}`,
            );
          }
        }
      },
    });
  }
}
