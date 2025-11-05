import type { LoaderFunction, LoaderFunctionArgs } from "react-router";
import { type APISessionInfo, parseRequestSession } from "./session";
import { data } from "react-router";

export type LoaderFunctionArgsWithAPISession = LoaderFunctionArgs & {
    session: APISessionInfo;
};

export type LoaderWithAPISession = (
    args: LoaderFunctionArgsWithAPISession,
) => ReturnType<LoaderFunction>;

export function requirePaidPlan<LoaderType extends LoaderWithAPISession>(
    loader: LoaderType,
) {
    return async (args: LoaderFunctionArgs) => {
        const session = await parseRequestSession(args.request);

        if (session?.type !== "api") {
            return data({ message: "Invalid or expired API token" }, { status: 401 });
        }
        if (session.is_paid === false) {
            return data({ message: "This feature requires a paid plan" }, { status: 402 });
        }
        return loader({ ...args, session }) as ReturnType<LoaderType>;
    };
}
