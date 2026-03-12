import { Info } from "@phosphor-icons/react";
import { sql } from "kysely";
import {
  Link,
  type MetaFunction,
  data,
  isRouteErrorResponse,
  redirect,
  useLoaderData,
  useRouteError,
} from "react-router";
import z from "zod";

import { graphql } from "@/graphql";
import * as serverGQL from "@/graphql.server/userClient";
import { logger } from "@/logging";
import { db } from "@/sql-client.server";
import { ErrorMessage } from "~/components/ErrorMessage";
import { formFor } from "~/formFor";
import { maybeIdentityContext } from "~/middleware/context";

import type { Route } from "./+types/acceptInvitation";

const schema = z.object({
  action: z.enum(["accept", "deny"]),
});

const inviteMember = formFor(schema);

export const meta: MetaFunction = () => {
  return [{ title: "Invitation | Editframe" }];
};

export const ErrorBoundary = () => {
  const error = useRouteError();

  return (
    <div className="flex min-h-full flex-1 flex-col justify-center px-6 py-12 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        {isRouteErrorResponse(error) ? (
          <>
            {error.status === 404 ? (
              <ErrorMessage message="The invitation you are trying to access does not exist." />
            ) : error.status === 403 ? (
              <ErrorMessage message="You are not authorized to access this invitation." />
            ) : error.status === 410 ? (
              <ErrorMessage message="The invitation you are trying to access has already been accepted or denied." />
            ) : (
              <ErrorMessage message="An error occurred while processing your request." />
            )}
          </>
        ) : (
          <ErrorMessage message="An error occurred while processing your request." />
        )}
      </div>
    </div>
  );
};

export const loader = async ({ context, params }: Route.LoaderArgs) => {
  const session = context.get(maybeIdentityContext);
  const isAuthenticated = !!session;

  const result = await serverGQL.anonymousQuery(
    graphql(`
        query GetInvites ($token: uuid!) {
          invites_for_display(args: { invite_token: $token }) {
            accepted_at
            denied_at
            from_display
            org_display
            org_id
            role
            id
            invitee_email_address
            invitee_id
          }
        }
      `),
    {
      token: params.token!,
    },
  );
  const invite = result.data?.invites_for_display[0];

  // If the invite doesn't exist, return a 404
  if (!invite) {
    throw new Response(null, { status: 404, statusText: "Not Found" });
  }

  // If the invitee is logged in, but the invitation is not for them, return a 403
  if (
    isAuthenticated &&
    invite.invitee_id &&
    session.uid !== invite.invitee_id
  ) {
    throw new Response(null, { status: 403, statusText: "Forbidden" });
  }

  // If the invite has already been accepted or denied, return a 410 "Gone"
  if (invite.accepted_at || invite.denied_at) {
    throw new Response(null, { status: 410, statusText: "Expired" });
  }

  return { invite, isAuthenticated, token: params.token };
};

export const action = async ({
  request,
  context,
  params,
}: Route.ActionArgs) => {
  const formResult = await inviteMember.parseFormData(request);

  const session = context.get(maybeIdentityContext);
  const isAuthenticated = !!session;

  if (!formResult.success) {
    return data(formResult.errors, { status: 400 });
  }

  const result = await serverGQL.anonymousQuery(
    graphql(`
        query GetInvites ($token: uuid!) {
          invites_for_display(args: { invite_token: $token }) {
            accepted_at
            denied_at
            from_display
            org_display
            org_id
            role
            id
            invitee_email_address
            invitee_id
          }
        }
      `),
    {
      token: params.token!,
    },
  );
  const invite = result.data?.invites_for_display[0];

  // If the invite doesn't exist, return a 404
  if (!invite) {
    throw new Response(null, { status: 404, statusText: "Not Found" });
  }

  // If the invitee is logged in, but the invitation is not for them, return a 403
  if (
    isAuthenticated &&
    invite.invitee_id &&
    session.uid !== invite.invitee_id
  ) {
    throw new Response(null, { status: 403, statusText: "Forbidden" });
  }

  // If the invite has already been accepted or denied, return a 410 "Gone"
  if (invite.accepted_at || invite.denied_at) {
    throw new Response(null, { status: 410, statusText: "Expired" });
  }

  if (formResult.data.action === "accept") {
    if (!session?.uid || !invite.org_id) {
      logger.error(
        "Failed to accept invite. Missing session.uid or invite.org_id",
        {
          "session.uid": session?.uid,
          "invite.org_id": invite.org_id,
        },
      );
      throw new Error("Failed to accept invite");
    }
    const membership = await db
      .with("accepted_invite", (cte) =>
        cte
          .updateTable("identity.invites")
          .set({ accepted_at: sql`now()` })
          .where("id", "=", invite.id)
          .returningAll(),
      )
      .insertInto("identity.memberships")
      .values({
        user_id: session?.uid,
        org_id: invite.org_id,
        role: invite.role,
      })
      .returningAll()
      .executeTakeFirst();

    if (!membership) {
      throw new Error("Failed to accept invite");
    }
    return redirect(`/organizations/${invite.org_id}`);
  }
  if (formResult.data.action === "deny") {
    await db
      .updateTable("identity.invites")
      .set({
        denied_at: sql`now()`,
      })
      .where("id", "=", invite.id)
      .execute();
    return redirect("/welcome");
  }
};

export default function Welcome() {
  const { invite, isAuthenticated, token } = useLoaderData<typeof loader>();
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
        <h2 className="my-10 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
          {invite.from_display} has invited to join the {invite.org_display}{" "}
          organization as a {invite.role}.
        </h2>

        {isAuthenticated && (
          <inviteMember.Form method="post" className="mx-auto">
            <div className="rounded-md  p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium ">
                    If you accept this invitation, you will be added to the{" "}
                    <strong>{invite.org_display}</strong> organization with the
                    role of <strong> {invite.role}</strong> .
                  </h3>

                  <div className="mx-auto mt-12">
                    <div className="-mx-2 -my-1.5 flex items-center justify-center gap-4">
                      <button
                        name="action"
                        value="accept"
                        className="rounded-md bg-editframe-600 px-3 py-2 text-sm font-semibold  text-white shadow-sm hover:bg-editframe-400"
                      >
                        Accept
                      </button>
                      <button
                        name="action"
                        value="deny"
                        className="rounded-md bg-red-600 px-3 py-2 text-sm font-semibold  text-white shadow-sm hover:bg-red-400"
                      >
                        Deny
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </inviteMember.Form>
        )}
        {!isAuthenticated && invite.invitee_id && (
          <>
            <div className="my-4 rounded-md bg-blue-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <Info
                    className="h-5 w-5 text-blue-400"
                    aria-hidden="true"
                    weight="fill"
                  />
                </div>
                <div className="ml-3 flex-1 md:flex md:justify-between">
                  <p className="text-sm text-blue-700">
                    You must be logged in to accept this invitation. If you
                    already have an account, you can login by clicking the
                    button below.
                    <span className="mt-4 block">
                      Note: You will be redirected to the invitation page after
                      logging in.
                    </span>
                  </p>
                  <p className="mt-3 text-sm md:ml-6 md:mt-0" />
                </div>
              </div>
            </div>
            <Link
              to={`/auth/login?email_address=${invite.invitee_email_address}&redirect_to=/invitation/${token}`}
              className="mx-auto flex max-w-max items-center  justify-center rounded-md bg-editframe-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-editframe-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-editframe-600"
            >
              Login to accept
            </Link>
          </>
        )}
        {!isAuthenticated && !invite.invitee_id && (
          <>
            <div className="my-4 rounded-md bg-blue-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <Info
                    className="h-5 w-5 text-blue-400"
                    aria-hidden="true"
                    weight="fill"
                  />
                </div>
                <div className="ml-3 flex-1 md:flex md:justify-between">
                  <p className="text-sm text-blue-700">
                    You must create an account to accept this invitation. if you
                    don't have an account, you can create one by clicking the
                    button below.
                  </p>
                </div>
              </div>
            </div>
            <Link
              to={`/auth/register?email_address=${invite.invitee_email_address}&redirect_to=/invitation/${token}&org_name=${invite.org_display}&invite_id=${invite.id}&ref=invitation-to-join-${invite.org_display}`}
              className="mx-auto flex max-w-max items-center  justify-center rounded-md bg-editframe-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-editframe-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-editframe-600"
            >
              Create an account to accept
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
