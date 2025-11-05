import type { LoaderFunctionArgs } from "react-router";
import { type APISessionInfo, parseRequestSession } from "./session";
import { db } from "@/sql-client.server";
import {
  type TimeInterval,
  convertIntervalToDate,
} from "./convertIntervalToDate";

export const checkRenderQuota = async (
  args: LoaderFunctionArgs,
  {
    threshold,
    timeInterval,
  }: {
    threshold: number;
    timeInterval: TimeInterval;
  },
) => {
  const session = (await parseRequestSession(args.request)) as APISessionInfo;
  const { startDate, endDate } = convertIntervalToDate(timeInterval);
  const renderCount = await db
    .selectFrom("video2.renders")
    .innerJoin(
      "identity.api_keys",
      "identity.api_keys.org_id",
      "video2.renders.org_id",
    )
    .where("identity.api_keys.id", "=", session.cid)
    .where("video2.renders.created_at", ">=", startDate)
    .where("video2.renders.created_at", "<=", endDate)
    .select(db.fn.countAll().as("count"))
    .executeTakeFirst();

  return Number(renderCount) >= threshold;
};
