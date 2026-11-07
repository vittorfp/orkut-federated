import { beforeEach, describe, expect, it } from "vitest";
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
});
