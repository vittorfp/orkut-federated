import { closeDatabase, getSqlClient } from "../src/db/client";
import {
  digestInvitationCode,
  generateInvitationCode,
} from "../src/domain/invitations/code";
import {
  getRedemptionService,
  RedemptionError,
} from "../src/domain/invitations/redemption";
import { getInvitationService } from "../src/domain/invitations/service";
import { getAuth } from "../src/lib/auth";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const sql = getSqlClient();
const suffix = crypto.randomUUID().replaceAll("-", "").slice(0, 12);
const hashKey = process.env.INVITATION_HASH_KEY;
assert(hashKey, "INVITATION_HASH_KEY is required");
const invitationHashKey: string = hashKey;
const password = "redemption-password-123";
const inviterId = `redemption-inviter-${suffix}`;
const inviterEmail = `redemption-inviter-${suffix}@example.test`;
const redemptionService = getRedemptionService();
const invitationService = getInvitationService();

let invitationCounter = 0;

function email(label: string): string {
  return `redemption-${label}-${suffix}@example.test`;
}

function handle(label: string): string {
  return `${label}_${suffix.slice(0, 8)}`;
}

async function createInvitation(maxUses: number) {
  const code = generateInvitationCode();
  invitationCounter += 1;
  const [created] = await sql<{ id: string }[]>`
    insert into invitations (code_digest, inviter_user_id, max_uses, expires_at)
    values (
      ${digestInvitationCode(code, invitationHashKey)},
      ${inviterId},
      ${maxUses},
      now() + interval '1 day'
    )
    returning id
  `;
  assert(created, `invitation ${invitationCounter} was not created`);
  return { code, id: created.id };
}

async function invitationState(invitationId: string) {
  const [state] = await sql<
    {
      redemptions: number;
      revokedAt: Date | null;
      useCount: number;
    }[]
  >`
    select
      use_count as "useCount",
      revoked_at as "revokedAt",
      (select count(*)::int from invitation_redemptions where invitation_id = ${invitationId})
        as redemptions
    from invitations
    where id = ${invitationId}
  `;
  assert(state, "invitation state was not found");
  return state;
}

async function userCount(emailAddress: string): Promise<number> {
  const [row] = await sql<{ count: number }[]>`
    select count(*)::int as count from users where email = ${emailAddress}
  `;
  return row?.count ?? 0;
}

try {
  await sql`
    insert into users (id, name, email, email_verified)
    values (${inviterId}, 'Redemption Inviter', ${inviterEmail}, true)
  `;
  await sql`insert into members (user_id) values (${inviterId})`;

  // Two simultaneous attempts at the final use: exactly one full account.
  {
    const invitation = await createInvitation(1);
    const attempts = await Promise.allSettled([
      redemptionService.redeem({
        code: invitation.code,
        email: email("race-a"),
        handle: handle("race_a"),
        password,
        publicName: "Race A",
      }),
      redemptionService.redeem({
        code: invitation.code,
        email: email("race-b"),
        handle: handle("race_b"),
        password,
        publicName: "Race B",
      }),
    ]);
    const winners = attempts.filter((attempt) => attempt.status === "fulfilled");
    const losers = attempts.filter((attempt) => attempt.status === "rejected");
    assert(
      winners.length === 1 && losers.length === 1,
      "last-use race did not have one winner",
    );
    const loser = losers[0];
    assert(
      loser?.reason instanceof RedemptionError &&
        loser.reason.code === "invitation_unavailable",
      "losing redemption did not fail as unavailable",
    );

    const winner = winners[0];
    assert(winner?.status === "fulfilled", "winning redemption is missing");
    const [winnerRow] = await sql<{ email: string }[]>`
      select email from users where id = ${winner.value.userId}
    `;
    assert(winnerRow, "winning principal was not created");
    const loserEmail =
      winnerRow.email === email("race-a") ? email("race-b") : email("race-a");
    assert((await userCount(loserEmail)) === 0, "losing redemption created a principal");

    const [account] = await sql<{ count: number }[]>`
      select count(*)::int as count
      from accounts
      where user_id = ${winner.value.userId} and provider_id = 'credential'
    `;
    assert(account?.count === 1, "winning principal has no credential account");
    const [profile] = await sql<{ count: number }[]>`
      select count(*)::int as count
      from profiles
      where user_id = ${winner.value.userId}
    `;
    assert(profile?.count === 1, "winning principal has no profile");

    const state = await invitationState(invitation.id);
    assert(
      state.useCount === 1 && state.redemptions === 1,
      "invitation use count and redemptions drifted",
    );

    // Dependency contract: the provisioned credential can sign in through Better Auth.
    await sql`update users set email_verified = true where id = ${winner.value.userId}`;
    const signIn = await getAuth().api.signInEmail({
      body: { email: winnerRow.email, password },
    });
    assert(
      signIn.user.id === winner.value.userId,
      "Better Auth could not sign in the principal",
    );
  }

  // A profile conflict after principal creation must roll the whole transaction back.
  {
    const collidingHandle = handle("taken");
    await sql`
      insert into users (id, name, email, email_verified)
      values (${`redemption-collider-${suffix}`}, 'Collider', ${email("collider")}, true)
    `;
    await sql`insert into members (user_id) values (${`redemption-collider-${suffix}`})`;
    await sql`
      insert into profiles (user_id, handle, public_name)
      values (${`redemption-collider-${suffix}`}, ${collidingHandle}, 'Collider')
    `;

    const invitation = await createInvitation(1);
    const conflict = await redemptionService
      .redeem({
        code: invitation.code,
        email: email("rollback"),
        handle: collidingHandle,
        password,
        publicName: "Rollback",
      })
      .then(
        () => null,
        (caught: unknown) => caught,
      );
    assert(
      conflict instanceof RedemptionError && conflict.code === "identity_conflict",
      "profile conflict did not surface as identity_conflict",
    );
    assert(
      (await userCount(email("rollback"))) === 0,
      "rollback left a principal behind",
    );

    const state = await invitationState(invitation.id);
    assert(
      state.useCount === 0 && state.redemptions === 0,
      "rollback consumed the invitation",
    );

    const redeemed = await redemptionService.redeem({
      code: invitation.code,
      email: email("rolled-back-then-ok"),
      handle: handle("after_rollback"),
      password,
      publicName: "After Rollback",
    });
    assert(
      Boolean(redeemed.userId),
      "invitation was unusable after a rolled-back attempt",
    );
  }

  // Email normalization prevents case variants from creating two principals.
  {
    const invitation = await createInvitation(3);
    const mixedCaseEmail = `Redemption-Case-${suffix}@Example.Test`;
    await redemptionService.redeem({
      code: invitation.code,
      email: mixedCaseEmail,
      handle: handle("case_a"),
      password,
      publicName: "Case A",
    });

    const duplicate = await redemptionService
      .redeem({
        code: invitation.code,
        email: mixedCaseEmail.toLowerCase(),
        handle: handle("case_b"),
        password,
        publicName: "Case B",
      })
      .then(
        () => null,
        (caught: unknown) => caught,
      );
    assert(
      duplicate instanceof RedemptionError && duplicate.code === "identity_conflict",
      "case-variant email produced a second principal",
    );

    const [stored] = await sql<{ count: number }[]>`
      select count(*)::int as count
      from users
      where email = ${mixedCaseEmail.toLowerCase()}
    `;
    assert(stored?.count === 1, "normalized email was not stored exactly once");
  }

  // Redemption and revocation serialize to one winner.
  {
    const invitation = await createInvitation(1);
    const [redemption, revocation] = await Promise.allSettled([
      redemptionService.redeem({
        code: invitation.code,
        email: email("race-revoke"),
        handle: handle("race_revoke"),
        password,
        publicName: "Race Revoke",
      }),
      invitationService.revoke({
        invitationId: invitation.id,
        inviterUserId: inviterId,
      }),
    ]);

    const state = await invitationState(invitation.id);
    if (redemption.status === "fulfilled") {
      assert(
        revocation.status === "fulfilled" && revocation.value === false,
        "revocation won after a committed redemption",
      );
      assert(
        state.useCount === 1 && state.revokedAt === null,
        "redemption and revocation produced inconsistent state",
      );
    } else {
      assert(
        redemption.reason instanceof RedemptionError &&
          redemption.reason.code === "invitation_unavailable",
        "losing redemption did not fail as unavailable",
      );
      assert(
        revocation.status === "fulfilled" && revocation.value === true,
        "revocation did not win the conflicting redemption",
      );
      assert(
        state.useCount === 0 && state.revokedAt !== null,
        "revocation left a consumed or active invitation",
      );
      assert(
        (await userCount(email("race-revoke"))) === 0,
        "revoked redemption created a user",
      );
    }
  }

  process.stdout.write("redemption invariants: ok\n");
} finally {
  await sql`delete from invitations where inviter_user_id = ${inviterId}`;
  await sql`
    delete from users
    where id = ${inviterId} or email like ${`%${suffix}%`}
  `;
  await closeDatabase();
}
