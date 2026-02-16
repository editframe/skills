import { receiveUploadChunk } from "~/receiveUploadChunk";
import { authMiddleware } from "~/middleware/auth";
import { identityContext } from "~/middleware/context";

import type { Route } from "./+types/receiveUploadChunk";

export const middleware: Route.MiddlewareFunction[] = [authMiddleware];

export const action = async ({ request, params, context }: Route.ActionArgs) => {
  const session = context.get(identityContext);
  return await receiveUploadChunk(
    request,
    params.uploadType ?? "",
    params.id ?? "",
    session,
  );
};
