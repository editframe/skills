import { data } from "react-router";
import { redirect } from "react-router";
import z from "zod";
import { formFor } from "~/formFor";
import { loginUserWithPassword } from "~/loginUserWithPassword.server";
import { createEmailPasswordSessionCookie, createLoginHeaders } from "@/util/session";
import { Link, useSearchParams, useNavigation } from "react-router";
import type { MetaFunction } from "react-router";
import { commitSession } from "@/util/session";
import { Button } from "~/components/Button";
import { PageLayout } from "~/components/layouts/PageLayout";
import { themeClasses } from "~/utils/theme-classes";
import clsx from "clsx";

import type { Route } from "./+types/login";
import { noAuthMiddleware } from "~/middleware/auth";
import { sessionCookieContext } from "~/middleware/context";

const schema = z.object({
  email_address: z.string().email().toLowerCase(),
  password: z.string(),
  redirect_to: z.string().optional(),
});

const login = formFor(schema);

export const middleware: Route.MiddlewareFunction[] = [noAuthMiddleware];

export const action = async ({ request }: Route.ActionArgs) => {
  const formResult = await login.parseFormData(request);

  if (!formResult.success) {
    return data(formResult.errors, { status: 400 });
  }

  const loginData = formResult.data;

  const sessionInfo = await loginUserWithPassword(
    loginData.email_address,
    loginData.password,
  );

  if (!sessionInfo) {
    return data(
      { formErrors: ["Incorrect email address or password"] },
      { status: 401 },
    );
  }
  const sessionCookie = await createEmailPasswordSessionCookie(sessionInfo);
  const loginHeaders = await createLoginHeaders(sessionCookie);
  if (loginData.redirect_to) {
    return redirect(loginData.redirect_to, { headers: loginHeaders });
  }
  return redirect("/welcome", { headers: loginHeaders });
};

export const loader = async ({ context }: Route.LoaderArgs) => {
  const sessionCookie = context.get(sessionCookieContext);
  const errorMessage = sessionCookie.get("error") || null;
  const successMessage = sessionCookie.get("success") || null;
  sessionCookie.unset("error");
  sessionCookie.unset("success");
  return data(
    { errorMessage, successMessage },
    { headers: { "Set-Cookie": await commitSession(sessionCookie) } },
  );
};

export const meta: MetaFunction = () => {
  return [{ title: "Login | Editframe" }];
};
export default function Login() {
  const [searchParams] = useSearchParams();
  const navigation = useNavigation();
  return (
    <PageLayout>
      <div className="flex min-h-full flex-1 flex-col justify-center px-4 sm:px-6 py-12 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-sm">
          <span className="sr-only"> Editframe</span>
          <svg
            className={clsx(
              "mx-auto my-4 h-9 w-9 md:my-0",
              themeClasses.pageText,
            )}
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
          <h1
            className={clsx(
              "mt-10 text-center text-2xl font-bold leading-9 tracking-tight",
              themeClasses.pageText,
            )}
          >
            Login
          </h1>
          <Link
            to="/auth/magic-link"
            className={clsx(
              "mt-4 block text-center text-sm font-semibold leading-6 transition-colors",
              "text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300",
            )}
          >
            Login with magic link
          </Link>
        </div>

        <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
          {login.FormErrors() && <login.FormErrors />}
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
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <login.Field label="Password" />
                <div className="text-sm">
                  <Link
                    to="/auth/reset-password"
                    className={clsx(
                      "font-semibold transition-colors",
                      "text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300",
                    )}
                  >
                    Forgot password?
                  </Link>
                </div>
              </div>
              <div className="mt-2">
                <login.Input
                  aria-label="Password"
                  field="password"
                  placeholder="Enter your password"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                />
              </div>
            </div>

            <div>
              <Button
                mode="primary"
                type="submit"
                aria-label="Login"
                className="sm:w-full"
                loading={navigation.state === "submitting"}
              >
                Login
              </Button>
            </div>
          </login.Form>

          <p
            className={clsx(
              "mt-10 text-center text-sm",
              themeClasses.pageTextSecondary,
            )}
          >
            Not a member?{" "}
            <Link
              to="/auth/register"
              className={clsx(
                "font-semibold leading-6 transition-colors",
                "text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300",
              )}
            >
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </PageLayout>
  );
}
