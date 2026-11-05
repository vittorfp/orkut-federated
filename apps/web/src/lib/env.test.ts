import { describe, expect, it } from "vitest";
import { readServerEnvironment } from "./env";

describe("readServerEnvironment", () => {
  it("accepts a PostgreSQL URL and applies the default log level", () => {
    expect(
      readServerEnvironment({
        DATABASE_URL: "postgres://user:password@localhost:5432/database",
      }),
    ).toEqual({
      DATABASE_URL: "postgres://user:password@localhost:5432/database",
      LOG_LEVEL: "info",
    });
  });

  it("rejects a non-PostgreSQL database URL", () => {
    expect(() =>
      readServerEnvironment({ DATABASE_URL: "https://example.com/database" }),
    ).toThrow();
  });
});
