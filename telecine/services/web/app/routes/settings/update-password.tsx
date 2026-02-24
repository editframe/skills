import { data, redirect } from "react-router";
import type { MetaFunction } from "react-router";
import { formFor } from "~/formFor";
import z from "zod";
import { updatePassword } from "~/updatePassword.server";
import { Link } from "~/components/Link";
import { logger } from "@/logging";
import type { Route } from "./+types/update-password";
import { identityContext, sessionCookieContext } from "~/middleware/context";
import { commitSession } from "@/util/session";

const schema = z
  .object({
    current_password: z.string(),
    new_password: z.string().min(8, "Password must be at least 8 characters"),
    confirm_password: z.string().min(8, "Password must be at least 8 characters"),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "New password and confirm password must match",
    path: ["confirm_password"],
  })
  .refine((data) => data.new_password !== data.current_password, {
    message: "New password must be different than your current password",
    path: ["new_password"],
  });

const editAccount = formFor(schema);

export async function action({ request, context }: Route.ActionArgs) {
  const session = context.get(identityContext);
  const sessionCookie = context.get(sessionCookieContext);
  const values = await editAccount.parseFormData(request);
  if (!values.success) {
    return data(values.errors, { status: 400 });
  }

  try {
    await updatePassword(
      session.uid,
      values.data.current_password,
      values.data.new_password,
    );

    sessionCookie.flash("success", "Password updated successfully");

    return redirect("/settings", {
      headers: {
        "Set-Cookie": await commitSession(sessionCookie),
      },
    });
  } catch (error) {
    logger.error(error, "Error updating password");

    return data(
      {
        formErrors: [
          "There was an error updating your password. Please try again. (You may have entered your current password incorrectly.)",
        ],
        fieldErrors: {},
      },
      {
        status: 400,
      },
    );
  }
}

export const loader = async () => {
  return {};
};

export const meta: MetaFunction = () => {
  return [{ title: "Update Password | Editframe" }];
};
export default function Page() {
  return (
    <div className="space-y-6">
      <editAccount.Form>
        <div className="space-y-6">
          <div>
            <h2 className="font-semibold text-base text-gray-900 leading-7">
              Update password
            </h2>
            <p className="mt-1 text-gray-600 text-sm leading-6">
              Update your account password.
            </p>
          </div>

          <editAccount.FormErrors />

          <editAccount.Input
            label="Current Password"
            field="current_password"
            type="password"
            placeholder="Enter your current password"
            required
            aria-label="Current Password"
            autoComplete="current-password"
          />

          <editAccount.Input
            label="New Password"
            field="new_password"
            type="password"
            placeholder="Enter your new password"
            required
            aria-label="New Password"
            autoComplete="new-password"
          />

          <editAccount.Input
            label="Password confirmation"
            field="confirm_password"
            type="password"
            placeholder="Re-enter your new password"
            required
            aria-label="Password confirmation"
            autoComplete="new-password"
          />

          <div className="flex gap-x-6">
            <editAccount.Submit>Update Password</editAccount.Submit>
            <Link to="/settings">Cancel</Link>
          </div>
        </div>
      </editAccount.Form>
    </div>
  );
}
