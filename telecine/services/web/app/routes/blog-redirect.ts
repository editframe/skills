import { redirect } from "react-router";
import type { Route } from "./+types/blog-redirect";

export const loader = async (_args: Route.LoaderArgs) => {
  return redirect("/", { status: 301 });
};

