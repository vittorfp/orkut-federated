# MVP 1.3c: Invitation Management UI

## Outcome

An authorized member can issue, copy once, inspect, and revoke invitations
through an accessible authenticated interface.

## Implementation chunks

1. Add authenticated server actions that call the lifecycle services and map
   policy errors without exposing internal records.
2. Render issue controls with constrained expiry and use-limit inputs.
3. Show the plaintext code only in the successful issuance response, with
   explicit copy and dismissal controls.
4. List owned invitation metadata without digests or redemption identities.
5. Add a confirmation flow for idempotent revocation.
6. Test keyboard navigation, labels, focus movement, error announcements, and
   cross-user authorization.

## Gate

No plaintext code appears after the issuance response, no digest reaches the
browser, and another member cannot list or revoke the owner's invitations.

## Implementation notes

The page lives at `/invitations` behind `requireMember()`. Server actions derive
the inviter from the session and never accept a user identifier from the
client. Listing rebuilds each record explicitly in the service, so a store
cannot leak digests or future internal columns to the browser.

`verify-invitations.ts` covers owner-only listing, plaintext and digest
exclusion, digest-at-rest verification, cross-member revocation rejection, and
idempotent revocation. Keyboard navigation, labels, focus movement, and error
announcements are implemented with native form controls, a fieldset/legend, and
polite live regions; they remain part of manual release checks until a browser
test harness is introduced.
