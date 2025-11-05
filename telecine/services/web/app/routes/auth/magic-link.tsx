import {
  Link,
  type MetaFunction,
  data,
  useActionData,
  useSearchParams,
} from "react-router";
import z from "zod";

import { requireNoSession } from "@/util/requireSession.server";

import { Button } from "~/components/Button";
import { SuccessMessage } from "~/components/SuccessMessage";
import { formFor } from "~/formFor";
import { loginUserWithMagicLink } from "~/loginUserWithMagicLink";

import type { Route } from "./+types/magic-link";

const schema = z.object({
  email_address: z.string().email().toLowerCase(),
  redirect_to: z.string().optional(),
});

const login = formFor(schema);

export const action = async ({ request }: Route.ActionArgs) => {
  const formResult = await login.parseFormData(request);

  if (!formResult.success) {
    return data(formResult.errors, { status: 400 });
  }

  const loginData = formResult.data;

  const sessionInfo = await loginUserWithMagicLink(loginData.email_address);

  if (!sessionInfo) {
    return data({ formErrors: ["Incorrect email address"] }, { status: 401 });
  }
  return data({
    message: "Magic link sent to your email address.",
    note: "If you don't see the email, please check your spam folder.",
  });
};

export const loader = async ({ request }: Route.LoaderArgs) => {
  await requireNoSession(request);
  return null;
};

export const meta: MetaFunction = () => {
  return [{ title: "Login with magic link | Editframe" }];
};
export default function Welcome() {
  const [searchParams] = useSearchParams();
  const formResponse = useActionData<typeof action>();
  return (
    <div className="flex min-h-full flex-1 flex-col justify-center px-6 py-12 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        <span className="sr-only"> Editframe</span>
        <svg
          className="mx-auto my-4 h-9 w-9 md:my-0"
          viewBox="0 0 512 512"
          height={36}
          width={36}
        >
          <path
            d="M144 48v272a48 48 0 0048 48h272"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="32"
          />
          <path
            d="M368 304V192a48 48 0 00-48-48H208M368 368v96M144 144H48"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="32"
          />
        </svg>
        <h1 className="mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
          Login
        </h1>
        <Link
          to="/auth/login"
          className="mt-4 block text-center text-sm font-semibold leading-6 text-editframe-600 hover:text-editframe-500"
        >
          Login with email and password
        </Link>
      </div>
      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
        {formResponse && "message" in formResponse && (
          <SuccessMessage
            message={formResponse.message}
            note={formResponse.note}
          />
        )}
        <login.Form className="mt-8 space-y-6">
          <div>
            {searchParams.has("redirect_to") && (
              <login.Field>
                <login.Input
                  type="hidden"
                  field="redirect_to"
                  required
                  value={searchParams.get("redirect_to") || ""}
                />
              </login.Field>
            )}
            <login.Field label="Email address" />
            <div className="mt-2">
              <login.Input
                aria-label="Email address"
                field="email_address"
                placeholder="Enter your email"
                name="email_address"
              />
            </div>
          </div>

          <div>
            <Button
              mode="primary"
              aria-label="Send a magic link"
              type="submit"
              className="w-full"
            >
              Send a magic link
            </Button>
          </div>
        </login.Form>

        <p className="mt-10 text-center text-sm text-gray-500">
          Not a member?{" "}
          <Link
            to="/auth/register"
            className="font-semibold leading-6 text-editframe-600 hover:text-editframe-500"
          >
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
