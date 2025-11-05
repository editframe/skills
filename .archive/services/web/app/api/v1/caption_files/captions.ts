import { db } from "@/sql-client.server";
import { appFunction } from "@/util/appFunction.server";

export const loader = appFunction(
  { requireCookieOrTokenSession: true },
  async ({ session }) => {
    const assets = await db
      .selectFrom("video2.caption_files")
      .where("org_id", "=", session.oid)
      .select(["id", "filename", "byte_size"])
      .execute();

    return { assets };
  },
);

export const action = async () => {
  throw new Response("Method Not Allowed", { status: 405 });
};
