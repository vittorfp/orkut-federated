import { describe, expect, it } from "vitest";
import { validateHandle } from "./handles";

describe("validateHandle", () => {
  it("normalizes a valid ASCII handle", () => {
    expect(validateHandle("  Vitor_FP  ")).toEqual({
      valid: true,
      handle: "vitor_fp",
    });
  });

  it.each(["ab", "2vitor", "vítor", "vitor-fp", "vitor fp"])(
    "rejects the invalid or confusable handle %s",
    (handle) => {
      expect(validateHandle(handle)).toEqual({ valid: false, reason: "format" });
    },
  );

  it.each(["admin", "API", " webfinger "])("rejects the reserved handle %s", (handle) => {
    expect(validateHandle(handle)).toEqual({ valid: false, reason: "reserved" });
  });
});
