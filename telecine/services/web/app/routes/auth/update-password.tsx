import { data, redirect } from "react-router";
import z from "zod";
import { formFor } from "~/formFor";
import { useActionData, useLoaderData, useLocation } from "react-router";
import {
  getUserByResetToken,
  resetPasswordWithToken,
} from "~/resetPasswordWithEmail.server";
import type { MetaFunction } from "react-router";
import { Info } from "@phosphor-icons/react";
import { commitSession } from "@/util/session";
import { ErrorMessage } from "~/components/ErrorMessage";
import { Button } from "~/components/Button";
import { logger } from "@/logging";

import type { Route } from "./+types/update-password";
import { requireNoSession } from "@/util/requireSession.server";

const schema = z.object({
  password: z.string(),
  password_confirmation: z.string(),
  reset_token: z.string(),
});

const updatePassword = formFor(schema);

export const action = async ({ request }: Route.ActionArgs) => {
  const { sessionCookie } = await requireNoSession(request);
  const formResult = await updatePassword.parseFormData(request);

  if (!formResult.success) {
    return data(formResult.errors, { status: 400 });
  }
  const updatePasswordData = formResult.data;
  if (
    updatePasswordData.password !== updatePasswordData.password_confirmation
  ) {
    return data(
      { formErrors: ["Password and password confirmation do not match"] },
      { status: 400 },
    );
  }
  try {
    await resetPasswordWithToken(
      updatePasswordData.reset_token,
      updatePasswordData.password,
    );

    logger.info("Password updated successfully");
    sessionCookie.flash("success", "Password updated successfully");

    return redirect("/auth/login", {
      headers: {
        "Set-Cookie": await commitSession(sessionCookie),
      },
    });
  } catch (e) {
    return data(
      {
        formErrors: [
          "There was an error updating your password. Please try again.",
        ],
      },
      { status: 400 },
    );
  }
};

export const loader = async ({
  request,
  params: { token: reset_token },
}: Route.LoaderArgs) => {
  await requireNoSession(request);

  if (!reset_token) throw new Error("No reset token");
  const email_address = await getUserByResetToken(reset_token);

  return { email_address, reset_token };
};

export const meta: MetaFunction = () => {
  return [{ title: "Update Password | Editframe" }];
};

export function ErrorBoundary() {
  return (
    <div className="flex min-h-full flex-1 flex-col justify-center px-6 py-12 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        <span className="sr-only">Editframe</span>
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
          Reset password
        </h2>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
        <ErrorMessage message="There was an error updating your password. Please try again." />
      </div>
    </div>
  );
}
export default function Welcome() {
  const { email_address, reset_token } = useLoaderData<typeof loader>();
  const formResponse = useActionData<typeof loader>();
  const location = useLocation();

  return (
    <div className="flex min-h-full flex-1 flex-col justify-center px-6 py-12 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        <span className="sr-only">Editframe</span>
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
          Reset password for {email_address}
        </h2>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
        {formResponse && "message" in formResponse && (
          <div className="rounded-md bg-blue-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <Info className="h-5 w-5 text-blue-400" aria-hidden="true" />
              </div>
              <div className="ml-3 flex-1 md:flex md:justify-between">
                <p className="text-sm text-blue-700">
                  {String(formResponse.message)}
                </p>
              </div>
            </div>
          </div>
        )}
        <updatePassword.FormErrors />
        <updatePassword.Form
          key={location.key}
          className="mt-8 space-y-6"
          action="#"
          method="POST"
        >
          <updatePassword.Input
            field="reset_token"
            value={reset_token}
            className="hidden"
            type="hidden"
          />
          <div>
            <p>
              <updatePassword.FieldError field="password" />
            </p>
            <updatePassword.Field label="Password" />
            <div className="mt-2">
              <updatePassword.Input
                type="password"
                field="password"
                placeholder="Enter your password"
                required
                aria-label="Password"
              />
            </div>
          </div>
          <div>
            <p>
              <updatePassword.FieldError field="password_confirmation" />
            </p>
            <updatePassword.Field label="Confirm password" />
            <div className="mt-2">
              <updatePassword.Input
                type="password"
                field="password_confirmation"
                placeholder="Enter your confirmation password"
                required
                aria-label="Password confirmation"
              />
            </div>
          </div>
          <div>
            <Button
              mode="primary"
              type="submit"
              className="w-full"
              loading={(formResponse && "submitting" in formResponse) === true}
              aria-label="Update Password"
            >
              {formResponse && "submitting" in formResponse
                ? "Submitting..."
                : "Update Password"}
            </Button>
          </div>
        </updatePassword.Form>
      </div>
    </div>
  );
}
