import { writeFile } from "node:fs/promises";
import { inspect } from "node:util";

import opentelemetry, { SpanStatusCode } from "@opentelemetry/api";
import { program } from "commander";

import { logger } from "@/logging";
import { ElectronEngine } from "@/render/engines/ElectronEngine/ElectronEngine";
import "@/electron-exec/instrumentation";

import { ExtractionInfo } from "./RenderInfoExtractor";
import { createOrgSession } from "./createOrgSession";

program.option("--extraction-info <info>", "Extraction info");
program.option("--output-path <path>", "Output path");

const OTEL_SPAN_ID = process.env.OTEL_SPAN_ID;
const OTEL_TRACE_ID = process.env.OTEL_TRACE_ID;
const OTEL_TRACE_FLAGS = process.env.OTEL_TRACE_FLAGS
  ? Number.parseInt(process.env.OTEL_TRACE_FLAGS, 10)
  : undefined;

program.action(async (options) => {
  const tracer = opentelemetry.trace.getTracer("getRenderInfo");
  return await tracer.startActiveSpan(
    "getRenderInfo",
    {
      links:
        OTEL_TRACE_ID && OTEL_SPAN_ID
          ? [
              {
                context: {
                  traceId: OTEL_TRACE_ID,
                  spanId: OTEL_SPAN_ID,
                  traceFlags: OTEL_TRACE_FLAGS ?? 1,
                },
              },
            ]
          : undefined,
    },
    async (span) => {
      let EXIT_CODE = 0;
      try {
        span.setAttributes({
          extractionInfo: options.extractionInfo,
          outputPath: options.outputPath,
        });

        logger.info("Starting getRenderInfo");
        const { electronApp } =
          await import("@/electron-exec/electronReExport");
        const extractionInfo = ExtractionInfo.parse(
          JSON.parse(options.extractionInfo),
        );

        try {
          await electronApp.whenReady();
          await createOrgSession(extractionInfo.orgId);
        } catch (error) {
          logger.error(error, "Error creating electron app");
          EXIT_CODE = 1;
          return;
        }

        const [engineError, engine] = await ElectronEngine.create({
          orgId: extractionInfo.orgId,
          width: 1000,
          height: 1000,
          location: extractionInfo.rendererPath,
        });

        if (engineError) {
          logger.error(engineError, "Error creating engine");
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: inspect(engineError),
          });

          EXIT_CODE = 1;
          return;
        }

        const renderInfo = await engine.getRenderInfo();
        span.setAttributes({
          renderInfo: inspect(renderInfo),
        });

        await writeFile(options.outputPath, JSON.stringify(renderInfo));
        logger.info(
          { outputPath: options.outputPath },
          "Render info written to path",
        );
        span.setStatus({
          code: SpanStatusCode.OK,
          message: "Render info written",
        });
      } catch (error) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: inspect(error),
        });
        EXIT_CODE = 1;
      } finally {
        logger.info(`getRenderInfo: exit(${EXIT_CODE})`);
        span.end();
        process.exit(EXIT_CODE);
      }
    },
  );
});

program.parse(process.argv);
