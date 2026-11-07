# Verification Email Outbox

The web app sends account-verification links through a transport interface.
Until an SMTP provider is configured, the only implementation appends messages
to a private local JSONL file.

## Local flow

1. Set `VERIFICATION_MAIL_OUTBOX` in `apps/web/.env.local`; the default is
   `.mail-outbox/verification.jsonl` relative to the web app.
2. Request verification from `/login` or redeem an invitation that requires
   email verification.
3. Read the newest line of the outbox, copy the `url`, and open it in a browser.
4. The verification page marks the principal verified; then sign in normally.

The outbox directory is created with mode `0700` and the file with mode `0600`.
It contains single-use bearer tokens. Do not commit it, serve it, or paste its
contents into logs or issue trackers.

## Failure modes

- **No file appears:** confirm the app process can write to the configured
  path and that the email address belongs to an existing unverified principal.
- **Link expires:** verification tokens last one hour. Request a new link from
  `/login`; expired links do not change state.
- **Token is reused or the account is already verified:** Better Auth returns
  success without changing state. This is harmless because the token only
  grants the `emailVerified` transition, but it means reuse is idempotent rather
  than an error.
- **Production deployment:** replace the outbox transport with a real delivery
  provider before exposing the app outside local development.

## Test coverage

`corepack pnpm db:verify` includes `verify-authentication.ts`, which exercises
unverified sign-in rejection, outbox delivery, token verification, session
creation and lookup, suspension, and sign-out invalidation against PostgreSQL.
