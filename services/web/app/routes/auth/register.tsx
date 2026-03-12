import { data, redirect } from "react-router";
import { useNavigation } from "react-router";
import z from "zod";
import { formFor } from "../../formFor";
import {
  createEmailPasswordSessionCookie,
  createLoginHeaders,
} from "@/util/session";
import { registerUserWithPassword } from "~/registerUserWithPassword.server";
import { useSearchParams } from "react-router";
import { Link } from "react-router";
import type { MetaFunction } from "react-router";
import { SuccessMessage } from "~/components/SuccessMessage";
import { Button } from "~/components/Button";
import { logger } from "@/logging";
import { useTheme } from "~/hooks/useTheme";

import type { Route } from "./+types/register";
import { noAuthMiddleware } from "~/middleware/auth";

const schema = z
  .object({
    email_address: z.string().email().toLowerCase(),
    password: z.string(),
    password_confirmation: z.string(),
    invite_id: z.string().optional(),
    referral: z.string().optional(),
    redirect_to: z.string().optional(),
    org_name: z.string().optional(),
  })
  .refine(
    (data) =>
      data.password.length >= 8 && data.password_confirmation.length >= 8,
    {
      message: "Password must be at least 8 characters long",
      path: ["password"],
    },
  )
  .refine((data) => data.password === data.password_confirmation, {
    message: "Passwords do not match",
    path: ["password_confirmation"],
  });

const register = formFor(schema);

export const middleware: Route.MiddlewareFunction[] = [noAuthMiddleware];

export const action = async ({ request }: Route.ActionArgs) => {
  const formResult = await register.parseFormData(request);
  if (!formResult.success) {
    return data(formResult.errors, { status: 400 });
  }
  const registration = formResult.data;

  try {
    const emailPassword = await registerUserWithPassword(
      registration.email_address,
      registration.password,
      registration.referral,
    );
    logger.info(
      {
        registration,
        emailPassword,
      },
      "REGISTRATION",
    );
    const sessionCookie = await createEmailPasswordSessionCookie(emailPassword);
    const loginHeaders = await createLoginHeaders(sessionCookie);
    if (registration.invite_id && registration.redirect_to) {
      return redirect(registration.redirect_to, { headers: loginHeaders });
    }
    return redirect("/auth/onboarding", { headers: loginHeaders });
  } catch (error: any) {
    logger.error(error, "Failed to create user");
    if (error?.constraint === "email_passwords_email_address_key") {
      return data(
        {
          user: null,
          fieldErrors: null,
          formErrors: ["Email address already in use"],
        },
        { status: 400 },
      );
    }
    return data(null, { status: 500 });
  }
};

export const loader = async () => {
  return null;
};

export const meta: MetaFunction = () => {
  return [{ title: "Register | Editframe" }];
};
export default function Register() {
  useTheme();
  const navigation = useNavigation();
  const submitting = navigation.state === "submitting";
  const [searchParams] = useSearchParams();

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
          Create an account
        </h2>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
        {searchParams.has("org_name") && (
          <SuccessMessage
            message={`
        You're invited to join ${searchParams.get("org_name")}
        `}
          />
        )}
        {register.FormErrors() && <register.FormErrors />}
        <register.Form className="mt-8 space-y-6">
          {searchParams.has("invite_id") && (
            <register.Field>
              <register.Input
                type="hidden"
                field="invite_id"
                required
                value={searchParams.get("invite_id") || ""}
                readOnly
              />
            </register.Field>
          )}
          {searchParams.has("org_name") && (
            <register.Field>
              <register.Input
                type="hidden"
                field="org_name"
                required
                value={`Invitation from ${searchParams.get("org_name")}`}
                readOnly
              />
            </register.Field>
          )}
          {searchParams.has("ref") && (
            <register.Field>
              <register.Input
                type="hidden"
                field="referral"
                required
                value={searchParams.get("ref") || ""}
                readOnly
              />
            </register.Field>
          )}
          {searchParams.has("redirect_to") && (
            <register.Field>
              <register.Input
                type="hidden"
                field="redirect_to"
                required
                value={searchParams.get("redirect_to") || ""}
                readOnly
              />
            </register.Field>
          )}
          <div>
            <register.Field label="Email address" />
            <div className="mt-2">
              <register.Input
                field="email_address"
                type="email"
                placeholder="Enter your email"
                name="email_address"
                defaultValue={searchParams.get("email_address") || ""}
                required
                aria-label="Email address"
                autoComplete="email"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <register.Field label="Password" />
            </div>
            <div className="mt-2">
              <register.Input
                field="password"
                type="password"
                placeholder="Enter your password"
                name="password"
                minLength={8}
                required
                aria-label="Password"
                autoComplete="current-password"
              />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between">
              <register.Field label="Confirm password" />
            </div>
            <div className="mt-2">
              <register.Input
                field="password_confirmation"
                type="password"
                placeholder="Confirm your password"
                name="password_confirmation"
                minLength={8}
                required
                aria-label="Confirm password"
                autoComplete="new-password"
              />
              <p>
                <register.FieldError field="password_confirmation" />
              </p>
            </div>
          </div>
          <div>
            <Button
              mode="primary"
              type="submit"
              aria-label="Register"
              className="sm:w-full"
              loading={navigation.state === "submitting"}
            >
              {submitting ? "Creating account..." : "Register"}
            </Button>
          </div>
        </register.Form>
        <p className="mt-10 text-center text-sm text-gray-500">
          Already have an account?{" "}
          <Link
            to="/auth/login"
            className="font-semibold leading-6 text-editframe-600 hover:text-editframe-500"
          >
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
