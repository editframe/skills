import type { Locator } from "@playwright/test";
import {
  test,
  expect,
  makeUserFixture,
  makeOrgFixture,
  type OrgFixture,
} from "../util/test";

import { db } from "@/sql-client.server";
import type {
  IdentityEmailPasswords,
  IdentityInvites,
} from "@/sql-client.server/kysely-codegen";
import { sql, type Selectable } from "kysely";

const newInviteTest = test.extend<{
  invitedUser: Selectable<IdentityEmailPasswords>;
  orgInvitedTo: OrgFixture;
  emailAddressField: Locator;
  inviteButton: Locator;
}>({
  invitedUser: makeUserFixture("invitable"),
  orgInvitedTo: makeOrgFixture("blank"),
  emailAddressField: async ({ page }, use) => {
    await use(page.getByLabel("Email address"));
  },
  inviteButton: async ({ page }, use) => {
    await use(page.getByRole("button", { name: "Invite" }));
  },
});

newInviteTest("Requires authentication", async ({ requiresAuthentication }) => {
  await requiresAuthentication("/organizations/1/invite-member");
});

newInviteTest(
  "Editors cannot view invite page",
  async ({ page, org, signInAs }) => {
    await signInAs(org.editor);
    await page.goto(`/organizations/${org.id}/invite-member`);
    await expect(page.getByText("Organization not found")).toBeVisible();
  },
);

newInviteTest(
  "Readers cannot view invite page",
  async ({ page, org, signInAs }) => {
    await signInAs(org.reader);
    await page.goto(`/organizations/${org.id}/invite-member`);
    await expect(page.getByText("Organization not found")).toBeVisible();
  },
);

newInviteTest(
  "Admins can view invite page",
  async ({ page, org, signInAs }) => {
    await signInAs(org.admin);
    await page.goto(`/organizations/${org.id}/invite-member`);
    await expect(
      page.getByRole("heading", {
        name: `Invite a member to ${org.display_name}`,
      }),
    ).toBeVisible();
  },
);

newInviteTest(
  "Admins can remove pending invites",
  async ({
    page,
    org,
    signInAs,
    invitedUser,
    emailAddressField,
    inviteButton,
  }) => {
    await signInAs(org.admin);
    await page.goto(`/organizations/${org.id}/invite-member`);
    await expect(
      page.getByRole("heading", {
        name: `Invite a member to ${org.display_name}`,
      }),
    ).toBeVisible();
    await emailAddressField.fill(invitedUser.email_address);
    await inviteButton.click();
    await expect(
      page.getByText(
        `Invited ${invitedUser.email_address} to join this organization`,
      ),
    ).toBeVisible();
    await page
      .getByRole("button", {
        name: `Delete  ${invitedUser.email_address} from ${org.display_name}`,
      })
      .first()
      .click();
    await expect(
      page.getByText("Are you sure? This action cannot be undone").first(),
    ).toBeVisible();
    await page.getByRole("button", { name: "Delete invite" }).last().click();

    await expect(
      page.getByRole("heading", {
        name: `Organization: ${org.display_name}`,
      }),
    ).toBeVisible();
  },
);
newInviteTest(
  "Invitations are delivered",
  async ({
    page,
    invitedUser,
    orgInvitedTo,
    signInAs,
    signOut,
    emailAddressField,
    inviteButton,
    waitForEmail,
  }) => {
    await signInAs(orgInvitedTo.admin);

    await page.goto(`/organizations/${orgInvitedTo.id}/invite-member`);

    await emailAddressField.fill(invitedUser.email_address);
    await inviteButton.click();

    await waitForEmail(
      invitedUser.email_address,
      `[Editframe] You're invited to join ${orgInvitedTo.display_name}`,
    );

    await signOut();

    await page.getByRole("link", { name: "View invitation" }).click();

    await expect(
      page.getByRole("link", { name: "Login to accept" }),
    ).toBeVisible();
  },
);

newInviteTest(
  "Invitations are delivered to a new user",
  async ({
    page,
    invitedUser,
    orgInvitedTo,
    signInAs,
    signOut,
    emailAddressField,
    inviteButton,
    waitForEmail,
  }) => {
    await signInAs(orgInvitedTo.admin);

    await page.goto(`/organizations/${orgInvitedTo.id}/invite-member`);

    await emailAddressField.fill(`new-${invitedUser.email_address}`);
    await inviteButton.click();

    await waitForEmail(
      `new-${invitedUser.email_address}`,
      `[Editframe] You're invited to join ${orgInvitedTo.display_name}`,
    );

    await signOut();

    await page.getByRole("link", { name: "View invitation" }).click();

    await page
      .getByRole("link", { name: "Create an account to accept" })
      .click();

    await page.getByLabel("Password", { exact: true }).fill("password123");
    await page.getByLabel("Confirm password").fill("password123");

    await page.getByRole("button", { name: "Register" }).click();
    await page.getByRole("button", { name: "Accept" }).click();
    await expect(
      page.getByRole("heading", {
        name: `Organization: ${orgInvitedTo.display_name}`,
      }),
    ).toBeVisible();
  },
);
newInviteTest(
  "Invitations are delivered to a new user with an existing member email",
  async ({
    page,
    invitedUser,
    orgInvitedTo,
    signInAs,
    signOut,
    emailAddressField,
    inviteButton,
    waitForEmail,
  }) => {
    await signInAs(orgInvitedTo.admin);

    await page.goto(`/organizations/${orgInvitedTo.id}/invite-member`);
    const memberEmail = `new-${invitedUser.email_address}`;

    await emailAddressField.fill(memberEmail);
    await inviteButton.click();

    await waitForEmail(
      memberEmail,
      `[Editframe] You're invited to join ${orgInvitedTo.display_name}`,
    );

    await signOut();

    await page.getByRole("link", { name: "View invitation" }).click();

    await page
      .getByRole("link", { name: "Create an account to accept" })
      .click();

    await page.getByLabel("Password", { exact: true }).fill("password123");
    await page.getByLabel("Confirm password").fill("password123");

    await page.getByRole("button", { name: "Register" }).click();
    await page.getByRole("button", { name: "Accept" }).click();
    await expect(
      page.getByRole("heading", {
        name: `Organization: ${orgInvitedTo.display_name}`,
      }),
    ).toBeVisible();
    await page.goto(`/organizations/${orgInvitedTo.id}/invite-member`);

    await emailAddressField.fill(memberEmail);
    await inviteButton.click();
    await expect(
      page.getByText(`${memberEmail} is already a member of this organization`),
    ).toBeVisible();
  },
);
newInviteTest(
  "Resend invitation to a user",
  async ({
    page,
    invitedUser,
    orgInvitedTo,
    signInAs,
    emailAddressField,
    inviteButton,
    waitForEmail,
  }) => {
    await signInAs(orgInvitedTo.admin);

    await page.goto(`/organizations/${orgInvitedTo.id}/invite-member`);
    const memberEmail = `new-${invitedUser.email_address}`;

    await emailAddressField.fill(memberEmail);
    await inviteButton.click();

    await waitForEmail(
      memberEmail,
      `[Editframe] You're invited to join ${orgInvitedTo.display_name}`,
    );

    await page.goto(`/organizations/${orgInvitedTo.id}`);

    await page
      .getByRole("button", {
        name: `Resend  ${memberEmail} from ${orgInvitedTo.display_name}`,
      })
      .first()
      .click();
    await page.getByRole("button", { name: "Resend invite" }).click();

    await expect(
      page.getByText(`Invitation resent to ${memberEmail}`),
    ).toBeVisible();

    await waitForEmail(
      memberEmail,
      `[Editframe] You're invited to join ${orgInvitedTo.display_name}`,
    );
  },
);

async function safeInviteUser(
  emailAddress: string,
  role: string,
  orgId: string,
  creatorId: string,
) {
  const invite = await db
    .insertInto("identity.invites")
    .values({
      email_address: emailAddress,
      role,
      org_id: orgId,
      creator_id: creatorId,
    })
    .onConflict((c) => c.doNothing())
    .returningAll()
    .executeTakeFirstOrThrow();

  return invite;
}

const rsvpTest = test.extend<{
  orgInvitedTo: OrgFixture;

  invitedUser: Selectable<IdentityEmailPasswords>;
  userInvitation: Selectable<IdentityInvites>;

  anonymousInvitation: Selectable<IdentityInvites>;

  otherUser: Selectable<IdentityEmailPasswords>;

  acceptedInvitation: Selectable<IdentityInvites>;
  userWhoDenied: Selectable<IdentityEmailPasswords>;

  deniedInvitation: Selectable<IdentityInvites>;
  userWhoAccepted: Selectable<IdentityEmailPasswords>;
  emailAddressField: Locator;
  inviteButton: Locator;
}>({
  invitedUser: makeUserFixture("has-invitation"),
  otherUser: makeUserFixture("lacks-invitation"),
  orgInvitedTo: makeOrgFixture("invited-to-org"),
  userInvitation: async ({ orgInvitedTo, invitedUser }, use) => {
    await use(
      await safeInviteUser(
        invitedUser.email_address,
        "admin",
        String(orgInvitedTo.id),
        String(orgInvitedTo.admin.user_id),
      ),
    );
  },
  anonymousInvitation: async ({ orgInvitedTo }, use) => {
    await use(
      await safeInviteUser(
        "not-registered@example.org",
        "admin",
        String(orgInvitedTo.id),
        String(orgInvitedTo.admin.user_id),
      ),
    );
  },
  userWhoAccepted: makeUserFixture("accepted-invitation"),
  acceptedInvitation: async ({ orgInvitedTo, userWhoAccepted }, use) => {
    const invite = await safeInviteUser(
      userWhoAccepted.email_address,
      "admin",
      String(orgInvitedTo.id),
      String(orgInvitedTo.admin.user_id),
    );

    await db
      .updateTable("identity.invites")
      .set({
        accepted_at: sql`now()`,
      })
      .where("id", "=", invite.id)
      .execute();

    await use(invite);
  },

  userWhoDenied: makeUserFixture("denied-invitation"),
  deniedInvitation: async ({ orgInvitedTo, userWhoDenied }, use) => {
    const invite = await safeInviteUser(
      userWhoDenied.email_address,
      "admin",
      String(orgInvitedTo.id),
      String(orgInvitedTo.admin.user_id),
    );

    await db
      .updateTable("identity.invites")
      .set({
        denied_at: sql`now()`,
      })
      .where("id", "=", invite.id)
      .execute();

    await use(invite);
  },
  emailAddressField: async ({ page }, use) => {
    await use(page.getByLabel("Email address"));
  },
  inviteButton: async ({ page }, use) => {
    await use(page.getByRole("button", { name: "Invite" }));
  },
});

rsvpTest(
  "Athenticated invited user can accept invitation",
  async ({ page, signInAs, invitedUser, userInvitation, orgInvitedTo }) => {
    await signInAs(invitedUser);
    await page.goto(`/invitation/${userInvitation.invite_token}`);
    await page.getByRole("button", { name: "Accept" }).click();
    await expect(
      page.getByRole("heading", {
        name: `Organization: ${orgInvitedTo.display_name}`,
      }),
    ).toBeVisible();
  },
);

rsvpTest(
  "Athenticated invited user can deny invitation",
  async ({ page, signInAs, invitedUser, userInvitation }) => {
    await signInAs(invitedUser);
    await page.goto(`/invitation/${userInvitation.invite_token}`);
    await page.getByRole("button", { name: "Deny" }).click();
    await expect(page.getByText("Welcome has-invitation-")).toBeVisible();
  },
);

rsvpTest(
  "Deny sets denied_at, not accepted_at",
  async ({ page, signInAs, invitedUser, userInvitation }) => {
    await signInAs(invitedUser);
    await page.goto(`/invitation/${userInvitation.invite_token}`);
    await page.getByRole("button", { name: "Deny" }).click();

    const invite = await db
      .selectFrom("identity.invites")
      .where("id", "=", userInvitation.id)
      .select(["accepted_at", "denied_at"])
      .executeTakeFirst();

    expect(invite!.denied_at).not.toBeNull();
    expect(invite!.accepted_at).toBeNull();
  },
);
rsvpTest(
  "An authenticated user can remove an member",
  async ({ page, signInAs, invitedUser, userInvitation, orgInvitedTo }) => {
    await signInAs(invitedUser);
    await page.goto(`/invitation/${userInvitation.invite_token}`);
    await page.getByRole("button", { name: "Accept" }).click();
    await expect(
      page.getByRole("heading", {
        name: `Organization: ${orgInvitedTo.display_name}`,
      }),
    ).toBeVisible();

    await page.goto("/auth/logout}");

    await signInAs(orgInvitedTo.admin);

    await page.goto(`/organizations/${orgInvitedTo.id}`);
    await page
      .getByRole("button", {
        name: `Delete ${invitedUser.email_address} from ${orgInvitedTo.display_name}`,
      })
      .first()
      .click();
    await page.getByRole("button", { name: "Delete Member" }).click();
    await expect(
      page.getByRole("heading", {
        name: `Organization: ${orgInvitedTo.display_name}`,
      }),
    ).toBeVisible();

    await expect(
      page.getByText(`${invitedUser.email_address} member deleted
`),
    ).toBeVisible();
  },
);
rsvpTest(
  "An authenticated admin user can see the pending invites",
  async ({
    page,
    signInAs,
    invitedUser,
    userInvitation,
    orgInvitedTo,
    emailAddressField,
    inviteButton,
  }) => {
    await signInAs(invitedUser);
    await page.goto(`/invitation/${userInvitation.invite_token}`);
    await page.getByRole("button", { name: "Accept" }).click();
    await expect(
      page.getByRole("heading", {
        name: `Organization: ${orgInvitedTo.display_name}`,
      }),
    ).toBeVisible();

    await page.goto(`/organizations/${orgInvitedTo.id}/invite-member`);

    await emailAddressField.fill(`new-${invitedUser.email_address}`);
    await inviteButton.click();

    await expect(
      page.getByRole("heading", {
        name: "Pending Invites",
      }),
    ).toBeVisible();
  },
);
rsvpTest(
  "Denies non-matching authenticated user",
  async ({ page, signInAs, userInvitation, otherUser }) => {
    await signInAs(otherUser);
    await page.goto(`/invitation/${userInvitation.invite_token}`);
    await expect(
      page.getByText("You are not authorized to access this invitation."),
    ).toBeVisible();
  },
);

rsvpTest(
  "Denies access to previously accepted invitation",
  async ({ page, acceptedInvitation, userWhoAccepted, signInAs }) => {
    await signInAs(userWhoAccepted);
    await page.goto(`/invitation/${acceptedInvitation.invite_token}`);
    await expect(
      page.getByText(
        "The invitation you are trying to access has already been accepted or denied.",
      ),
    ).toBeVisible();
  },
);

rsvpTest(
  "Denies access to previously denied invitation",
  async ({ page, deniedInvitation, userWhoDenied, signInAs }) => {
    await signInAs(userWhoDenied);
    await page.goto(`/invitation/${deniedInvitation.invite_token}`);
    await expect(
      page.getByText(
        "The invitation you are trying to access has already been accepted or denied.",
      ),
    ).toBeVisible();
  },
);

rsvpTest(
  "Non-registered are offered to register",
  async ({ page, anonymousInvitation }) => {
    await page.goto(`/invitation/${anonymousInvitation.invite_token}`);
    await expect(
      page.getByRole("link", { name: "Create an account to accept" }),
    ).toBeVisible();
  },
);

rsvpTest(
  "Non-authenticated are offered to login",
  async ({ page, userInvitation }) => {
    await page.goto(`/invitation/${userInvitation.invite_token}`);
    await expect(
      page.getByRole("link", { name: "Login to accept" }),
    ).toBeVisible();
  },
);

rsvpTest(
  "Expired invite (>30 days) is not found",
  async ({ page, signInAs, invitedUser, userInvitation }) => {
    await db
      .updateTable("identity.invites")
      .set({ created_at: sql`now() - interval '31 days'` })
      .where("id", "=", userInvitation.id)
      .execute();

    await signInAs(invitedUser);
    await page.goto(`/invitation/${userInvitation.invite_token}`);
    await expect(
      page.getByText(
        "The invitation you are trying to access does not exist.",
      ),
    ).toBeVisible();
  },
);
