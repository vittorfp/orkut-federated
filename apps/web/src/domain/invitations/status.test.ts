import { describe, expect, it } from "vitest";
import { classifyInvitation } from "./status";

const now = new Date("2026-11-05T12:00:00.000Z");

describe("classifyInvitation", () => {
  it("reports an invitation with remaining uses as available", () => {
    expect(
      classifyInvitation(
        {
          expiresAt: new Date("2026-11-06T12:00:00.000Z"),
          maxUses: 2,
          revokedAt: null,
          useCount: 1,
        },
        now,
      ),
    ).toBe("available");
  });

  it("gives revocation precedence over other states", () => {
    expect(
      classifyInvitation(
        { expiresAt: now, maxUses: 1, revokedAt: now, useCount: 1 },
        now,
      ),
    ).toBe("revoked");
  });

  it("treats the exact expiry instant as expired", () => {
    expect(
      classifyInvitation(
        { expiresAt: now, maxUses: 1, revokedAt: null, useCount: 0 },
        now,
      ),
    ).toBe("expired");
  });

  it("reports a fully consumed invitation as exhausted", () => {
    expect(
      classifyInvitation(
        {
          expiresAt: new Date("2026-11-06T12:00:00.000Z"),
          maxUses: 1,
          revokedAt: null,
          useCount: 1,
        },
        now,
      ),
    ).toBe("exhausted");
  });
});
