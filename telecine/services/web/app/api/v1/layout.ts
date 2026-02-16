import { apiAuthMiddleware } from "~/middleware/api";
import type { Route } from "./+types/layout";

export const middleware: Route.MiddlewareFunction[] = [apiAuthMiddleware];
