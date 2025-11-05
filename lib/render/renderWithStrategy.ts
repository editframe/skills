import { z } from "zod";

import * as ElectronEngine from "@/render/engines/ElectronEngine/SubProcessRenderer";

export const RenderInfo = z.object({
  work_slice_ms: z.number(),
  duration_ms: z.number(),
  fps: z.number(),
  org_id: z.string(),
  user_id: z.string(),
  height: z.number(),
  width: z.number(),
  id: z.string(),
  segment: z.union([z.literal("init"), z.number()]),
  // email: z.string(),
  fragmentPath: z.string(),
  outputPath: z.string(),
  rendererPath: z.string(),
  showFrameBox: z.boolean().optional(),
  strategy: z.enum(["v1"]),
});

export type RenderInfo = z.infer<typeof RenderInfo>;

interface RenderInterface {
  whenCompleted: Promise<void>;
  ensureShutdown(): void;
}

export const renderWithStrategy = (
  renderInfo: RenderInfo,
): Promise<RenderInterface> => {
  switch (renderInfo.strategy) {
    case "v1":
      return ElectronEngine.SubProcessRenderer.create(renderInfo);
    default:
      throw new Error(`Unsupported strategy ${renderInfo.strategy}`);
  }
};
