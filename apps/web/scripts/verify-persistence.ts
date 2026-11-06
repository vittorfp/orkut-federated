import { closeDatabase, getSqlClient } from "../src/db/client";
import { getInvitationService } from "../src/domain/invitations/service";
import { auth } from "../src/lib/auth";

type ConstraintError = Error & {
  constraint_name?: string;
};

async function expectConstraint(
  expected: string,
  operation: () => Promise<unknown>,
): Promise<void> {
  try {
    await operation();
  } catch (error) {
    if ((error as ConstraintError).constraint_name === expected) return;
    throw error;
  }
  throw new Error(`expected PostgreSQL constraint ${expected} to reject the operation`);
}

const sql = getSqlClient();
const suffix = crypto.randomUUID();
const firstUserId = `persistence-first-${suffix}`;
const secondUserId = `persistence-second-${suffix}`;
const firstEmail = `first-${suffix}@example.test`;
const secondEmail = `second-${suffix}@example.test`;
const handle = `test_${suffix.replaceAll("-", "").slice(0, 16)}`;
const firstInvitationDigest = "a".repeat(64);
const secondInvitationDigest = "b".repeat(64);

try {
  await auth.api.getSession({ headers: new Headers() });

  let signUpRejected = false;
  try {
    await auth.api.signUpEmail({
      body: {
        email: `public-signup-${suffix}@example.test`,
        name: "Public Signup Must Fail",
        password: "test-password-that-is-never-logged",
      },
    });
  } catch {
    signUpRejected = true;
  }
  if (!signUpRejected) throw new Error("public email/password signup is enabled");

  await sql`
    insert into users (id, name, email, email_verified)
    values (${firstUserId}, 'First Test User', ${firstEmail}, true)
  `;
  await sql`insert into members (user_id) values (${firstUserId})`;
  await sql`
    insert into profiles (user_id, handle, public_name)
    values (${firstUserId}, ${handle}, 'First Test User')
  `;

  await sql`update profiles set bio = 'Mutable bio' where user_id = ${firstUserId}`;
  const [updatedProfile] = await sql<
    { bio: string }[]
  >`select bio from profiles where user_id = ${firstUserId}`;
  if (updatedProfile?.bio !== "Mutable bio") {
    throw new Error("mutable profile fields did not update");
  }

  await expectConstraint(
    "profiles_handle_immutable",
    () =>
      sql`update profiles set handle = ${`${handle}_new`} where user_id = ${firstUserId}`,
  );

  await sql`
    insert into users (id, name, email, email_verified)
    values (${secondUserId}, 'Second Test User', ${secondEmail}, true)
  `;
  await sql`insert into members (user_id) values (${secondUserId})`;

  await expectConstraint(
    "profiles_handle_unique",
    () =>
      sql`
      insert into profiles (user_id, handle, public_name)
      values (${secondUserId}, ${handle}, 'Duplicate Handle')
    `,
  );

  await expectConstraint(
    "profiles_handle_normalized",
    () =>
      sql`
      insert into profiles (user_id, handle, public_name)
      values (${secondUserId}, 'UPPER_case', 'Uppercase Handle')
    `,
  );

  await expectConstraint(
    "members_user_id_users_id_fk",
    () => sql`insert into members (user_id) values (${`missing-${suffix}`})`,
  );

  const [createdInvitation] = await sql<{ id: string }[]>`
    insert into invitations (code_digest, inviter_user_id, max_uses, expires_at)
    values (${firstInvitationDigest}, ${firstUserId}, 2, now() + interval '1 day')
    returning id
  `;
  if (!createdInvitation) throw new Error("valid invitation was not created");
  const firstInvitationId = createdInvitation.id;

  await expectConstraint(
    "invitations_code_digest_format",
    () => sql`
      insert into invitations (code_digest, inviter_user_id, expires_at)
      values ('not-a-digest', ${firstUserId}, now() + interval '1 day')
    `,
  );

  await expectConstraint(
    "invitations_max_uses_range",
    () => sql`
      insert into invitations (code_digest, inviter_user_id, max_uses, expires_at)
      values (${"c".repeat(64)}, ${firstUserId}, 0, now() + interval '1 day')
    `,
  );

  await expectConstraint(
    "invitations_use_count_range",
    () => sql`
      update invitations set use_count = 3 where id = ${firstInvitationId}
    `,
  );

  await expectConstraint(
    "invitations_expiry_after_creation",
    () => sql`
      insert into invitations (code_digest, inviter_user_id, expires_at)
      values (${"d".repeat(64)}, ${firstUserId}, now() - interval '1 day')
    `,
  );

  await expectConstraint(
    "invitations_revocation_after_creation",
    () => sql`
      update invitations
      set revoked_at = created_at - interval '1 second'
      where id = ${firstInvitationId}
    `,
  );

  await expectConstraint(
    "invitations_code_digest_unique",
    () => sql`
      insert into invitations (code_digest, inviter_user_id, expires_at)
      values (${firstInvitationDigest}, ${firstUserId}, now() + interval '1 day')
    `,
  );

  await sql`
    insert into invitation_redemptions (invitation_id, user_id)
    values (${firstInvitationId}, ${secondUserId})
  `;

  const [secondInvitation] = await sql<{ id: string }[]>`
    insert into invitations (code_digest, inviter_user_id, expires_at)
    values (${secondInvitationDigest}, ${firstUserId}, now() + interval '1 day')
    returning id
  `;
  if (!secondInvitation) throw new Error("second valid invitation was not created");

  await expectConstraint(
    "invitation_redemptions_user_unique",
    () => sql`
      insert into invitation_redemptions (invitation_id, user_id)
      values (${secondInvitation.id}, ${secondUserId})
    `,
  );

  const invitationService = getInvitationService();
  const serviceIssued = await invitationService.issue({
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    inviterUserId: firstUserId,
  });
  const [storedServiceInvitation] = await sql<{ code_digest: string }[]>`
    select code_digest from invitations where id = ${serviceIssued.invitation.id}
  `;
  if (
    !storedServiceInvitation ||
    storedServiceInvitation.code_digest === serviceIssued.code
  ) {
    throw new Error("invitation service persisted a plaintext code");
  }
  if (!(await invitationService.preview(serviceIssued.code)).available) {
    throw new Error("new invitation was not available to preview");
  }
  if (
    !(await invitationService.revoke({
      invitationId: serviceIssued.invitation.id,
      inviterUserId: firstUserId,
    }))
  ) {
    throw new Error("invitation owner could not revoke an active invitation");
  }
  if ((await invitationService.preview(serviceIssued.code)).available) {
    throw new Error("revoked invitation remained available");
  }

  process.stdout.write("persistence invariants: ok\n");
} finally {
  await sql`delete from invitations where inviter_user_id = ${firstUserId}`;
  await sql`delete from users where id in (${firstUserId}, ${secondUserId})`;
  await closeDatabase();
}
