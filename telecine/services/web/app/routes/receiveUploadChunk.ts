import { receiveUploadChunk } from "~/receiveUploadChunk";
import { requireSession } from "@/util/requireSession.server";

import type { Route } from "./+types/receiveUploadChunk";

export const action = async ({ request, params }: Route.ActionArgs) => {
  await requireSession(request);
  return await receiveUploadChunk(
    request,
    params.uploadType ?? "",
    params.id ?? "",
  );
};
