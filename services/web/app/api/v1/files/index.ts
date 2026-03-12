import type { Route } from "./+types/index";

export const action = async ({ request }: Route.ActionArgs) => {
  throw new Response("Not implemented", { status: 501 });
};
