import { data, redirect } from "react-router";
import { formFor } from "~/formFor";
import z from "zod";
import { identityContext } from "~/middleware/context";
import { Link, useNavigation, type MetaFunction } from "react-router";
import { Roles_Enum } from "~/roles";
import { Button } from "~/components/Button";
import { db } from "@/sql-client.server";
import { logger } from "@/logging";

const schema = z.object({
  display_name: z.string(),
  website: z.string().optional(),
});

const newOrganization = formFor(schema);

import type { Route } from "./+types/new";

export const loader = async () => {
  return null;
};

export const action = async ({ request, context }: Route.ActionArgs) => {
  const session = context.get(identityContext);
  const formResult = await newOrganization.parseFormData(request);
  if (!formResult.success) {
    return data(formResult.errors, { status: 400 });
  }
  const formData = formResult.data;
  try {
    const organization = await db
      .with("insert_org", (cte) =>
        cte
          .insertInto("identity.orgs")
          .values({
            display_name: formData.display_name,
            primary_user_id: session.uid,
            website: formData.website,
          })
          .returningAll(),
      )
      .with("insert_membership", (cte) =>
        cte
          .insertInto("identity.memberships")
          .values({
            org_id: cte.selectFrom("insert_org").select("id"),
            user_id: session.uid,
            role: Roles_Enum.Admin,
          })
          .returningAll(),
      )
      .selectFrom("insert_org")
      .select("id")
      .executeTakeFirst();

    if (!organization) {
      throw new Error("Failed to create organization");
    }

    return redirect(`/organizations/${organization.id}`);
  } catch (e) {
    logger.error(e);
    return data(
      { errorMessage: "Error creating organization" },
      { status: 500 },
    );
  }
};

export const meta: MetaFunction = () => {
  return [{ title: "New organization | Editframe" }];
};
export default function Welcome() {
  const navigation = useNavigation();
  return (
    <div className="container py-10">
      <newOrganization.Form>
        <div className="space-y-12">
          <div className="grid grid-cols-1 gap-x-8 gap-y-10 border-b border-gray-900/10 pb-12 md:grid-cols-3">
            <div>
              <h2 className="text-base font-semibold leading-7 text-gray-900">
                Organization details
              </h2>
              <p className="mt-1 text-sm leading-6 text-gray-600">
                Create a new organization and invite members.
              </p>
            </div>

            <div className="grid max-w-2xl grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6 md:col-span-2">
              <div className="sm:col-span-4">
                <label
                  htmlFor="website"
                  className="block text-sm font-medium leading-6 text-gray-900"
                >
                  Display Name
                </label>
                <div className="mt-2">
                  <div className="flex rounded-md shadow-sm ring-1 ring-inset ring-gray-300 focus-within:ring-2 focus-within:ring-inset focus-within:ring-editframe-600 sm:max-w-md">
                    <newOrganization.Input
                      field="display_name"
                      type="text"
                      className="block flex-1 border-0 bg-transparent px-2 py-1.5 text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm sm:leading-6"
                      placeholder="Enter your organization name"
                      required
                      aria-label="Display Name"
                    />
                  </div>
                </div>
              </div>
              <div className="sm:col-span-4">
                <label
                  htmlFor="website"
                  className="block text-sm font-medium leading-6 text-gray-900"
                >
                  Website (optional)
                </label>
                <div className="mt-2">
                  <div className="flex rounded-md shadow-sm ring-1 ring-inset ring-gray-300 focus-within:ring-2 focus-within:ring-inset focus-within:ring-editframe-600 sm:max-w-md">
                    <newOrganization.Input
                      field="website"
                      type="text"
                      className="block flex-1 border-0 bg-transparent px-2 py-1.5 text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm sm:leading-6"
                      placeholder="Enter your organization website"
                      aria-label="Website"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-x-6">
          <Button mode="secondary" type="button">
            <Link to="/organizations">Cancel</Link>
          </Button>
          <Button
            mode="primary"
            loading={navigation.state === "submitting"}
            type="submit"
          >
            Create organization
          </Button>
        </div>
      </newOrganization.Form>
    </div>
  );
}
