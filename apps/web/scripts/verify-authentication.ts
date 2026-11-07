import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { closeDatabase, getSqlClient } from "../src/db/client";
import {
  digestInvitationCode,
  generateInvitationCode,
} from "../src/domain/invitations/code";
import { getRedemptionService } from "../src/domain/invitations/redemption";
import { getAuth } from "../src/lib/auth";
import { findActiveMember } from "../src/lib/session";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

type VerificationMessage = { to: string; url: string };

async function readVerificationMessages(path: string): Promise<VerificationMessage[]> {
  let raw: string;
  try {
    raw = await readFile(path, "utf8");
  } catch {
    return [];
  }
  return raw
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as VerificationMessage);
}

async function signInStatus(
  emailAddress: string,
  password: string,
): Promise<{ status: "rejected" | "ok"; cookie?: string }> {
  const response = await getAuth().api.signInEmail({
    asResponse: true,
    body: { email: emailAddress, password },
  });
  if (response.status !== 200) return { status: "rejected" };

  const cookie = response.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .filter(Boolean)
    .join("; ");
  return { status: "ok", cookie };
}

const sql = getSqlClient();
const suffix = crypto.randomUUID().replaceAll("-", "").slice(0, 12);
const hashKey = process.env.INVITATION_HASH_KEY;
assert(hashKey, "INVITATION_HASH_KEY is required");
const invitationHashKey: string = hashKey;
const password = "authentication-password-123";
const auth = getAuth();
const redemptionService = getRedemptionService();
const outboxDirectory = await mkdtemp(join(tmpdir(), "orkut-auth-outbox-"));
const outboxPath = join(outboxDirectory, "verification.jsonl");
process.env.VERIFICATION_MAIL_OUTBOX = outboxPath;

const inviterId = `auth-inviter-${suffix}`;
const inviterEmail = `auth-inviter-${suffix}@example.test`;
const memberEmail = `auth-member-${suffix}@example.test`;
const memberHandle = `auth_${suffix}`;

async function createInvitationCode(): Promise<string> {
  const code = generateInvitationCode();
  const [created] = await sql<{ id: string }[]>`
    insert into invitations (code_digest, inviter_user_id, max_uses, expires_at)
    values (
      ${digestInvitationCode(code, invitationHashKey)},
      ${inviterId},
      1,
      now() + interval '1 day'
    )
    returning id
  `;
  assert(created, "invitation was not created");
  return code;
}

try {
  await sql`
    insert into users (id, name, email, email_verified)
    values (${inviterId}, 'Authentication Inviter', ${inviterEmail}, true)
  `;
  await sql`insert into members (user_id) values (${inviterId})`;

  const code = await createInvitationCode();
  const redeemed = await redemptionService.redeem({
    code,
    email: memberEmail,
    handle: memberHandle,
    password,
    publicName: "Authentication Member",
  });

  // An invited but unverified principal cannot open a session.
  const unverified = await signInStatus(memberEmail, password);
  assert(unverified.status === "rejected", "unverified principal signed in");

  // The outbox transport receives a real, single-use verification link.
  const sent = await auth.api.sendVerificationEmail({
    body: { callbackURL: "/app", email: memberEmail },
  });
  assert(sent.status === true, "verification email was not accepted");

  const messages = await readVerificationMessages(outboxPath);
  const verification = messages.find((message) => message.to === memberEmail);
  assert(verification, "verification link was not written to the outbox");
  const token = new URL(verification.url).searchParams.get("token");
  assert(token, "verification link has no token");

  // Verification must be idempotent for an already-verified principal and
  // must not create a session on its own.
  const verified = await auth.api.verifyEmail({ query: { token } });
  assert(verified && verified.status === true, "verification token was rejected");
  const [stored] = await sql<{ email_verified: boolean }[]>`
    select email_verified from users where id = ${redeemed.userId}
  `;
  assert(stored?.email_verified === true, "verified email was not persisted");

  // A verified principal can sign in and keep a session; that session can be
  // used by the member boundary and revoked by logout.
  const signedIn = await signInStatus(memberEmail, password);
  assert(
    signedIn.status === "ok" && signedIn.cookie,
    "verified principal could not sign in",
  );
  const session = await auth.api.getSession({
    headers: new Headers({ cookie: signedIn.cookie }),
  });
  assert(
    session?.user.id === redeemed.userId,
    "session did not resolve to the principal",
  );
  const member = await findActiveMember(redeemed.userId);
  assert(member?.handle === memberHandle, "active member was not found");

  // Suspension removes the member from the active boundary while leaving the
  // Better Auth principal intact for administrative review.
  await sql`update members set status = 'suspended' where user_id = ${redeemed.userId}`;
  assert(
    (await findActiveMember(redeemed.userId)) === null,
    "suspended member remained active",
  );

  const signedOut = await auth.api.signOut({
    headers: new Headers({ cookie: signedIn.cookie }),
  });
  assert(signedOut.success === true, "sign-out did not succeed");
  const revoked = await auth.api.getSession({
    headers: new Headers({ cookie: signedIn.cookie }),
  });
  assert(revoked === null, "sign-out did not invalidate the session");

  process.stdout.write("authentication invariants: ok\n");
} finally {
  await rm(outboxDirectory, { force: true, recursive: true });
  await sql`delete from invitations where inviter_user_id = ${inviterId}`;
  await sql`
    delete from users
    where id = ${inviterId} or email like ${`%${suffix}%`}
  `;
  await closeDatabase();
}
