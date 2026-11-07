# MVP 1.2: Minimal Authentication

## Outcome

An invited user can authenticate with a verified email and password, retain a
secure session, log out, and recover access. Public registration remains off.

## Subchunks

1. Auth instance and Drizzle adapter with signup disabled.
2. Session cookie and `requireUser` server boundary.
3. Verified-email transport abstraction and deterministic test transport.
4. Invitation-only account-creation entry point.
5. Logout and current-session invalidation.
6. Recovery-token issue, expiry, single use, and password replacement.
7. Cross-user authorization and sensitive-log tests.

## Gate

Unauthenticated and wrong-user requests fail; hashes and tokens never enter
logs; expired or reused tokens fail; no endpoint registers a user without a
successful invitation redemption.

## Exclusions

Passkeys, social login, federation login, and administrator 2FA.

## Implementation notes

Email verification tokens are stateless Better Auth JWTs with a one-hour
expiry. Reusing a token or verifying an already-verified principal returns
success without changing state, so the gate interprets "reused tokens fail" as
"replay cannot grant new access". Verification links are delivered through a
private local outbox until an SMTP transport exists; see
[the verification email runbook](../../runbooks/verification-email.md).

`verify-authentication.ts` covers unverified sign-in rejection, outbox
delivery, verification, session lookup, suspension, and sign-out invalidation.
