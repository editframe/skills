import type { Route } from "./+types/create-user";
import { adminIdentityContext } from "~/middleware/context";
import { Button } from "~/components/Button";
import { db } from "@/sql-client.server";
import { data } from "react-router";
import z from "zod";
import { formFor } from "~/formFor";
import { registerUserWithPassword } from "~/registerUserWithPassword.server";
import { resetPasswordUserWithPassword } from "~/resetPasswordWithEmail.server";
import { logger } from "@/logging";
import { sql } from "kysely";
import crypto from "node:crypto";
import { useState } from "react";
import { SuccessMessage } from "~/components/SuccessMessage";
import { OrgCombobox } from "~/components/OrgCombobox";
import clsx from "clsx";
import { auditAdminAction } from "@/util/auditAdminAction";

const schema = z
  .object({
    email_address: z.string().email().toLowerCase(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    org_choice: z.enum(["new", "existing"]),
    new_org_name: z.string().optional(),
    existing_org_id: z.string().uuid().optional(),
    role: z.enum(["admin", "editor", "reader"]).optional(),
  })
  .refine(
    (data) => {
      if (data.org_choice === "new" && !data.new_org_name) {
        return false;
      }
      if (data.org_choice === "existing" && !data.existing_org_id) {
        return false;
      }
      if (data.org_choice === "existing" && !data.role) {
        return false;
      }
      return true;
    },
    {
      message: "Please provide organization details",
      path: ["org_choice"],
    },
  );

const createUserForm = formFor(schema);

export const loader = async ({ request }: Route.LoaderArgs) => {
  return null;
};

export const action = async ({ request, context }: Route.ActionArgs) => {
  const session = context.get(adminIdentityContext);

  const formResult = await createUserForm.parseFormData(request);
  if (!formResult.success) {
    return data(formResult.errors, { status: 400 });
  }

  const formData = formResult.data;

  try {
    const tempPassword = crypto.randomBytes(16).toString("hex");

    const emailPassword = await registerUserWithPassword(
      formData.email_address,
      tempPassword,
      formData.first_name || null,
      formData.last_name || null,
      null,
    );

    await db
      .updateTable("identity.email_confirmations")
      .set({ confirmed_at: sql`now()` })
      .where("user_id", "=", emailPassword.user_id)
      .execute();

    let orgId: string | undefined;
    if (formData.org_choice === "new" && formData.new_org_name) {
      const newOrg = await db
        .insertInto("identity.orgs")
        .values({
          display_name: formData.new_org_name,
          primary_user_id: emailPassword.user_id,
        })
        .returning("id")
        .executeTakeFirstOrThrow();

      orgId = newOrg.id;

      await db
        .insertInto("identity.memberships")
        .values({
          org_id: orgId,
          user_id: emailPassword.user_id,
          role: "admin",
        })
        .execute();
    } else if (formData.org_choice === "existing" && formData.existing_org_id) {
      orgId = formData.existing_org_id;

      await db
        .insertInto("identity.memberships")
        .values({
          org_id: formData.existing_org_id,
          user_id: emailPassword.user_id,
          role: formData.role || "editor",
        })
        .execute();
    }

    await resetPasswordUserWithPassword(formData.email_address);

    auditAdminAction(session, "create-user", {
      email_address: formData.email_address,
      user_id: emailPassword.user_id,
      org_choice: formData.org_choice,
      org_id: orgId,
    });

    return data({
      success: true,
      email: formData.email_address,
    });
  } catch (error: any) {
    logger.error(error, "Failed to create user via admin");

    if (error?.constraint === "email_passwords_email_address_key") {
      return data(
        {
          user: null,
          fieldErrors: {
            email_address: ["Email address already in use"],
          },
          formErrors: null,
        },
        { status: 400 },
      );
    }

    return data(
      {
        user: null,
        fieldErrors: null,
        formErrors: ["Failed to create user. Please try again."],
      },
      { status: 500 },
    );
  }
};

export default function CreateUser(_props: Route.ComponentProps) {
  const [orgChoice, setOrgChoice] = useState<"new" | "existing">("new");
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [selectedRole, setSelectedRole] = useState<
    "admin" | "editor" | "reader"
  >("editor");

  return (
    <div className="p-6">
      <h1
        className={clsx(
          "text-xl font-semibold mb-6 transition-colors",
          "text-slate-900 dark:text-white",
        )}
      >
        Create User
      </h1>

      <createUserForm.Success>
        <SuccessMessage message="User created successfully! A password reset email has been sent." />
      </createUserForm.Success>

      <createUserForm.FormErrors />

      <createUserForm.Form className="space-y-6 max-w-2xl">
        <createUserForm.Input
          field="email_address"
          label="Email Address"
          type="email"
          required
          placeholder="user@example.com"
        />

        <createUserForm.Input
          field="first_name"
          label="First Name"
          type="text"
          placeholder="Optional"
        />

        <createUserForm.Input
          field="last_name"
          label="Last Name"
          type="text"
          placeholder="Optional"
        />

        <div className="space-y-4">
          <label
            className={clsx(
              "block font-medium text-sm transition-colors",
              "text-slate-900 dark:text-white",
            )}
          >
            Organization
          </label>

          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="org_choice"
                value="new"
                checked={orgChoice === "new"}
                onChange={(e) =>
                  setOrgChoice(e.target.value as "new" | "existing")
                }
                className={clsx(
                  "rounded focus:ring-blue-500 dark:focus:ring-blue-400 w-4 h-4 text-blue-500 dark:text-blue-400 transition-colors",
                  "border-slate-300 dark:border-slate-600",
                )}
              />
              <span
                className={clsx(
                  "text-sm transition-colors",
                  "text-slate-700 dark:text-slate-300",
                )}
              >
                Create new organization
              </span>
            </label>

            {orgChoice === "new" && (
              <div className="ml-6">
                <createUserForm.Input
                  field="new_org_name"
                  label="Organization Name"
                  type="text"
                  required={orgChoice === "new"}
                  placeholder="My Organization"
                />
              </div>
            )}

            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="org_choice"
                value="existing"
                checked={orgChoice === "existing"}
                onChange={(e) =>
                  setOrgChoice(e.target.value as "new" | "existing")
                }
                className={clsx(
                  "rounded focus:ring-blue-500 dark:focus:ring-blue-400 w-4 h-4 text-blue-500 dark:text-blue-400 transition-colors",
                  "border-slate-300 dark:border-slate-600",
                )}
              />
              <span
                className={clsx(
                  "text-sm transition-colors",
                  "text-slate-700 dark:text-slate-300",
                )}
              >
                Add to existing organization
              </span>
            </label>

            {orgChoice === "existing" && (
              <div className="ml-6 space-y-4">
                <div>
                  <label
                    className={clsx(
                      "block font-medium text-sm mb-2 transition-colors",
                      "text-slate-900 dark:text-white",
                    )}
                  >
                    Select Organization
                  </label>
                  <OrgCombobox
                    value={selectedOrgId}
                    onChange={setSelectedOrgId}
                  />
                  <input
                    type="hidden"
                    name="existing_org_id"
                    value={selectedOrgId}
                  />
                </div>

                <div>
                  <label
                    className={clsx(
                      "block font-medium text-sm mb-2 transition-colors",
                      "text-slate-900 dark:text-white",
                    )}
                  >
                    Role
                  </label>
                  <div className="flex gap-3">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="role"
                        value="reader"
                        checked={selectedRole === "reader"}
                        onChange={(e) =>
                          setSelectedRole(
                            e.target.value as "admin" | "editor" | "reader",
                          )
                        }
                        className={clsx(
                          "rounded focus:ring-blue-500 dark:focus:ring-blue-400 w-4 h-4 text-blue-500 dark:text-blue-400 transition-colors",
                          "border-slate-300 dark:border-slate-600",
                        )}
                      />
                      <span
                        className={clsx(
                          "text-sm transition-colors",
                          "text-slate-700 dark:text-slate-300",
                        )}
                      >
                        Reader
                      </span>
                    </label>

                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="role"
                        value="editor"
                        checked={selectedRole === "editor"}
                        onChange={(e) =>
                          setSelectedRole(
                            e.target.value as "admin" | "editor" | "reader",
                          )
                        }
                        className={clsx(
                          "rounded focus:ring-blue-500 dark:focus:ring-blue-400 w-4 h-4 text-blue-500 dark:text-blue-400 transition-colors",
                          "border-slate-300 dark:border-slate-600",
                        )}
                      />
                      <span
                        className={clsx(
                          "text-sm transition-colors",
                          "text-slate-700 dark:text-slate-300",
                        )}
                      >
                        Editor
                      </span>
                    </label>

                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="role"
                        value="admin"
                        checked={selectedRole === "admin"}
                        onChange={(e) =>
                          setSelectedRole(
                            e.target.value as "admin" | "editor" | "reader",
                          )
                        }
                        className={clsx(
                          "rounded focus:ring-blue-500 dark:focus:ring-blue-400 w-4 h-4 text-blue-500 dark:text-blue-400 transition-colors",
                          "border-slate-300 dark:border-slate-600",
                        )}
                      />
                      <span
                        className={clsx(
                          "text-sm transition-colors",
                          "text-slate-700 dark:text-slate-300",
                        )}
                      >
                        Admin
                      </span>
                    </label>
                  </div>
                  <p
                    className={clsx(
                      "mt-1 text-xs transition-colors",
                      "text-slate-500 dark:text-slate-400",
                    )}
                  >
                    Reader: view only • Editor: typical access • Admin: full
                    control
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="pt-4">
          <Button mode="action" type="submit">
            Create User
          </Button>
        </div>
      </createUserForm.Form>

      <div
        className={clsx(
          "mt-8 p-4 rounded-md max-w-2xl transition-colors",
          "bg-slate-50 dark:bg-slate-800",
        )}
      >
        <h2
          className={clsx(
            "text-sm font-medium mb-2 transition-colors",
            "text-slate-900 dark:text-white",
          )}
        >
          What happens next?
        </h2>
        <ul
          className={clsx(
            "text-xs space-y-1 list-disc list-inside transition-colors",
            "text-slate-600 dark:text-slate-400",
          )}
        >
          <li>User account will be created with email confirmed</li>
          <li>User will be assigned to the selected organization</li>
          <li>A password reset email will be sent to the user</li>
          <li>User can set their own password using the reset link</li>
        </ul>
      </div>
    </div>
  );
}
