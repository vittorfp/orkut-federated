import { closeDatabase, getSqlClient } from "../src/db/client";
import { revokeActiveInvitations } from "../src/domain/invitations/operator";
import {
  getRedemptionService,
  RedemptionError,
} from "../src/domain/invitations/redemption";
import { getInvitationService } from "../src/domain/invitations/service";
import {
  createDrizzleRateLimitStore,
  createRateLimiter,
  hashRateLimitValue,
  ipRangeKey,
} from "../src/lib/rate-limit";
import { pruneSecurityData } from "../src/lib/security-maintenance";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const sql = getSqlClient();
const suffix = crypto.randomUUID().replaceAll("-", "").slice(0, 12);
const hashKey = process.env.INVITATION_HASH_KEY;
assert(hashKey, "INVITATION_HASH_KEY is required");
const invitationHashKey: string = hashKey;
const inviterId = `abuse-inviter-${suffix}`;
const inviteeEmail = `abuse-invitee-${suffix}@example.test`;
const inviteeHandle = `abuse_${suffix.slice(0, 8)}`;
const secondEmail = `abuse-second-${suffix}@example.test`;
const secondHandle = `abuse2_${suffix.slice(0, 8)}`;
const password = "abuse-controls-password-123";
const clientIp = "203.0.113.42";
const testStart = new Date();
const invitationService = getInvitationService();
const redemptionService = getRedemptionService();
const invitationIds: string[] = [];
const userIds = new Set<string>([inviterId]);
const codeHashes = new Set<string>();

async function issue(maxUses: number) {
  const issued = await invitationService.issue({
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    inviterUserId: inviterId,
    maxUses,
  });
  invitationIds.push(issued.invitation.id);
  codeHashes.add(hashRateLimitValue(issued.code, invitationHashKey));
  return issued;
}

async function latestAudit(action: string) {
  const [event] = await sql<
    {
      action: string;
      actorUserId: string | null;
      detail: Record<string, unknown>;
      invitationId: string | null;
      outcome: string;
    }[]
  >`
    select
      action,
      actor_user_id as "actorUserId",
      detail,
      invitation_id as "invitationId",
      outcome
    from audit_events
    where action = ${action} and created_at >= ${testStart.toISOString()}::timestamptz
    order by created_at desc
    limit 1
  `;
  return event;
}

try {
  await sql`
    insert into users (id, name, email, email_verified)
    values (${inviterId}, 'Abuse Inviter', ${`abuse-inviter-${suffix}@example.test`}, true)
  `;
  await sql`insert into members (user_id) values (${inviterId})`;

  // Issuance records a success event with categorical detail only.
  const first = await issue(2);
  const issueEvent = await latestAudit("invitation.issue");
  assert(issueEvent?.outcome === "success", "successful issue was not audited");
  assert(issueEvent.actorUserId === inviterId, "issue audit lost the actor");
  assert(
    issueEvent.invitationId === first.invitation.id,
    "issue audit lost the invitation link",
  );
  assert(
    issueEvent.detail.maxUses === 2 &&
      typeof issueEvent.detail.expiresInHours === "number",
    "issue audit detail was not categorical",
  );
  assert(
    !JSON.stringify(issueEvent).includes(first.code),
    "issue audit leaked the plaintext code",
  );

  // Revocation records a success event.
  assert(
    (await invitationService.revoke({
      invitationId: first.invitation.id,
      inviterUserId: inviterId,
    })) === true,
    "test invitation was not revoked",
  );
  assert(
    (await latestAudit("invitation.revoke"))?.outcome === "success",
    "successful revoke was not audited",
  );

  // Successful redemption links the invited principal and the invitation.
  const redeemable = await issue(1);
  const redeemed = await redemptionService.redeem({
    clientIp,
    code: redeemable.code,
    email: inviteeEmail,
    handle: inviteeHandle,
    password,
    publicName: "Abuse Invitee",
  });
  userIds.add(redeemed.userId);
  const redemptionEvent = await latestAudit("invitation.redemption");
  assert(redemptionEvent?.outcome === "success", "successful redemption was not audited");
  assert(
    redemptionEvent.actorUserId === redeemed.userId,
    "redemption audit lost the invited principal",
  );
  assert(
    redemptionEvent.invitationId === redeemable.invitation.id,
    "redemption audit lost the invitation link",
  );
  const redemptionAudit = JSON.stringify(redemptionEvent);
  assert(
    !redemptionAudit.includes(redeemable.code) &&
      !redemptionAudit.includes(password) &&
      !redemptionAudit.includes(inviteeEmail),
    "redemption audit leaked a secret or email",
  );

  // Rejected categories are audited without the submitted values.
  const invalid = await redemptionService
    .redeem({
      code: "ofi_short",
      email: `invalid-${suffix}@example.test`,
      handle: `invalid_${suffix.slice(0, 8)}`,
      password,
      publicName: "Invalid",
    })
    .catch((caught: unknown) => caught);
  assert(
    invalid instanceof RedemptionError && invalid.code === "invitation_unavailable",
    "malformed code did not fail as unavailable",
  );
  const invalidEvent = await latestAudit("invitation.redemption");
  assert(
    invalidEvent?.outcome === "rejected" &&
      invalidEvent.detail.reason === "invitation_unavailable",
    "malformed code rejection was not audited",
  );
  assert(
    !JSON.stringify(invalidEvent).includes("ofi_short"),
    "rejected audit leaked the submitted code",
  );

  const reused = await redemptionService
    .redeem({
      code: redeemable.code,
      email: secondEmail,
      handle: secondHandle,
      password,
      publicName: "Reused",
    })
    .catch((caught: unknown) => caught);
  assert(
    reused instanceof RedemptionError && reused.code === "invitation_unavailable",
    "exhausted invitation was not rejected",
  );

  const multi = await issue(2);
  const second = await redemptionService.redeem({
    code: multi.code,
    email: secondEmail,
    handle: secondHandle,
    password,
    publicName: "Second Invitee",
  });
  userIds.add(second.userId);
  const conflict = await redemptionService
    .redeem({
      code: multi.code,
      email: secondEmail,
      handle: `${secondHandle}_b`,
      password,
      publicName: "Second Conflict",
    })
    .catch((caught: unknown) => caught);
  assert(
    conflict instanceof RedemptionError && conflict.code === "identity_conflict",
    "identity conflict was not rejected",
  );
  const conflictEvent = await latestAudit("invitation.redemption");
  assert(
    conflictEvent?.outcome === "rejected" &&
      conflictEvent.detail.reason === "identity_conflict",
    "identity conflict rejection was not audited",
  );

  // A direct limiter check proves the counter is atomic and the window works.
  const limiter = createRateLimiter({ store: createDrizzleRateLimitStore() });
  const limitKey = `verify-${suffix}`;
  const policy = {
    bucket: "verify.abuse",
    key: limitKey,
    limit: 2,
    windowSeconds: 60,
  };
  assert((await limiter.consume(policy)).allowed, "first limited call was blocked");
  assert((await limiter.consume(policy)).allowed, "second limited call was blocked");
  assert(!(await limiter.consume(policy)).allowed, "third limited call was allowed");
  const [counter] = await sql<{ count: number }[]>`
    select count from rate_limit_counters where key = ${`verify.abuse:${limitKey}`}
  `;
  assert(counter?.count === 3, "rate-limit counter did not reach three");

  const hashedIp = hashRateLimitValue(ipRangeKey(clientIp), invitationHashKey);
  assert(
    hashedIp.length === 64 && !hashedIp.includes(clientIp),
    "client address was not hashed",
  );

  // The scoped break-glass procedure closes every active invitation it owns.
  const breakGlassA = await issue(1);
  const breakGlassB = await issue(1);
  const revoked = await revokeActiveInvitations({ inviterUserId: inviterId });
  assert(revoked === 3, `break-glass revoked ${revoked} invitations, expected 3`);
  for (const invitation of [multi, breakGlassA, breakGlassB]) {
    const [row] = await sql<{ revokedAt: Date | null }[]>`
      select revoked_at as "revokedAt" from invitations where id = ${invitation.invitation.id}
    `;
    assert(row?.revokedAt !== null, "break-glass left an active invitation");
  }

  // Retention and expiry cleanup remove only old rows.
  await sql`
    insert into audit_events (action, outcome, detail, created_at)
    values ('invitation.issue', 'success', '{}'::jsonb, now() - interval '2 days')
  `;
  const expiredKey = `verify.expired:${suffix}`;
  await sql`
    insert into rate_limit_counters (key, window_started_at, count, expires_at)
    values (${expiredKey}, now() - interval '2 hours', 1, now() - interval '1 hour')
  `;
  const pruned = await pruneSecurityData({ auditRetentionDays: 1 });
  assert(pruned.auditEvents >= 1, "old audit events were not pruned");
  assert(pruned.rateLimitCounters >= 1, "expired counters were not pruned");
  const [expired] = await sql<{ count: number }[]>`
    select count(*)::int as count from rate_limit_counters where key = ${expiredKey}
  `;
  assert(expired?.count === 0, "expired counter survived pruning");

  process.stdout.write("invitation abuse control invariants: ok\n");
} finally {
  // Remove test rows in dependency order: audit, invitations (cascades
  // redemptions), memberships, then principals.
  for (const invitationId of invitationIds) {
    await sql`delete from audit_events where invitation_id = ${invitationId}`;
  }
  for (const userId of userIds) {
    await sql`delete from audit_events where actor_user_id = ${userId}`;
  }
  await sql`
    delete from audit_events
    where created_at >= ${testStart.toISOString()}::timestamptz
      and action = 'invitation.redemption'
      and outcome = 'rejected'
      and actor_user_id is null
      and invitation_id is null
  `;
  await sql`delete from invitations where inviter_user_id = ${inviterId}`;
  for (const userId of userIds) {
    await sql`delete from users where id = ${userId}`;
  }

  const counterKeys = [
    `invitation.issue.actor:${inviterId}`,
    `invitation.revoke.actor:${inviterId}`,
    "invitation.redemption.endpoint:global",
    `invitation.redemption.ip_range:${hashRateLimitValue(ipRangeKey(clientIp), invitationHashKey)}`,
    `verify.abuse:verify-${suffix}`,
    ...[...codeHashes].map((digest) => `invitation.redemption.digest:${digest}`),
  ];
  for (const key of counterKeys) {
    await sql`delete from rate_limit_counters where key = ${key}`;
  }

  await closeDatabase();
}
