import { requireNoSession } from "@/util/requireSession.server";
import { createEmailPasswordSessionCookie } from "@/util/session";
import { redirect } from "react-router";
import type { MetaFunction } from "react-router";
import { ErrorMessage } from "~/components/ErrorMessage";
import { getUserEmailAndPasswordByMagicToken } from "~/loginUserWithMagicLink";

import type { Route } from "./+types/claim-magic-link";

export const loader = async ({ request, params }: Route.LoaderArgs) => {
  await requireNoSession(request);
  if (!params.token) {
    return null;
  }
  try {
    const sessionInfo = await getUserEmailAndPasswordByMagicToken(
      params.token,
    );
    return redirect("/welcome", {
      headers: {
        "Set-Cookie": await createEmailPasswordSessionCookie(sessionInfo),
      },
    });
  } catch (e) {
    return { error: e };
  }
};
export const meta: MetaFunction = () => {
  return [{ title: "Login with magic link | Editframe" }];
};
export default function Welcome() {
  return (
    <div className="flex min-h-full flex-1 flex-col justify-center px-6 py-12 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        <span className="sr-only"> Editframe</span>
        <svg className="mx-auto my-4 h-9 w-9 md:my-0" viewBox="0 0 512 512">
          <path
            d="M144 48v272a48 48 0 0048 48h272"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="32"
          />
          <path
            d="M368 304V192a48
                 48 0 00-48-48H208M368 368v96M144 144H48"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="32"
          />
        </svg>
        <h2 className="mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
          Login with magic link
        </h2>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
        <ErrorMessage
          message="Invalid magic link token"
          note="Check your magic link in your email and try again."
        />
      </div>
    </div>
  );
}
