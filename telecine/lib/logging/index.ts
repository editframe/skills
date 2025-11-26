import { PinoInstrumentation } from "@opentelemetry/instrumentation-pino";
import { trace, context } from "@opentelemetry/api";
import { SeverityNumber, logs } from "@opentelemetry/api-logs";

import pino from "pino";

export const pinoInstrumentation = new PinoInstrumentation();

const isProduction = process.env.NODE_ENV === "production";
const defaultLogLevel = isProduction ? "info" : "debug";

const serviceName = process.env.SERVICE_NAME ?? "unknown-service";

const pinoLevelToSeverity = (
  levelLabel: string | undefined,
): SeverityNumber => {
  switch (levelLabel) {
    case "trace":
      return SeverityNumber.TRACE;
    case "debug":
      return SeverityNumber.DEBUG;
    case "info":
      return SeverityNumber.INFO;
    case "warn":
      return SeverityNumber.WARN;
    case "error":
      return SeverityNumber.ERROR;
    case "fatal":
      return SeverityNumber.FATAL;
    default:
      return SeverityNumber.UNSPECIFIED;
  }
};

const exportToGoogleCloud = process.env.GCLOUD_TRACE_EXPORT === "true";
const useOtelLogs = !exportToGoogleCloud;

const transport = isProduction
  ? undefined
  : {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "SYS:standard",
      },
    };

const isObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

export const logger = pino({
  level: process.env.PINO_LOG_LEVEL || defaultLogLevel,
  name: serviceName,
  redact: ["req.headers.authorization", "hash", "salt", "password"],
  transport,
  hooks: {
    logMethod(args, method, level) {
      if (args.length < 2) {
        args.unshift({});
      }

      const activeSpan = trace.getActiveSpan();

      if (isObject(args[0]) && activeSpan && isProduction) {
        const spanContext = activeSpan.spanContext();
        args[0]["logging.googleapis.com/spanId"] = spanContext.spanId;
        args[0]["logging.googleapis.com/trace"] =
          `projects/editframe/traces/${spanContext.traceId}`;
      }

      if (useOtelLogs) {
        try {
          const otelLogger = logs.getLogger(serviceName);
          const levelLabel = this.levels.labels[level];
          const attributes: Record<string, any> = {
            "service.name": serviceName,
          };

          if (isObject(args[0])) {
            for (const [key, value] of Object.entries(args[0])) {
              attributes[key] = value;
            }
          }

          const logBody =
            typeof args[1] === "string" ? args[1] : JSON.stringify(args[1]);

          otelLogger.emit({
            severityNumber: pinoLevelToSeverity(levelLabel),
            severityText: levelLabel || "UNSPECIFIED",
            body: logBody,
            attributes,
            context: context.active(),
          });
        } catch (e) {
          // Silently fail if OTEL logs aren't set up yet
        }
      }

      return method.apply(this, args);
    },
  },
});

export const makeLogger = () => {
  return logger;
};
