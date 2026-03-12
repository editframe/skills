import { data, type MetaFunction, useNavigation } from "react-router";
import { formFor } from "~/formFor";
import z from "zod";
import { redirect } from "react-router";
import { graphql } from "@/graphql";
import * as serverGQL from "@/graphql.server";
import { Button } from "~/components/Button";
import { logger } from "@/logging";
import { authMiddleware } from "~/middleware/auth";
import { identityContext } from "~/middleware/context";

import type { Route } from "./+types/index";

const schema = z.object({
  first_name: z.string(),
  last_name: z.string(),
  website: z.string().optional(),
  organization_name: z.string(),
});
const onboarding = formFor(schema);

export const middleware: Route.MiddlewareFunction[] = [authMiddleware];

export const action = async ({ request, context }: Route.ActionArgs) => {
  const session = context.get(identityContext);
  const formResult = await onboarding.parseFormData(request);
  if (!formResult.success) {
    return data(formResult.errors, { status: 400 });
  }
  const onboardingData = formResult.data;

  const { first_name, last_name, website, organization_name } = onboardingData;
  const updateUser = await serverGQL.mutateAs(
    session,
    "user",
    graphql(`
      mutation UpdateUser($id: uuid!, $firstName: String, $lastName: String) {
        update_users_by_pk(
          _set: { first_name: $firstName, last_name: $lastName }
          pk_columns: { id: $id }
        ) {
          id
          last_name
          first_name
        }
      }
    `),
    {
      id: session?.uid,
      firstName: first_name,
      lastName: last_name,
    },
  );
  const createNewOrg = await serverGQL.mutateAs(
    session!,
    "org-primary",
    graphql(`
      mutation CreateOrg($displayName: String!, $website: String) {
        insert_orgs_one(
          object: { display_name: $displayName, website: $website }
        ) {
          created_at
          id
          primary_user_id
        }
      }
    `),
    {
      displayName: organization_name,
      website: website,
    },
  );

  if (
    !updateUser.data?.update_users_by_pk ||
    !createNewOrg.data?.insert_orgs_one
  ) {
    logger.error(
      { updateUser, createNewOrg },
      "Failed to update user or create organization",
    );
    return data(
      { formErrors: ["Failed to update user or create organization"] },
      { status: 500 },
    );
  }

  return redirect("/auth/onboarding/next");
};
export const loader = async function loader() {
  return null;
};

export const meta: MetaFunction = () => {
  return [{ title: "Onboarding | Editframe" }];
};

export default function Page() {
  const navigation = useNavigation();
  const submitting = navigation.state === "submitting";
  return (
    <div className="container mt-10 py-4 sm:mx-auto sm:w-full sm:max-w-sm">
      <div className="mx-auto max-w-2xl text-center">
        <svg
          className="mx-auto my-4 h-12 w-12 md:my-0"
          viewBox="0 0 512 512"
          width="36"
          height="36"
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
        <p className="mt-4 text-lg leading-8 text-gray-600">
          Finish setting up your account
        </p>
      </div>
      {onboarding.FormErrors() && <onboarding.FormErrors />}

      <onboarding.Form className="mt-8 grid max-w-full grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <onboarding.Field label="First name">
            <onboarding.FieldError field="first_name" />
            <onboarding.Input
              field="first_name"
              type="text"
              name="first_name"
              id="first_name"
              aria-label="First name"
              autoComplete="given-name"
              className="block w-full rounded-md border-0 px-3.5 py-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-editframe-600 sm:text-sm sm:leading-6"
            />
          </onboarding.Field>
        </div>
        <div className="sm:col-span-2">
          <onboarding.Field label="Last name">
            <onboarding.FieldError field="last_name" />
            <onboarding.Input
              field="last_name"
              type="text"
              name="last_name"
              autoComplete="family-name"
              aria-label="Last name"
              className="block w-full rounded-md border-0 px-3.5 py-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-editframe-600 sm:text-sm sm:leading-6"
            />
          </onboarding.Field>
        </div>
        <div className="sm:col-span-2">
          <onboarding.Field label="Organization name">
            <onboarding.FieldError field="organization_name" />
            <onboarding.Input
              field="organization_name"
              type="text"
              name="organization_name"
              id="organization_name"
              autoComplete="company"
              aria-label="Organization name"
              className="block w-full rounded-md border-0 px-3.5 py-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-editframe-600 sm:text-sm sm:leading-6"
            />
          </onboarding.Field>
        </div>
        <div className="sm:col-span-2">
          <onboarding.Field label="Organization Website (optional)">
            <onboarding.FieldError field="website" />
            <onboarding.Input
              field="website"
              type="text"
              name="website"
              id="website"
              autoComplete="url"
              aria-label="Website"
              className="block w-full rounded-md border-0 px-3.5 py-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-editframe-600 sm:text-sm sm:leading-6"
            />
          </onboarding.Field>
        </div>
        <div className="mt-10 sm:col-span-2">
          <Button
            mode="primary"
            type="submit"
            className="sm:w-full"
            loading={submitting}
          >
            {submitting ? "Submitting..." : "Continue"}
          </Button>
        </div>
      </onboarding.Form>
    </div>
  );
}
