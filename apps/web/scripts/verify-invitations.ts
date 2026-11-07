import { closeDatabase, getSqlClient } from "../src/db/client";
import { digestInvitationCode } from "../src/domain/invitations/code";
import { getInvitationService } from "../src/domain/invitations/service";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const sql = getSqlClient();
const suffix = crypto.randomUUID().replaceAll("-", "").slice(0, 12);
const hashKey = process.env.INVITATION_HASH_KEY;
assert(hashKey, "INVITATION_HASH_KEY is required");
const invitationHashKey: string = hashKey;
const service = getInvitationService();
const ownerId = `invitation-owner-${suffix}`;
const otherId = `invitation-other-${suffix}`;

try {
  for (const [id, label] of [
    [ownerId, "owner"],
    [otherId, "other"],
  ] as const) {
    await sql`
      insert into users (id, name, email, email_verified)
      values (${id}, ${`Invitation ${label}`}, ${`invitation-${label}-${suffix}@example.test`}, true)
    `;
    await sql`insert into members (user_id) values (${id})`;
  }

  const issued = await service.issue({
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    inviterUserId: ownerId,
    maxUses: 2,
  });

  // Only the owner sees metadata, and the payload never carries a digest.
  const ownerList = await service.listOwned(ownerId);
  assert(ownerList.length === 1, "owner did not see the issued invitation");
  const listed = ownerList[0];
  assert(listed?.id === issued.invitation.id, "owner list returned the wrong invitation");
  assert(listed.status === "available", "new invitation was not listed as available");
  assert(listed.useCount === 0 && listed.maxUses === 2, "use counts drifted");
  const serialized = JSON.stringify(ownerList);
  assert(!serialized.includes(issued.code), "plaintext invitation code reached the list");
  assert(!serialized.includes("digest"), "invitation digest reached the list");
  assert(
    (await service.listOwned(otherId)).length === 0,
    "another member listed the invitation",
  );

  // The stored value is the keyed digest, never the plaintext code.
  const [stored] = await sql<{ code_digest: string }[]>`
    select code_digest from invitations where id = ${issued.invitation.id}
  `;
  assert(stored, "stored invitation was not found");
  assert(stored.code_digest !== issued.code, "plaintext invitation code was stored");
  assert(
    stored.code_digest === digestInvitationCode(issued.code, invitationHashKey),
    "stored invitation digest did not match",
  );

  // Another member cannot revoke or infer the invitation's state.
  assert(
    (await service.revoke({
      invitationId: issued.invitation.id,
      inviterUserId: otherId,
    })) === false,
    "another member revoked the invitation",
  );
  assert(
    (await service.preview(issued.code)).available,
    "failed revoke closed the invitation",
  );

  // Revocation is idempotent and closes the code immediately.
  assert(
    (await service.revoke({
      invitationId: issued.invitation.id,
      inviterUserId: ownerId,
    })) === true,
    "owner could not revoke the invitation",
  );
  assert(
    (await service.revoke({
      invitationId: issued.invitation.id,
      inviterUserId: ownerId,
    })) === false,
    "repeated revocation was not idempotent",
  );
  assert(
    !(await service.preview(issued.code)).available,
    "revoked code stayed available",
  );
  const [relisted] = await service.listOwned(ownerId);
  assert(relisted?.status === "revoked", "owner list did not reflect revocation");

  process.stdout.write("invitation management invariants: ok\n");
} finally {
  await sql`delete from invitations where inviter_user_id in (${ownerId}, ${otherId})`;
  await sql`delete from users where id in (${ownerId}, ${otherId})`;
  await closeDatabase();
}
