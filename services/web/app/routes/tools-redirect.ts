import { redirect } from "react-router";
import type { Route } from "./+types/tools-redirect";

export const loader = async (_args: Route.LoaderArgs) => {
  return redirect("/", { status: 307 });
};

