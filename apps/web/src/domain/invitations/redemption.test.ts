import { beforeEach, describe, expect, it } from "vitest";
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
  result: RedemptionResult = { ok: true, userId: "user-1" };

  async redeem(input: NewInvitationRedemption): Promise<RedemptionResult> {
    this.calls.push(input);
    return this.result;
  }
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
});
