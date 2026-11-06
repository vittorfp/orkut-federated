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
