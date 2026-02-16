import { describe, test, expect, beforeAll } from "vitest";
import { db } from "@/sql-client.server";
import { sql } from "kysely";
import {
  setupBrowser,
  getPage,
  signInAs,
  signOut,
  waitForEmail,
  requiresAuthentication,
  createUniqueUser,
  createOrgFixture,
  playwrightExpect,
  type OrgFixture,
} from "./setup";

setupBrowser();

async function safeInviteUser(
  emailAddress: string,
  role: string,
  orgId: string,
  creatorId: string,
) {
  return db
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
}

describe.skip("invite member - permissions", () => {
  let org: OrgFixture;

  beforeAll(async () => {
    org = await createOrgFixture("invite-perm");
  });

  test("Requires authentication", async () => {
    await requiresAuthentication("/organizations/1/invite-member");
  });

  test("Editors cannot view invite page", async () => {
    const page = getPage();
    await signInAs(org.editor);
    await page.goto(`/organizations/${org.id}/invite-member`);
    await playwrightExpect(
      page.getByText("Organization not found"),
    ).toBeVisible();
  });

  test("Readers cannot view invite page", async () => {
    const page = getPage();
    await signInAs(org.reader);
    await page.goto(`/organizations/${org.id}/invite-member`);
    await playwrightExpect(
      page.getByText("Organization not found"),
    ).toBeVisible();
  });

  test("Admins can view invite page", async () => {
    const page = getPage();
    await signInAs(org.admin);
    await page.goto(`/organizations/${org.id}/invite-member`);
    await playwrightExpect(
      page.getByRole("heading", {
        name: `Invite a member to ${org.display_name}`,
      }),
    ).toBeVisible();
  });
});

describe.skip("invite member - send invites", () => {
  test("Admins can remove pending invites", async () => {
    const org = await createOrgFixture("rm-invite");
    const invitedUser = await createUniqueUser("invitable");
    const page = getPage();

    await signInAs(org.admin);
    await page.goto(`/organizations/${org.id}/invite-member`);

    await playwrightExpect(
      page.getByRole("heading", {
        name: `Invite a member to ${org.display_name}`,
      }),
    ).toBeVisible();

    await page.getByLabel("Email address").fill(invitedUser.email_address);
    await page.getByRole("button", { name: "Invite" }).click();

    await playwrightExpect(
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

    await playwrightExpect(
      page.getByText("Are you sure? This action cannot be undone").first(),
    ).toBeVisible();

    await page.getByRole("button", { name: "Delete invite" }).last().click();

    await playwrightExpect(
      page.getByRole("heading", {
        name: `Organization: ${org.display_name}`,
      }),
    ).toBeVisible();
  });

  test("Invitations are delivered", async () => {
    const orgInvitedTo = await createOrgFixture("deliver");
    const invitedUser = await createUniqueUser("invitable");
    const page = getPage();

    await signInAs(orgInvitedTo.admin);
    await page.goto(`/organizations/${orgInvitedTo.id}/invite-member`);
    await page.getByLabel("Email address").fill(invitedUser.email_address);
    await page.getByRole("button", { name: "Invite" }).click();

    await waitForEmail(
      invitedUser.email_address,
      `[Editframe] You're invited to join ${orgInvitedTo.display_name}`,
    );

    await signOut();
    await page.getByRole("link", { name: "View invitation" }).click();

    await playwrightExpect(
      page.getByRole("link", { name: "Login to accept" }),
    ).toBeVisible();
  });

  test("Invitations are delivered to a new user", async () => {
    const orgInvitedTo = await createOrgFixture("deliver-new");
    const invitedUser = await createUniqueUser("invitable");
    const page = getPage();

    await signInAs(orgInvitedTo.admin);
    await page.goto(`/organizations/${orgInvitedTo.id}/invite-member`);

    await page
      .getByLabel("Email address")
      .fill(`new-${invitedUser.email_address}`);
    await page.getByRole("button", { name: "Invite" }).click();

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

    await playwrightExpect(
      page.getByRole("heading", {
        name: `Organization: ${orgInvitedTo.display_name}`,
      }),
    ).toBeVisible();
  });

  test("Invitations are delivered to a new user with an existing member email", async () => {
    const orgInvitedTo = await createOrgFixture("deliver-exist");
    const invitedUser = await createUniqueUser("invitable");
    const page = getPage();

    await signInAs(orgInvitedTo.admin);
    await page.goto(`/organizations/${orgInvitedTo.id}/invite-member`);
    const memberEmail = `new-${invitedUser.email_address}`;

    await page.getByLabel("Email address").fill(memberEmail);
    await page.getByRole("button", { name: "Invite" }).click();

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

    await playwrightExpect(
      page.getByRole("heading", {
        name: `Organization: ${orgInvitedTo.display_name}`,
      }),
    ).toBeVisible();

    await page.goto(`/organizations/${orgInvitedTo.id}/invite-member`);
    await page.getByLabel("Email address").fill(memberEmail);
    await page.getByRole("button", { name: "Invite" }).click();

    await playwrightExpect(
      page.getByText(
        `${memberEmail} is already a member of this organization`,
      ),
    ).toBeVisible();
  });

  test("Resend invitation to a user", async () => {
    const orgInvitedTo = await createOrgFixture("resend");
    const invitedUser = await createUniqueUser("invitable");
    const page = getPage();

    await signInAs(orgInvitedTo.admin);
    await page.goto(`/organizations/${orgInvitedTo.id}/invite-member`);
    const memberEmail = `new-${invitedUser.email_address}`;

    await page.getByLabel("Email address").fill(memberEmail);
    await page.getByRole("button", { name: "Invite" }).click();

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

    await playwrightExpect(
      page.getByText(`Invitation resent to ${memberEmail}`),
    ).toBeVisible();

    await waitForEmail(
      memberEmail,
      `[Editframe] You're invited to join ${orgInvitedTo.display_name}`,
    );
  });
});

describe("invite member - RSVP", () => {
  test.skip("Authenticated invited user can accept invitation", async () => {
    const orgInvitedTo = await createOrgFixture("rsvp-accept");
    const invitedUser = await createUniqueUser("has-invitation");
    const invite = await safeInviteUser(
      invitedUser.email_address,
      "admin",
      String(orgInvitedTo.id),
      String(orgInvitedTo.admin.user_id),
    );
    const page = getPage();

    await signInAs(invitedUser);
    await page.goto(`/invitation/${invite.invite_token}`);
    await page.getByRole("button", { name: "Accept" }).click();

    await playwrightExpect(
      page.getByRole("heading", {
        name: `Organization: ${orgInvitedTo.display_name}`,
      }),
    ).toBeVisible();
  });

  test("Authenticated invited user can deny invitation", async () => {
    const orgInvitedTo = await createOrgFixture("rsvp-deny");
    const invitedUser = await createUniqueUser("has-invitation");
    const invite = await safeInviteUser(
      invitedUser.email_address,
      "admin",
      String(orgInvitedTo.id),
      String(orgInvitedTo.admin.user_id),
    );
    const page = getPage();

    await signInAs(invitedUser);
    await page.goto(`/invitation/${invite.invite_token}`);
    await page.getByRole("button", { name: "Deny" }).click();
    await playwrightExpect(
      page.getByRole("heading", { name: "Welcome" }),
    ).toBeVisible();
  });

  test("Deny sets denied_at, not accepted_at", async () => {
    const orgInvitedTo = await createOrgFixture("rsvp-deny-at");
    const invitedUser = await createUniqueUser("has-invitation");
    const invite = await safeInviteUser(
      invitedUser.email_address,
      "admin",
      String(orgInvitedTo.id),
      String(orgInvitedTo.admin.user_id),
    );
    const page = getPage();

    await signInAs(invitedUser);
    await page.goto(`/invitation/${invite.invite_token}`);
    await page.getByRole("button", { name: "Deny" }).click();
    await playwrightExpect(
      page.getByRole("heading", { name: "Welcome" }),
    ).toBeVisible();

    const inviteResult = await db
      .selectFrom("identity.invites")
      .where("id", "=", invite.id)
      .select(["accepted_at", "denied_at"])
      .executeTakeFirst();

    expect(inviteResult!.denied_at).not.toBeNull();
    expect(inviteResult!.accepted_at).toBeNull();
  });

  test.skip("An authenticated user can remove a member", async () => {
    const orgInvitedTo = await createOrgFixture("rsvp-rm");
    const invitedUser = await createUniqueUser("has-invitation");
    const invite = await safeInviteUser(
      invitedUser.email_address,
      "admin",
      String(orgInvitedTo.id),
      String(orgInvitedTo.admin.user_id),
    );
    const page = getPage();

    await signInAs(invitedUser);
    await page.goto(`/invitation/${invite.invite_token}`);
    await page.getByRole("button", { name: "Accept" }).click();

    await playwrightExpect(
      page.getByRole("heading", {
        name: `Organization: ${orgInvitedTo.display_name}`,
      }),
    ).toBeVisible();

    await signOut();
    await signInAs(orgInvitedTo.admin);

    await page.goto(`/organizations/${orgInvitedTo.id}`);
    await page
      .getByRole("button", {
        name: `Delete ${invitedUser.email_address} from ${orgInvitedTo.display_name}`,
      })
      .first()
      .click();
    await page.getByRole("button", { name: "Delete Member" }).click();

    await playwrightExpect(
      page.getByRole("heading", {
        name: `Organization: ${orgInvitedTo.display_name}`,
      }),
    ).toBeVisible();

    await playwrightExpect(
      page.getByText(`${invitedUser.email_address} member deleted`),
    ).toBeVisible();
  });

  test.skip("An authenticated admin user can see the pending invites", async () => {
    const orgInvitedTo = await createOrgFixture("rsvp-pending");
    const invitedUser = await createUniqueUser("has-invitation");
    const invite = await safeInviteUser(
      invitedUser.email_address,
      "admin",
      String(orgInvitedTo.id),
      String(orgInvitedTo.admin.user_id),
    );
    const page = getPage();

    await signInAs(invitedUser);
    await page.goto(`/invitation/${invite.invite_token}`);
    await page.getByRole("button", { name: "Accept" }).click();

    await playwrightExpect(
      page.getByRole("heading", {
        name: `Organization: ${orgInvitedTo.display_name}`,
      }),
    ).toBeVisible();

    await page.goto(`/organizations/${orgInvitedTo.id}/invite-member`);
    await page
      .getByLabel("Email address")
      .fill(`new-${invitedUser.email_address}`);
    await page.getByRole("button", { name: "Invite" }).click();

    await playwrightExpect(
      page.getByRole("heading", { name: "Pending Invites" }),
    ).toBeVisible();
  });

  test("Denies non-matching authenticated user", async () => {
    const orgInvitedTo = await createOrgFixture("rsvp-other");
    const invitedUser = await createUniqueUser("has-invitation");
    const otherUser = await createUniqueUser("lacks-invitation");
    const invite = await safeInviteUser(
      invitedUser.email_address,
      "admin",
      String(orgInvitedTo.id),
      String(orgInvitedTo.admin.user_id),
    );
    const page = getPage();

    await signInAs(otherUser);
    await page.goto(`/invitation/${invite.invite_token}`);

    await playwrightExpect(
      page.getByText("You are not authorized to access this invitation."),
    ).toBeVisible();
  });

  test("Denies access to previously accepted invitation", async () => {
    const orgInvitedTo = await createOrgFixture("rsvp-accepted");
    const userWhoAccepted = await createUniqueUser("accepted-invitation");
    const invite = await safeInviteUser(
      userWhoAccepted.email_address,
      "admin",
      String(orgInvitedTo.id),
      String(orgInvitedTo.admin.user_id),
    );
    await db
      .updateTable("identity.invites")
      .set({ accepted_at: sql`now()` })
      .where("id", "=", invite.id)
      .execute();
    const page = getPage();

    await signInAs(userWhoAccepted);
    await page.goto(`/invitation/${invite.invite_token}`);

    await playwrightExpect(
      page.getByText(
        "The invitation you are trying to access has already been accepted or denied.",
      ),
    ).toBeVisible();
  });

  test("Denies access to previously denied invitation", async () => {
    const orgInvitedTo = await createOrgFixture("rsvp-denied");
    const userWhoDenied = await createUniqueUser("denied-invitation");
    const invite = await safeInviteUser(
      userWhoDenied.email_address,
      "admin",
      String(orgInvitedTo.id),
      String(orgInvitedTo.admin.user_id),
    );
    await db
      .updateTable("identity.invites")
      .set({ denied_at: sql`now()` })
      .where("id", "=", invite.id)
      .execute();
    const page = getPage();

    await signInAs(userWhoDenied);
    await page.goto(`/invitation/${invite.invite_token}`);

    await playwrightExpect(
      page.getByText(
        "The invitation you are trying to access has already been accepted or denied.",
      ),
    ).toBeVisible();
  });

  test("Non-registered are offered to register", async () => {
    const orgInvitedTo = await createOrgFixture("rsvp-anon");
    const invite = await safeInviteUser(
      "not-registered@example.org",
      "admin",
      String(orgInvitedTo.id),
      String(orgInvitedTo.admin.user_id),
    );
    const page = getPage();

    await page.goto(`/invitation/${invite.invite_token}`);

    await playwrightExpect(
      page.getByRole("link", { name: "Create an account to accept" }),
    ).toBeVisible();
  });

  test("Non-authenticated are offered to login", async () => {
    const orgInvitedTo = await createOrgFixture("rsvp-login");
    const invitedUser = await createUniqueUser("has-invitation");
    const invite = await safeInviteUser(
      invitedUser.email_address,
      "admin",
      String(orgInvitedTo.id),
      String(orgInvitedTo.admin.user_id),
    );
    const page = getPage();

    await page.goto(`/invitation/${invite.invite_token}`);

    await playwrightExpect(
      page.getByRole("link", { name: "Login to accept" }),
    ).toBeVisible();
  });

  test("Expired invite (>30 days) is not found", async () => {
    const orgInvitedTo = await createOrgFixture("rsvp-expired");
    const invitedUser = await createUniqueUser("has-invitation");
    const invite = await safeInviteUser(
      invitedUser.email_address,
      "admin",
      String(orgInvitedTo.id),
      String(orgInvitedTo.admin.user_id),
    );
    await db
      .updateTable("identity.invites")
      .set({ created_at: sql`now() - interval '31 days'` })
      .where("id", "=", invite.id)
      .execute();
    const page = getPage();

    await signInAs(invitedUser);
    await page.goto(`/invitation/${invite.invite_token}`);

    await playwrightExpect(
      page.getByText(
        "The invitation you are trying to access does not exist.",
      ),
    ).toBeVisible();
  });
});
