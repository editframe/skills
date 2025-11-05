import { program } from "commander";
import { createWriteStream } from "node:fs";

import { createVideoRenderOptionsForSegment } from "@/render/createRenderOptionsForSegment";
import { createOrgSession } from "@/render/createOrgSession";
import { SegmentEncoder } from "../../SegmentEncoder.server";
import { RenderInfo } from "../../renderWithStrategy";
import { ElectronEngine } from "./ElectronEngine";

program
  .option("--render-info <info>", "Render info")
  .action(async (options) => {
    console.log("Starting exec-render");
    const { electronApp } = await import("@/electron-exec/electronReExport");

    const renderInfo = RenderInfo.parse(JSON.parse(options.renderInfo));
    const session = { oid: renderInfo.org_id };

    const abortController = new AbortController();

    const renderOptions = createVideoRenderOptionsForSegment({
      segmentDurationMs: renderInfo.work_slice_ms,
      segmentIndex: renderInfo.segment,
      width: renderInfo.width,
      height: renderInfo.height,
      durationMs: renderInfo.duration_ms,
      fps: renderInfo.fps,
      strategy: renderInfo.strategy,
    });

    renderOptions.showFrameBox = renderInfo.showFrameBox;

    try {
      await electronApp.whenReady();
      await createOrgSession(session);
    } catch (error) {
      console.log("(exec-render) Error creating electron app", error);
      process.exit(1);
    }

    const [engineError, engine] = await ElectronEngine.create({
      width: renderInfo.width,
      height: renderInfo.height,
      location: renderInfo.rendererPath,
    });

    if (engineError) {
      console.log("(exec-render) Error creating engine", engineError);
      process.exit(1);
    }

    const [segmentEncoderError, segmentEncoder] = await SegmentEncoder.create({
      renderId: renderInfo.id,
      renderOptions,
      abortSignal: abortController.signal,
      engine,
    });

    if (segmentEncoderError) {
      console.log(
        "(exec-render) Error creating segment encoder",
        segmentEncoderError,
      );
      process.exit(1);
    }

    const segmentReadStream = segmentEncoder.createFragmentReadStream();

    const ioStream = createWriteStream(renderInfo.outputPath);

    segmentReadStream.pipe(ioStream);

    try {
      await segmentEncoder.whenCompleted;

      await new Promise((resolve, reject) => {
        ioStream.once("error", reject);
        ioStream.once("finish", resolve);
        segmentReadStream.once("error", reject);
      });
      segmentEncoder.teardown();
    } catch (error) {
      console.log("(exec-render) Error rendering segment", error);
      console.trace(error);

      segmentEncoder?.teardown();
      process.exit(1);
    }
  })
  .parse(process.argv);
