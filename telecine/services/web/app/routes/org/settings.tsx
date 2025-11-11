import { data, useLoaderData, useSearchParams } from "react-router";

import { graphql } from "@/graphql";
import { requireMutateAs, requireQueryAs } from "@/graphql.server/userClient";
import { formFor } from "~/formFor";
import { z } from "zod";
import { Roles_Enum } from "~/roles";
import { SuccessMessage } from "~/components/SuccessMessage";
import { ErrorMessage } from "~/components/ErrorMessage";

import { requireSession } from "@/util/requireSession.server";
import { requireOrgId } from "@/util/requireOrgId";

import type { Route } from "./+types/settings";

const schema = z.object({
  id: z.string(),
  display_name: z.string().min(1, "Organization name is required"),
  website: z
    .union([z.string().url(), z.string().max(0)])
    .optional()
    .transform((val) => (val === "" ? null : val)),
});

const organizationForm = formFor(schema);

export const loader = async ({ request }: Route.LoaderArgs) => {
  const orgId = requireOrgId(request);
  const { session } = await requireSession(request);

  const organization = await requireQueryAs(
    { uid: session.uid, cid: session.cid ?? null },
    "org-reader",
    graphql(`
        query GetOrgSettings ($id: uuid!, $userId: uuid!) {
          result: orgs_by_pk(id: $id) {
            id
            display_name
            primary_user_id
            website
            memberships(where: { user_id: { _eq: $userId } }) {
              role
            }
          }
        }
      `),
    { id: orgId, userId: session.uid },
  );

  const role = organization.memberships[0]?.role;

  if (!role) {
    throw new Error("User is not a member of this organization");
  }

  return { organization, role };
};

export const action = async ({ request }: Route.ActionArgs) => {
  const { session } = await requireSession(request);
  const values = await organizationForm.parseFormData(request);
  if (!values.success) {
    return data(values.errors, { status: 400 });
  }

  await requireMutateAs(
    { uid: session.uid, cid: session.cid ?? null },
    "org-admin",
    graphql(`
    mutation UpdateOrgSettings($id: uuid!, $display_name: String!, $website: String) {
      result: update_orgs_by_pk(pk_columns: {id: $id}, _set: {display_name: $display_name, website: $website}) {
        id
      }
    }
  `),
    {
      id: values.data.id,
      display_name: values.data.display_name,
      website: values.data.website ?? null,
    },
  );

  return data({ errors: null });
};

export default function OrgSettings() {
  const [searchParams] = useSearchParams();
  const orgId = searchParams.get("org");
  if (!orgId) {
    throw new Error(
      "No organization ID found in search params. Please contact support.",
    );
  }
  const { organization, role } = useLoaderData<typeof loader>();

  return (
    <div className="space-y-6">
      <organizationForm.Form method="post">
        <div className="space-y-6">
          <div>
            <h2 className="font-semibold text-base text-gray-900 leading-7">
              Organization Settings
            </h2>
            <p className="mt-1 text-gray-600 text-sm leading-6">
              Manage your organization details
            </p>

            <organizationForm.Success>
              <SuccessMessage message="Organization settings saved" />
            </organizationForm.Success>

            <organizationForm.Failure>
              <ErrorMessage message="Failed to save organization settings" />
            </organizationForm.Failure>
          </div>

          <organizationForm.HiddenInput field="id" value={orgId} />

          <organizationForm.Input
            label="Organization Name"
            field="display_name"
            defaultValue={organization.display_name}
            disabled={role !== Roles_Enum.Admin}
            type="text"
            placeholder="Enter organization name"
            aria-label="Organization name"
          />

          <organizationForm.Input
            label="Website (Optional)"
            field="website"
            defaultValue={organization.website ?? ""}
            disabled={role !== Roles_Enum.Admin}
            type="text"
            placeholder="Enter organization website"
            aria-label="Organization website"
          />

          {role === Roles_Enum.Admin && (
            <organizationForm.Submit>Save changes</organizationForm.Submit>
          )}
        </div>
      </organizationForm.Form>
    </div>
  );
}
