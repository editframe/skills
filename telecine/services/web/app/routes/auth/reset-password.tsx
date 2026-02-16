import { data } from "react-router";
import z from "zod";
import { formFor } from "~/formFor";
import { resetPasswordUserWithPassword } from "~/resetPasswordWithEmail.server";
import type { MetaFunction } from "react-router";
import { commitSession } from "@/util/session";
import { logger } from "@/logging";
import { noAuthMiddleware } from "~/middleware/auth";
import { sessionCookieContext } from "~/middleware/context";

import type { Route } from "./+types/reset-password";

const schema = z.object({
  email_address: z.string().email().toLowerCase(),
});

const resetPassword = formFor(schema);

export const middleware: Route.MiddlewareFunction[] = [noAuthMiddleware];

export const action = async ({ request, context }: Route.ActionArgs) => {
  const formResult = await resetPassword.parseFormData(request);
  if (!formResult.success) {
    return data(formResult.errors, { status: 400 });
  }

  const sessionCookie = context.get(sessionCookieContext);

  try {
    await resetPasswordUserWithPassword(formResult.data.email_address);
  } catch (error) {
    logger.error(error, "Error resetting password (suppressed to user)");
  }

  sessionCookie.flash(
    "success",
    "If an account with that email exists, we've sent you an email with instructions to reset your password.",
  );

  return data(
    { success: true },
    {
      headers: {
        "Set-Cookie": await commitSession(sessionCookie),
      },
    },
  );
};

export const loader = async ({ context }: Route.LoaderArgs) => {
  const sessionCookie = context.get(sessionCookieContext);
  const successMessage = sessionCookie.get("success");
  return data(
    { successMessage: successMessage || null },
    {
      headers: {
        "Set-Cookie": await commitSession(sessionCookie),
      },
    },
  );
};

export const meta: MetaFunction = () => {
  return [{ title: "Reset Password | Editframe" }];
};
export default function ResetPassword() {
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
          Reset your password
        </h2>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
        <resetPassword.FormErrors />
        <resetPassword.Form className="mt-8 space-y-6" method="POST">
          <div>
            <p>
              <resetPassword.FieldError field="email_address" />
            </p>
            <resetPassword.Field label="Email address" />
            <div className="mt-2">
              <resetPassword.Input
                field="email_address"
                type="email"
                placeholder="Enter your email"
                name="email_address"
                required
                aria-label="Email address"
              />
            </div>
          </div>

          <div>
            <resetPassword.Submit>Reset Password</resetPassword.Submit>
          </div>
        </resetPassword.Form>
      </div>
    </div>
  );
}
