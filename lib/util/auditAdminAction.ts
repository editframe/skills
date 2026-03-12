import { logger } from "@/logging";
import type { SessionInfo } from "./session";

export function auditAdminAction(
  session: SessionInfo,
  action: string,
  meta?: Record<string, unknown>,
) {
  const email = "email" in session ? session.email : "unknown";
  logger.info({ actor: email, action, ...meta }, `admin:${action}`);
}
