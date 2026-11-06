import { describe, expect, it } from "vitest";
import { digestInvitationCode, generateInvitationCode } from "./code";

describe("invitation codes", () => {
  it("encodes 256 bits of entropy with a recognizable prefix", () => {
    const code = generateInvitationCode(() => Buffer.alloc(32, 0xab));
    expect(code).toBe("ofi_q6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6s");
  });

  it("stores a keyed digest rather than the invitation code", () => {
    const code = "ofi_example-secret-code";
    const digest = digestInvitationCode(code, "test-key-that-is-at-least-32-characters");
    expect(digest).toMatch(/^[a-f0-9]{64}$/);
    expect(digest).not.toContain(code);
    expect(digestInvitationCode(code, "another-key-that-is-at-least-32-chars")).not.toBe(
      digest,
    );
  });
});
