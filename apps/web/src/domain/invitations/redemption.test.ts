import { beforeEach, describe, expect, it } from "vitest";
import type { AuditEvent, AuditRecorder } from "@/lib/audit";
import {
  type RateLimitDecision,
  RateLimitExceededError,
  type RateLimiter,
  type RateLimitPolicy,
} from "@/lib/rate-limit";
import {
  createRedemptionService,
  type RedeemInvitationInput,
  RedemptionError,
  type RedemptionErrorCode,
} from "./redemption";
import type {
  NewInvitationRedemption,
  RedemptionResult,
  RedemptionStore,
} from "./redemption-store";

const code = "ofi_q6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6s";
const hashKey = "test-invitation-key-that-is-at-least-32-characters";
const password = "correct horse battery staple";

class MemoryRedemptionStore implements RedemptionStore {
  calls: NewInvitationRedemption[] = [];
  result: RedemptionResult = {
    ok: true,
    invitationId: "00000000-0000-4000-8000-000000000001",
    userId: "user-1",
  };

  async redeem(input: NewInvitationRedemption): Promise<RedemptionResult> {
    this.calls.push(input);
    return this.result;
  }
}

class MemoryAuditRecorder implements AuditRecorder {
  events: AuditEvent[] = [];

  async record(event: AuditEvent): Promise<void> {
    this.events.push(event);
  }
}

class MemoryRateLimiter implements RateLimiter {
  policies: RateLimitPolicy[] = [];

  constructor(private readonly allow: boolean) {}

  async consume(policy: RateLimitPolicy): Promise<RateLimitDecision> {
    this.policies.push(policy);
    return {
      allowed: this.allow,
      remaining: this.allow ? 1 : 0,
      retryAfterSeconds: 7,
    };
  }

  async pruneExpired(): Promise<void> {}
}

function input(overrides: Partial<RedeemInvitationInput> = {}): RedeemInvitationInput {
  return {
    code,
    email: "Invitee@Example.Test",
    handle: "  New_Member  ",
    password,
    publicName: "  New Member  ",
    ...overrides,
  };
}

describe("invitation redemption service", () => {
  let store: MemoryRedemptionStore;
  let service: ReturnType<typeof createRedemptionService>;

  beforeEach(() => {
    store = new MemoryRedemptionStore();
    service = createRedemptionService({ hashKey, store });
  });

  it("normalizes identity fields and hashes the code before persisting", async () => {
    const result = await service.redeem(input());

    expect(result).toEqual({ userId: "user-1" });
    expect(store.calls[0]).toMatchObject({
      email: "invitee@example.test",
      handle: "new_member",
      publicName: "New Member",
    });
    expect(store.calls[0]?.codeDigest).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(store.calls)).not.toContain(code);
  });

  it("rejects malformed invitation codes without touching the store", async () => {
    for (const invalid of ["", "ofi_short", `${code}x`]) {
      await expect(service.redeem(input({ code: invalid }))).rejects.toEqual(
        new RedemptionError("invitation_unavailable"),
      );
    }
    expect(store.calls).toHaveLength(0);
  });

  it("validates email, password, handle, and public name before the database", async () => {
    const cases: Array<[Partial<RedeemInvitationInput>, RedemptionErrorCode]> = [
      [{ email: "not-an-email" }, "invalid_email"],
      [{ password: "short" }, "invalid_password"],
      [{ password: "x".repeat(129) }, "invalid_password"],
      [{ handle: "ab" }, "invalid_handle"],
      [{ handle: "admin" }, "invalid_handle"],
      [{ handle: "no spaces" }, "invalid_handle"],
      [{ publicName: "   " }, "invalid_public_name"],
      [{ publicName: "x".repeat(101) }, "invalid_public_name"],
    ];

    for (const [overrides, code] of cases) {
      await expect(service.redeem(input(overrides))).rejects.toEqual(
        new RedemptionError(code),
      );
    }
    expect(store.calls).toHaveLength(0);
  });

  it("hides unavailable invitations and identity conflicts", async () => {
    store.result = { ok: false, reason: "invitation_unavailable" };
    await expect(service.redeem(input())).rejects.toEqual(
      new RedemptionError("invitation_unavailable"),
    );

    for (const reason of ["email_conflict", "handle_conflict"] as const) {
      store.result = { ok: false, reason };
      await expect(service.redeem(input())).rejects.toEqual(
        new RedemptionError("identity_conflict"),
      );
    }
  });

  it("does not include the password or code in error messages", async () => {
    store.result = { ok: false, reason: "email_conflict" };
    const error = await service.redeem(input()).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(RedemptionError);
    expect(String(error)).not.toContain(password);
    expect(String(error)).not.toContain(code);
  });

  it("records a successful redemption without secrets", async () => {
    const audit = new MemoryAuditRecorder();
    service = createRedemptionService({ audit, hashKey, store });

    await service.redeem(input());

    expect(audit.events).toHaveLength(1);
    expect(audit.events[0]).toMatchObject({
      action: "invitation.redemption",
      actorUserId: "user-1",
      invitationId: "00000000-0000-4000-8000-000000000001",
      outcome: "success",
    });
    const serialized = JSON.stringify(audit.events);
    expect(serialized).not.toContain(code);
    expect(serialized).not.toContain(password);
    expect(serialized).not.toContain("Invitee@Example.Test");
  });

  it("records rejected redemption categories without the submitted values", async () => {
    const audit = new MemoryAuditRecorder();
    service = createRedemptionService({ audit, hashKey, store });

    store.result = { ok: false, reason: "invitation_unavailable" };
    await expect(service.redeem(input())).rejects.toEqual(
      new RedemptionError("invitation_unavailable"),
    );
    await expect(service.redeem(input({ code: "ofi_short" }))).rejects.toEqual(
      new RedemptionError("invitation_unavailable"),
    );

    expect(audit.events.map((event) => event.detail)).toEqual([
      { reason: "invitation_unavailable" },
      { reason: "invitation_unavailable" },
    ]);
    const serialized = JSON.stringify(audit.events);
    expect(serialized).not.toContain(code);
    expect(serialized).not.toContain("Invitee@Example.Test");
  });

  it("rejects and audits attempts once a rate limit is exhausted", async () => {
    const audit = new MemoryAuditRecorder();
    const limiter = new MemoryRateLimiter(false);
    service = createRedemptionService({ audit, hashKey, limiter, store });

    await expect(service.redeem(input())).rejects.toBeInstanceOf(RateLimitExceededError);
    expect(store.calls).toHaveLength(0);
    expect(audit.events).toHaveLength(1);
    expect(audit.events[0]).toMatchObject({
      action: "invitation.redemption",
      detail: { retryAfterSeconds: 7 },
      outcome: "rate_limited",
    });
    expect(JSON.stringify(audit.events)).not.toContain(code);
  });

  it("rate-limits endpoint, digest, and a hashed IP range without plaintext", async () => {
    const limiter = new MemoryRateLimiter(true);
    service = createRedemptionService({ hashKey, limiter, store });

    await service.redeem(input({ clientIp: "203.0.113.42" }));

    expect(limiter.policies.map((policy) => policy.bucket)).toEqual([
      "invitation.redemption.endpoint",
      "invitation.redemption.digest",
      "invitation.redemption.ip_range",
    ]);
    const serialized = JSON.stringify(limiter.policies);
    expect(serialized).not.toContain(code);
    expect(serialized).not.toContain("203.0.113.42");
    expect(limiter.policies[1]?.key).toMatch(/^[a-f0-9]{64}$/);
    expect(limiter.policies[2]?.key).toMatch(/^[a-f0-9]{64}$/);
  });
});
