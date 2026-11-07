# MVP 1.9: Administrator Bootstrap

## Outcome

The first administrator is created once through an explicit non-web operation,
and every privileged action requires a recently verified second factor.

## Subchunks

1. Bootstrap threat model and one-time marker.
2. Administrator role schema and repository.
3. Idempotent CLI transaction requiring an explicit existing user ID.
4. Current Better Auth 2FA capability spike.
5. Enroll and verify an administrator second factor.
6. Privileged-route policy requiring recent 2FA.
7. Self-promotion and bootstrap-reuse tests.

## Gate

No web endpoint grants administrator status, bootstrap cannot create a second
initial administrator, and a normal session without recent 2FA cannot perform
privileged actions.
