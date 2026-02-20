import { maybeIdentityContext } from "~/middleware/context";
import type { Route } from "./+types/status";

export const loader = ({ context }: Route.LoaderArgs) => {
  const session = context.get(maybeIdentityContext);
  return Response.json({ isLoggedIn: !!session });
};
