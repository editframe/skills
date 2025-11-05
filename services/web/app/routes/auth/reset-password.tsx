import { data, redirect } from "react-router";
import z from "zod";
import { formFor } from "~/formFor";
import { resetPasswordUserWithPassword } from "~/resetPasswordWithEmail.server";
import type { MetaFunction } from "react-router";
import { commitSession } from "@/util/session";
import { logger } from "@/logging";

import type { Route } from "./+types/reset-password";
import { requireSession } from "@/util/requireSession.server";

const schema = z.object({
  email_address: z.string().email().toLowerCase(),
});

const resetPassword = formFor(schema);

export const action = async ({ request }: Route.ActionArgs) => {
  const { sessionCookie } = await requireSession(request);
  const payload = await request.json();
  try {
    await resetPasswordUserWithPassword(payload.email_address);
    sessionCookie.flash("success", "Password updated successfully");

    return redirect("/settings", {
      headers: {
        "Set-Cookie": await commitSession(sessionCookie),
      },
    });
  } catch (error) {
    logger.error(error, "Error resetting password");
    sessionCookie.flash(
      "error",
      "There was an error updating your password. Please try again.",
    );

    return data(
      { success: false },
      {
        status: 400,
        headers: {
          "Set-Cookie": await commitSession(sessionCookie),
        },
      },
    );
  }
};

export const loader = async ({ request }: Route.LoaderArgs) => {
  await requireSession(request);
  return null;
};

export const meta: MetaFunction = () => {
  return [{ title: "Reset Password | Editframe" }];
};
export default function Welcome() {
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
        <resetPassword.Form className="mt-8 space-y-6" action="#" method="POST">
          <div>
            <p>
              <resetPassword.FieldError field="email_address" />
              <resetPassword.FormErrors />
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
