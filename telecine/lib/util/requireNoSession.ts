import type { LoaderFunction, LoaderFunctionArgs, Session } from "react-router";
import { redirect } from "react-router";
import { getSession, parseRequestSession } from "./session";

type AugmentedLoaderFunction = LoaderFunction &
  ((args: AugmentedLoaderFunctionArgs) => ReturnType<LoaderFunction>);

type AugmentedLoaderFunctionArgs = LoaderFunctionArgs & {
  sessionCookie: Session;
};

export function requireNoSession(loader?: AugmentedLoaderFunction) {
  return async (args: AugmentedLoaderFunctionArgs) => {
    const session = await parseRequestSession(args.request);
    if (session) {
      return redirect("/welcome");
    }
    if (!loader) {
      return null;
    }
    const sessionCookie = await getSession(
      args.request.headers.get("Cookie") ?? "",
    );
    return loader({ ...args, sessionCookie });
  };
}
