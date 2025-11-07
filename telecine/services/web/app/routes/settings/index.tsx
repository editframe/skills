import { graphql } from "@/graphql";
import { Envelope, Lock } from "@phosphor-icons/react";

import type { MetaFunction } from "react-router";
import { data } from "react-router";
import { Link } from "react-router";
import z from "zod";
import { ErrorMessage } from "~/components/ErrorMessage";
import { SuccessMessage } from "~/components/SuccessMessage";
import { formFor } from "~/formFor";
import { requireMutateAs } from "@/graphql.server/userClient";
import { progressiveQuery, useSubscriptionForQuery } from "@/graphql.client";
import { serverQuery } from "@/graphql.server";
import { useFetcher } from "react-router";
import type { FC } from "react";
import { Button } from "~/components/Button";

import type { Route } from "./+types/index";
import { requireSession } from "@/util/requireSession.server";
const schema = z.object({
  first_name: z.string().optional(),
  last_name: z.string().optional(),
});

const editAccount = formFor(schema);

export async function action({ request }: Route.ActionArgs) {
  const { session } = await requireSession(request);
  const values = await editAccount.parseFormData(request);
  if (!values.success) {
    return data(values.errors, { status: 400 });
  }

  await requireMutateAs(
    session,
    "user",
    graphql(`
        mutation UpdateUser(
          $id: uuid!
          $first_name: String
          $last_name: String
        ) {
          result: update_users_by_pk(
            pk_columns: { id: $id },
            _set: { first_name: $first_name, last_name: $last_name }
          ) {
            id
          }
        }
      `),
    {
      id: session.uid,
      first_name: values.data.first_name,
      last_name: values.data.last_name,
    },
  );

  return { errors: null };
}

const UserDetailsQuery = progressiveQuery(
  "user",
  graphql(`
  query GetUserDetails($id: uuid!) {
    result: users_by_pk(id: $id) {
      first_name
      last_name
      email_passwords {
        id
        email_address
        confirmation {
          confirmed_at
        }
      }
    }
  }
`),
);

export const loader = async ({ request }: Route.LoaderArgs) => {
  const { session } = await requireSession(request);
  const liveQuery = await serverQuery(session, UserDetailsQuery, {
    id: session.uid,
  });
  return {
    id: session.uid,
    liveQuery,
  };
};

export const meta: MetaFunction = () => {
  return [{ title: "Settings | Editframe" }];
};
export default function Page({
  loaderData: { id, liveQuery },
}: Route.ComponentProps) {
  const subscription = useSubscriptionForQuery(
    liveQuery.token,
    UserDetailsQuery,
    { id },
    liveQuery.result,
  );

  if (subscription.error) {
    console.log("Subscription error", subscription.error);
  }

  const user = subscription.data?.result;

  if (!user) {
    throw new Error("No user found");
  }

  const emailPassword = user.email_passwords[0];
  if (!emailPassword) {
    throw new Error("No email password found");
  }

  return (
    <div className="space-y-6">
      <editAccount.Form>
        <div className="space-y-6">
          <div>
            <h2 className="font-semibold text-base text-gray-900 leading-7">
              Account Settings
            </h2>
            <p className="mt-1 text-gray-600 text-sm leading-6">
              Update your account settings here.
            </p>

            <editAccount.Success>
              <SuccessMessage message="Account settings saved" />
            </editAccount.Success>

            <editAccount.Failure>
              <ErrorMessage message="Failed to save account settings" />
            </editAccount.Failure>
          </div>

          <editAccount.Input
            label="First Name (optional)"
            defaultValue={user.first_name ?? ""}
            field="first_name"
            type="text"
            placeholder="Enter your first name"
            aria-label="First name"
          />

          <editAccount.Input
            label="Last Name (optional)"
            defaultValue={user.last_name ?? ""}
            field="last_name"
            type="text"
            placeholder="Enter your last name"
            aria-label="Last name"
          />

          <editAccount.Submit>Save changes</editAccount.Submit>
        </div>
      </editAccount.Form>

      <div>
        <h2 className="font-semibold text-base text-gray-900 leading-7">
          Email Address
        </h2>
        <p className="mt-1 text-gray-600 text-sm leading-6">
          Manage your email addresses and verification status.
        </p>
      </div>

      <div className="max-w-lg">
        <div className="space-y-4">
          {user.email_passwords.map((email) => {
            return (
              <EmailRow
                id={email.id}
                emailAddress={email.email_address}
                isConfirmed={!!email.confirmation?.confirmed_at}
                key={email.email_address}
              />
            );
          })}
        </div>
      </div>

      <div className="space-y-4 max-w-lg">
        <h2 className="font-semibold text-base text-gray-900 leading-7">
          Password
        </h2>

        <Link
          to="/settings/update-password"
          className="inline-flex items-center bg-editframe-600 hover:bg-editframe-400 shadow-sm px-3 py-2 rounded-md font-semibold text-sm text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-editframe-600"
        >
          <Lock
            className="mr-1.5 -ml-0.5 w-5 h-5"
            aria-hidden="true"
            weight="fill"
          />
          Change Password
        </Link>
      </div>
    </div>
  );
}

const EmailRow: FC<{
  id: string;
  emailAddress: string;
  isConfirmed: boolean;
}> = ({ id, emailAddress, isConfirmed }) => {
  const fetcher = useFetcher<{ success: boolean; error: any }>();
  const isResending = fetcher.state === "submitting";
  const hasError = fetcher.data?.error;
  const isSuccess = fetcher.state === "idle" && fetcher.data?.success;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-center gap-4 border-gray-300 p-2 border rounded-lg">
        <div className="flex items-center gap-4">
          <div className="text-gray-900 text-sm">{emailAddress}</div>
          <div className="flex items-center">
            {isConfirmed ? (
              <span className="font-medium text-green-600 text-xs">
                Verified
              </span>
            ) : (
              <span className="font-medium text-amber-600 text-xs">
                Unverified
              </span>
            )}
          </div>
        </div>
        {!isConfirmed && !isSuccess && (
          <fetcher.Form
            action={`/email_passwords/${id}/resend-verification`}
            method="post"
          >
            <Button
              type="submit"
              disabled={isResending}
              icon={Envelope}
              className="disabled:opacity-50 font-medium text-editframe-600 text-xs hover:text-editframe-500"
              mode={"action"}
            >
              {isResending ? "Sending..." : "Resend verification"}
            </Button>
          </fetcher.Form>
        )}
        {isSuccess && (
          <span className="font-medium text-green-600 text-xs">
            Verification email sent
          </span>
        )}
      </div>
      {hasError && (
        <div className="text-red-600 text-xs">
          Failed to send verification email. Please try again.
        </div>
      )}
    </div>
  );
};
