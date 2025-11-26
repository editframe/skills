import {
  type CreateRenderResult,
  CreateRenderPayload,
  OutputConfiguration,
} from "@editframe/api";
import { db } from "@/sql-client.server";
import { downloadRenderURL } from "@/util/apiPaths";
import { requireCookieOrTokenSession } from "@/util/requireSession.server";

import type { Route } from "./+types/index";

export const action = async ({
  request,
}: Route.ActionArgs): Promise<CreateRenderResult> => {
  const { output: output_config, ...payload } = CreateRenderPayload.parse(
    await request.json(),
  );
  const session = await requireCookieOrTokenSession(request);
  const created = await db
    .insertInto("video2.renders")
    .values({
      org_id: session.oid,
      creator_id: session.uid,
      api_key_id: session.cid,
      status: "created",
      fps: 30,
      strategy: "v1",
      ...payload,
      output_config,
      // We shouldn't need to do this because the DB has a default value,
      // but the type generator doesn't understand that works on inserts
      // We want the select type to not include undefined, so this works
      metadata: payload.metadata ?? {},
    })
    .returning(["id", "md5", "status", "metadata"])
    .executeTakeFirstOrThrow();

  return created;
};

export const loader = async ({ request }: Route.LoaderArgs) => {
  const session = await requireCookieOrTokenSession(request);
  const apiKeyId = session.cid;

  const renders = await db
    .selectFrom("video2.renders")
    .where("api_key_id", "=", apiKeyId)
    .select([
      "id",
      "status",
      "created_at",
      "fps",
      "width",
      "height",
      "duration_ms",
      "completed_at",
      "failed_at",
      "html",
      "metadata",
      "output_config",
    ])
    .execute();

  if (!renders) {
    return {
      renders: [],
    };
  }

  return {
    renders: renders.map((render) => {
      const outputConfiguration = OutputConfiguration.parse(
        render.output_config,
      );
      const download_url = render.completed_at
        ? downloadRenderURL(render.id, outputConfiguration)
        : null;
      return {
        ...render,
        download_url,
      };
    }),
  };
};
