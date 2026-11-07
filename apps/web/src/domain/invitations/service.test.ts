import { beforeEach, describe, expect, it } from "vitest";
import type { AuditEvent, AuditRecorder } from "@/lib/audit";
import {
  type RateLimitDecision,
  RateLimitExceededError,
  type RateLimiter,
  type RateLimitPolicy,
} from "@/lib/rate-limit";
import { createInvitationService, InvitationPolicyError } from "./service";
import type { InvitationRecord, InvitationStore, NewInvitation } from "./store";

const now = new Date("2026-11-06T12:00:00.000Z");
const code = "ofi_q6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6s";
const hashKey = "test-invitation-key-that-is-at-least-32-characters";

class MemoryInvitationStore implements InvitationStore {
  activeUsers = new Set(["active-user"]);
  invitations: Array<InvitationRecord & { codeDigest: string }> = [];

  async insertForActiveInviter(
    invitation: NewInvitation,
  ): Promise<InvitationRecord | null> {
    if (!this.activeUsers.has(invitation.inviterUserId)) return null;
    const record = {
      ...invitation,
      id: `00000000-0000-4000-8000-${String(this.invitations.length + 1).padStart(12, "0")}`,
      useCount: 0,
      revokedAt: null,
      createdAt: now,
    };
    this.invitations.push(record);
    return record;
  }

  async findByDigest(codeDigest: string): Promise<InvitationRecord | null> {
    return this.invitations.find((item) => item.codeDigest === codeDigest) ?? null;
  }

  async listOwned(inviterUserId: string): Promise<InvitationRecord[]> {
    return this.invitations.filter(
      (invitation) => invitation.inviterUserId === inviterUserId,
    );
  }

  async revokeOwned(input: {
    invitationId: string;
    inviterUserId: string;
  }): Promise<boolean> {
    if (!this.activeUsers.has(input.inviterUserId)) return false;
    const invitation = this.invitations.find(
      (item) =>
        item.id === input.invitationId &&
        item.inviterUserId === input.inviterUserId &&
        item.revokedAt === null &&
        item.expiresAt > now &&
        item.useCount < item.maxUses,
    );
    if (!invitation) return false;
    invitation.revokedAt = now;
    return true;
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
      retryAfterSeconds: 9,
    };
  }

  async pruneExpired(): Promise<void> {}
}

describe("invitation service", () => {
  let store: MemoryInvitationStore;
  let service: ReturnType<typeof createInvitationService>;

  beforeEach(() => {
    store = new MemoryInvitationStore();
    service = createInvitationService({
      generateCode: () => code,
      hashKey,
      now: () => now,
      store,
    });
  });

  it("returns the plaintext once while storing only its keyed digest", async () => {
    const result = await service.issue({
      expiresAt: new Date("2026-11-07T12:00:00.000Z"),
      inviterUserId: "active-user",
    });

    expect(result.code).toBe(code);
    expect(store.invitations[0]?.codeDigest).toMatch(/^[a-f0-9]{64}$/);
    expect(store.invitations[0]?.codeDigest).not.toBe(code);
    expect(JSON.stringify(store.invitations)).not.toContain(code);
  });

  it("rejects inactive inviters and excessive invitation windows", async () => {
    await expect(
      service.issue({
        expiresAt: new Date("2026-11-07T12:00:00.000Z"),
        inviterUserId: "suspended-user",
      }),
    ).rejects.toEqual(new InvitationPolicyError("not_authorized"));

    await expect(
      service.issue({
        expiresAt: new Date("2026-12-07T12:00:00.001Z"),
        inviterUserId: "active-user",
      }),
    ).rejects.toEqual(new InvitationPolicyError("invalid_expiry"));
    await expect(
      service.issue({
        expiresAt: new Date(Number.NaN),
        inviterUserId: "active-user",
      }),
    ).rejects.toEqual(new InvitationPolicyError("invalid_expiry"));
    expect(store.invitations).toHaveLength(0);
  });

  it("accepts only integer use limits from 1 through 100", async () => {
    for (const maxUses of [0, 1.5, 101]) {
      await expect(
        service.issue({
          expiresAt: new Date("2026-11-07T12:00:00.000Z"),
          inviterUserId: "active-user",
          maxUses,
        }),
      ).rejects.toEqual(new InvitationPolicyError("invalid_max_uses"));
    }

    const issued = await service.issue({
      expiresAt: new Date("2026-11-07T12:00:00.000Z"),
      inviterUserId: "active-user",
      maxUses: 100,
    });
    expect(issued.invitation.maxUses).toBe(100);
  });

  it("previews availability without revealing invitation metadata", async () => {
    expect(await service.preview("not-an-invitation")).toEqual({ available: false });
    await service.issue({
      expiresAt: new Date("2026-11-07T12:00:00.000Z"),
      inviterUserId: "active-user",
    });
    expect(await service.preview(code)).toEqual({ available: true });
  });

  it("lists only owned metadata with a derived status and without digests", async () => {
    store.activeUsers.add("another-active-user");
    const first = await service.issue({
      expiresAt: new Date("2026-11-07T12:00:00.000Z"),
      inviterUserId: "active-user",
    });
    await service.issue({
      expiresAt: new Date("2026-11-07T12:00:00.000Z"),
      inviterUserId: "another-active-user",
    });

    const listed = await service.listOwned("active-user");
    expect(listed).toHaveLength(1);
    expect(listed[0]).toMatchObject({
      id: first.invitation.id,
      maxUses: 1,
      status: "available",
      useCount: 0,
    });
    expect(listed[0]).not.toHaveProperty("codeDigest");
    expect(JSON.stringify(listed)).not.toContain(code);
    expect(await service.listOwned("another-active-user")).toHaveLength(1);
    expect(await service.listOwned("unknown-user")).toEqual([]);
  });

  it("allows only an active invitation owner to revoke once", async () => {
    store.activeUsers.add("another-active-user");
    const issued = await service.issue({
      expiresAt: new Date("2026-11-07T12:00:00.000Z"),
      inviterUserId: "active-user",
    });

    expect(
      await service.revoke({
        invitationId: "not-a-uuid",
        inviterUserId: "active-user",
      }),
    ).toBe(false);
    expect(
      await service.revoke({
        invitationId: issued.invitation.id,
        inviterUserId: "another-active-user",
      }),
    ).toBe(false);
    store.activeUsers.delete("active-user");
    expect(
      await service.revoke({
        invitationId: issued.invitation.id,
        inviterUserId: "active-user",
      }),
    ).toBe(false);
    store.activeUsers.add("active-user");
    expect(
      await service.revoke({
        invitationId: issued.invitation.id,
        inviterUserId: "active-user",
      }),
    ).toBe(true);
    expect(await service.preview(code)).toEqual({ available: false });
    expect(
      await service.revoke({
        invitationId: issued.invitation.id,
        inviterUserId: "active-user",
      }),
    ).toBe(false);
  });

  it("does not revoke expired or exhausted invitations", async () => {
    const expired = await service.issue({
      expiresAt: new Date("2026-11-06T12:00:00.001Z"),
      inviterUserId: "active-user",
    });
    const available = store.invitations.find(
      (invitation) => invitation.id === expired.invitation.id,
    );
    if (!available) throw new Error("test invitation was not stored");
    available.expiresAt = now;
    expect(
      await service.revoke({
        invitationId: expired.invitation.id,
        inviterUserId: "active-user",
      }),
    ).toBe(false);

    available.expiresAt = new Date("2026-11-07T12:00:00.000Z");
    available.useCount = available.maxUses;
    expect(
      await service.revoke({
        invitationId: expired.invitation.id,
        inviterUserId: "active-user",
      }),
    ).toBe(false);
  });

  it("records issue and revoke outcomes without secrets", async () => {
    const audit = new MemoryAuditRecorder();
    service = createInvitationService({
      audit,
      generateCode: () => code,
      hashKey,
      now: () => now,
      store,
    });

    const issued = await service.issue({
      expiresAt: new Date("2026-11-07T12:00:00.000Z"),
      inviterUserId: "active-user",
      maxUses: 3,
    });
    await service.revoke({
      invitationId: issued.invitation.id,
      inviterUserId: "active-user",
    });
    await expect(
      service.issue({
        expiresAt: new Date("2026-11-07T12:00:00.000Z"),
        inviterUserId: "suspended-user",
      }),
    ).rejects.toEqual(new InvitationPolicyError("not_authorized"));

    expect(audit.events).toHaveLength(3);
    expect(audit.events[0]).toMatchObject({
      action: "invitation.issue",
      actorUserId: "active-user",
      detail: { expiresInHours: 24, maxUses: 3 },
      invitationId: issued.invitation.id,
      outcome: "success",
    });
    expect(audit.events[1]).toMatchObject({
      action: "invitation.revoke",
      invitationId: issued.invitation.id,
      outcome: "success",
    });
    expect(audit.events[2]).toMatchObject({
      action: "invitation.issue",
      actorUserId: "suspended-user",
      detail: { reason: "not_authorized" },
      outcome: "rejected",
    });
    const serialized = JSON.stringify(audit.events);
    expect(serialized).not.toContain(code);
    expect(serialized).not.toContain("digest");
  });

  it("audits rate-limited issue and revoke attempts before touching the store", async () => {
    const audit = new MemoryAuditRecorder();
    const limiter = new MemoryRateLimiter(false);
    service = createInvitationService({
      audit,
      generateCode: () => code,
      hashKey,
      limiter,
      now: () => now,
      store,
    });

    await expect(
      service.issue({
        expiresAt: new Date("2026-11-07T12:00:00.000Z"),
        inviterUserId: "active-user",
      }),
    ).rejects.toBeInstanceOf(RateLimitExceededError);
    await expect(
      service.revoke({
        invitationId: "00000000-0000-4000-8000-000000000001",
        inviterUserId: "active-user",
      }),
    ).rejects.toBeInstanceOf(RateLimitExceededError);

    expect(store.invitations).toHaveLength(0);
    expect(audit.events.map((event) => event.outcome)).toEqual([
      "rate_limited",
      "rate_limited",
    ]);
    expect(audit.events[0]?.detail).toMatchObject({ retryAfterSeconds: 9 });
    expect(JSON.stringify(audit.events)).not.toContain(code);
  });

  it("rate-limits previews by endpoint and an opaque code digest", async () => {
    const limiter = new MemoryRateLimiter(true);
    service = createInvitationService({
      generateCode: () => code,
      hashKey,
      limiter,
      now: () => now,
      store,
    });

    await service.preview(code);

    expect(limiter.policies.map((policy) => policy.bucket)).toEqual([
      "invitation.preview.endpoint",
      "invitation.preview.digest",
    ]);
    expect(limiter.policies[1]?.key).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(limiter.policies)).not.toContain(code);
  });
});
