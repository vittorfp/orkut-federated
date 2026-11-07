import { describe, expect, it, vi } from "vitest";
import { checkReadiness } from "./health";

describe("checkReadiness", () => {
  it("reports ready when the database query succeeds", async () => {
    await expect(checkReadiness(vi.fn().mockResolvedValue(undefined))).resolves.toEqual({
      status: "ready",
    });
  });

  it("reports unavailable without exposing connection details", async () => {
    await expect(
      checkReadiness(vi.fn().mockRejectedValue(new Error("secret connection string"))),
    ).resolves.toEqual({
      status: "unavailable",
      reason: "database",
    });
  });
});
